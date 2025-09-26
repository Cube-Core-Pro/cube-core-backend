#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 CORRECCIÓN MASIVA DE CONTROLADORES');
console.log('=' .repeat(50));

const srcDir = path.join(__dirname, '..', 'src');

function fixController(filePath) {
  if (!fs.existsSync(filePath)) return false;
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const relativePath = path.relative(srcDir, filePath);
  
  // Detectar si el controlador está roto
  if (content.includes('import {') && content.includes('} from \'@nestjs/common\';') && 
      (content.includes('import {\nimport {') || content.split('\n').some(line => line.length > 300))) {
    
    const fileName = path.basename(filePath, '.ts');
    const moduleName = fileName.replace('.controller', '');
    const serviceName = moduleName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') + 'Service';
    const controllerName = moduleName.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('') + 'Controller';
    
    content = `import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query
} from '@nestjs/common';
import {
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';
import { ${serviceName} } from './${moduleName}.service';

@ApiTags('${moduleName}')
@Controller('${moduleName}')
export class ${controllerName} {
  constructor(private readonly ${moduleName.replace(/-/g, '')}Service: ${serviceName}) {}

  @Get()
  @ApiOperation({ summary: 'Get all ${moduleName} items' })
  @ApiResponse({ status: 200, description: 'Return all ${moduleName} items.' })
  async findAll(@Query() query: any) {
    return this.${moduleName.replace(/-/g, '')}Service.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ${moduleName} by id' })
  @ApiResponse({ status: 200, description: 'Return ${moduleName} item.' })
  async findOne(@Param('id') id: string) {
    return this.${moduleName.replace(/-/g, '')}Service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create ${moduleName}' })
  @ApiResponse({ status: 201, description: 'The ${moduleName} has been successfully created.' })
  async create(@Body() createDto: any) {
    return this.${moduleName.replace(/-/g, '')}Service.create(createDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update ${moduleName}' })
  @ApiResponse({ status: 200, description: 'The ${moduleName} has been successfully updated.' })
  async update(@Param('id') id: string, @Body() updateDto: any) {
    return this.${moduleName.replace(/-/g, '')}Service.update(id, updateDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete ${moduleName}' })
  @ApiResponse({ status: 200, description: 'The ${moduleName} has been successfully deleted.' })
  async remove(@Param('id') id: string) {
    return this.${moduleName.replace(/-/g, '')}Service.remove(id);
  }
}`;
  }
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Corregido: ${relativePath}`);
    return true;
  }
  
  return false;
}

function walkDirectory(dir) {
  const files = fs.readdirSync(dir);
  let totalFixed = 0;
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      totalFixed += walkDirectory(filePath);
    } else if (file.endsWith('.controller.ts')) {
      if (fixController(filePath)) {
        totalFixed++;
      }
    }
  }
  
  return totalFixed;
}

try {
  const totalFixed = walkDirectory(srcDir);
  console.log(`\n📊 Total de controladores corregidos: ${totalFixed}`);
  console.log('🎯 Corrección masiva completada');
  
} catch (error) {
  console.error('❌ Error durante la corrección:', error.message);
}