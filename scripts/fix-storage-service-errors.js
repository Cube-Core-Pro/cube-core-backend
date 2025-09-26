const fs = require('fs');
const path = require('path');

const filePath = '/Users/zoeparentini/Library/CloudStorage/Dropbox/cube-core/backend/src/files/storage.service.ts';
let content = fs.readFileSync(filePath, 'utf8');

// Fix all error handling to properly type the error parameter
const fixes = [
  {
    old: `    } catch (error) {
      this.logger.error(\`Failed to store file: \${filename}\`, error.stack, 'StorageService');`,
    new: `    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(\`Failed to store file: \${filename}\`, errorStack, 'StorageService');`
  },
  {
    old: `    } catch (error) {
      if (error.code !== 'ENOENT') {
        this.logger.error(\`Failed to delete file: \${filePath}\`, error.stack, 'StorageService');`,
    new: `    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code !== 'ENOENT') {
        this.logger.error(\`Failed to delete file: \${filePath}\`, error.stack, 'StorageService');`
  },
  {
    old: `    } catch (error) {
      this.logger.error(\`Failed to copy file: \${sourcePath}\`, error.stack, 'StorageService');`,
    new: `    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(\`Failed to copy file: \${sourcePath}\`, errorStack, 'StorageService');`
  },
  {
    old: `    } catch (error) {
      this.logger.error(\`Failed to move file: \${sourcePath}\`, error.stack, 'StorageService');`,
    new: `    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(\`Failed to move file: \${sourcePath}\`, errorStack, 'StorageService');`
  },
  {
    old: `    } catch (error) {
      this.logger.error(\`Failed to get file info: \${filePath}\`, error.stack, 'StorageService');`,
    new: `    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(\`Failed to get file info: \${filePath}\`, errorStack, 'StorageService');`
  },
  {
    old: `    } catch (error) {
      this.logger.error(\`Failed to list files: \${directoryPath}\`, error.stack, 'StorageService');`,
    new: `    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(\`Failed to list files: \${directoryPath}\`, errorStack, 'StorageService');`
  },
  {
    old: `    } catch (error) {
      this.logger.error('Failed to get storage stats', error.stack, 'StorageService');`,
    new: `    } catch (error) {
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error('Failed to get storage stats', errorStack, 'StorageService');`
  },
  {
    old: `        errors.push(\`\${file}: \${error.message}\`);`,
    new: `        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(\`\${file}: \${errorMessage}\`);`
  }
];

let modified = false;
fixes.forEach(fix => {
  if (content.includes(fix.old)) {
    content = content.replace(fix.old, fix.new);
    modified = true;
    console.log('Applied fix for error handling');
  }
});

if (modified) {
  fs.writeFileSync(filePath, content);
  console.log('Storage service error handling fixed');
} else {
  console.log('No fixes needed or patterns not found');
}