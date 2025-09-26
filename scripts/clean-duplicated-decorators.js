#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning duplicated decorators...');

const srcDir = path.join(__dirname, '..', 'src');

function cleanDuplicatedDecorators(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Remove duplicated @PrimaryGeneratedColumn
    const originalContent = content;
    content = content.replace(/@PrimaryGeneratedColumn\('uuid'\)\s*@PrimaryGeneratedColumn\('uuid'\)/g, "@PrimaryGeneratedColumn('uuid')");
    
    // Remove duplicated @CreateDateColumn
    content = content.replace(/@CreateDateColumn\(\)\s*@CreateDateColumn\(\)/g, "@CreateDateColumn()");
    
    // Remove duplicated @UpdateDateColumn
    content = content.replace(/@UpdateDateColumn\(\)\s*@UpdateDateColumn\(\)/g, "@UpdateDateColumn()");
    
    // Remove duplicated @Column decorators
    content = content.replace(/@Column\([^)]+\)\s*@Column\([^)]+\)/g, (match) => {
      const parts = match.split('@Column');
      return '@Column' + parts[1]; // Keep the first one
    });

    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Cleaned duplications in ${path.relative(srcDir, filePath)}`);
      modified = true;
    }

    return modified;
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDirectory(filePath);
    } else if (file.endsWith('.entity.ts')) {
      cleanDuplicatedDecorators(filePath);
    }
  }
}

walkDirectory(srcDir);
console.log('🎯 Decorator cleanup completed!');