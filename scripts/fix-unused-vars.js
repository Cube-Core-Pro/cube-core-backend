const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const LINT_JSON_PATH = process.argv[2];
if (!LINT_JSON_PATH) {
  console.error('Usage: node scripts/fix-unused-vars.js <lint-json-path>');
  process.exit(1);
}

const lintData = JSON.parse(fs.readFileSync(LINT_JSON_PATH, 'utf8'));

const issuesByFile = new Map();

for (const fileReport of lintData) {
  if (!fileReport || !fileReport.messages) {
    continue;
  }
  const relevant = fileReport.messages.filter(
    (msg) => msg.ruleId === '@typescript-eslint/no-unused-vars'
  );

  if (!relevant.length) {
    continue;
  }

  const filePath = path.resolve(fileReport.filePath);
  if (!issuesByFile.has(filePath)) {
    issuesByFile.set(filePath, []);
  }

  for (const msg of relevant) {
    const match = msg.message.match(/'([^']+)'/);
    if (!match) {
      continue;
    }

    const name = match[1];
    issuesByFile.get(filePath).push({
      name,
      line: msg.line,
      column: msg.column,
    });
  }
}

function findIdentifier(sourceFile, position, name) {
  let found = null;

  function visit(node) {
    if (found) {
      return;
    }

    const start = node.getFullStart();
    const end = node.getEnd();

    if (position < start || position > end) {
      return;
    }

    if (
      ts.isIdentifier(node) &&
      position >= node.getStart() &&
      position <= node.getEnd() &&
      node.text === name
    ) {
      found = node;
      return;
    }

    node.forEachChild(visit);
  }

  visit(sourceFile);
  return found;
}

function computeImportRemovalRange(text, spec) {
  const namedImports = spec.parent;
  if (!ts.isNamedImports(namedImports)) {
    return { start: spec.getStart(), end: spec.getEnd() };
  }

  const importClause = namedImports.parent;
  const importDecl = importClause.parent;

  if (namedImports.elements.length === 1) {
    let start = importDecl.getFullStart();
    let end = importDecl.getEnd();

    // Include following newline characters
    while (end < text.length && /\s/.test(text[end])) {
      if (text[end] === '\n') {
        end += 1;
        break;
      }
      end += 1;
    }

    return { start, end };
  }

  // Multiple specifiers: remove this one and its comma/spacing
  let start = spec.getStart();
  let end = spec.getEnd();

  // Remove trailing spaces and comma if present
  let cursor = end;
  while (cursor < text.length && /\s/.test(text[cursor])) {
    cursor += 1;
  }
  if (text[cursor] === ',') {
    end = cursor + 1;
    return { start, end };
  }

  // Otherwise, check for preceding comma
  cursor = start;
  while (cursor > 0 && /\s/.test(text[cursor - 1])) {
    cursor -= 1;
  }
  if (text[cursor - 1] === ',') {
    start = cursor - 1;
  }

  return { start, end };
}

function handleBindingElement(text, binding, issueName) {
  if (ts.isObjectBindingPattern(binding.parent)) {
    const propertyName = binding.propertyName
      ? binding.propertyName.getText()
      : issueName;

    const afterName = text.slice(binding.name.getEnd(), binding.getEnd());
    const replacement = `${propertyName}: _${issueName}${afterName}`;

    return {
      start: binding.getStart(),
      end: binding.getEnd(),
      text: replacement,
    };
  }

  // Array binding pattern or other scenarios: direct rename is safe
  return {
    start: binding.name.getStart(),
    end: binding.name.getEnd(),
    text: `_${issueName}`,
  };
}

const summary = {
  filesProcessed: 0,
  identifiersRenamed: 0,
  importSpecifiersRemoved: 0,
  bindingElementsUpdated: 0,
  skipped: 0,
};

for (const [filePath, issues] of issuesByFile.entries()) {
  const original = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    original,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  );

  const replacements = [];
  const visitedPositions = new Set();

  for (const issue of issues) {
    const key = `${issue.line}:${issue.column}`;
    if (visitedPositions.has(key)) {
      continue;
    }
    visitedPositions.add(key);

    const position = sourceFile.getPositionOfLineAndCharacter(
      issue.line - 1,
      issue.column - 1
    );

    const identifier = findIdentifier(sourceFile, position, issue.name);
    if (!identifier) {
      summary.skipped += 1;
      continue;
    }

    // Handle import specifiers (named imports)
    if (ts.isImportSpecifier(identifier.parent)) {
      const range = computeImportRemovalRange(original, identifier.parent);
      replacements.push({ ...range, text: '' });
      summary.importSpecifiersRemoved += 1;
      continue;
    }

    // Handle default import clause: import Foo from 'bar';
    if (ts.isImportClause(identifier.parent) && !identifier.parent.isTypeOnly) {
      const importDecl = identifier.parent.parent;
      let start = importDecl.getFullStart();
      let end = importDecl.getEnd();
      while (end < original.length && /\s/.test(original[end])) {
        if (original[end] === '\n') {
          end += 1;
          break;
        }
        end += 1;
      }
      replacements.push({ start, end, text: '' });
      summary.importSpecifiersRemoved += 1;
      continue;
    }

    // Handle namespace import: import * as Foo from 'bar';
    if (ts.isNamespaceImport(identifier.parent)) {
      const importDecl = identifier.parent.parent.parent;
      let start = importDecl.getFullStart();
      let end = importDecl.getEnd();
      while (end < original.length && /\s/.test(original[end])) {
        if (original[end] === '\n') {
          end += 1;
          break;
        }
        end += 1;
      }
      replacements.push({ start, end, text: '' });
      summary.importSpecifiersRemoved += 1;
      continue;
    }

    // Handle binding elements (object destructuring)
    if (ts.isBindingElement(identifier.parent)) {
      const range = handleBindingElement(original, identifier.parent, issue.name);
      replacements.push(range);
      summary.bindingElementsUpdated += 1;
      continue;
    }

    const start = identifier.getStart();
    const end = identifier.getEnd();

    replacements.push({
      start,
      end,
      text: `_${issue.name}`,
    });
    summary.identifiersRenamed += 1;
  }

  if (!replacements.length) {
    continue;
  }

  replacements.sort((a, b) => b.start - a.start);
  let updated = original;
  for (const repl of replacements) {
    updated = `${updated.slice(0, repl.start)}${repl.text}${updated.slice(repl.end)}`;
  }

  if (updated !== original) {
    fs.writeFileSync(filePath, updated, 'utf8');
    summary.filesProcessed += 1;
  }
}

console.log(
  `Processed ${summary.filesProcessed} files. Renamed ${summary.identifiersRenamed} identifiers, removed ${summary.importSpecifiersRemoved} imports, updated ${summary.bindingElementsUpdated} binding elements, skipped ${summary.skipped}.`
);
