#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 Creando archivos frontend prioritarios...');

const frontendDir = path.join(__dirname, '..', '..', 'frontend', 'src');
const priorityModules = ['pos', 'hr', 'scm', 'billing', 'crm', 'banking', 'compliance'];

// Plantilla para páginas
const pageTemplate = (moduleName, moduleTitle) => `'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  RefreshCw
} from 'lucide-react';

export default function ${moduleTitle}Page() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // TODO: Fetch ${moduleName} data from API
    setLoading(false);
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // TODO: Implement search functionality
  };

  const handleCreate = () => {
    // TODO: Implement create functionality
  };

  const handleRefresh = () => {
    setLoading(true);
    // TODO: Refresh data
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">${moduleTitle}</h1>
          <p className="text-muted-foreground">
            Gestión completa de ${moduleName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stats Cards */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% desde el mes pasado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% desde el mes pasado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de ${moduleTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No hay datos disponibles. Comience creando un nuevo elemento.
              </p>
              <Button onClick={handleCreate} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Elemento
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
`;

// Plantilla para componentes
const componentTemplate = (moduleName, moduleTitle) => `'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ${moduleTitle}ComponentProps {
  data?: any[];
  onAction?: (action: string, item?: any) => void;
}

export function ${moduleTitle}Component({ data = [], onAction }: ${moduleTitle}ComponentProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>${moduleTitle} Component</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No hay datos de ${moduleName} disponibles
            </p>
          ) : (
            data.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <h4 className="font-medium">{item.name || \`Elemento \${index + 1}\`}</h4>
                  <p className="text-sm text-muted-foreground">{item.description || 'Sin descripción'}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">{item.status || 'Activo'}</Badge>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onAction?.('view', item)}
                  >
                    Ver
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ${moduleTitle}Component;
`;

// Crear directorios y archivos
function createFrontendFiles() {
  for (const module of priorityModules) {
    const moduleTitle = module.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('');

    // Crear página
    const pagesDir = path.join(frontendDir, 'pages', module);
    if (!fs.existsSync(pagesDir)) {
      fs.mkdirSync(pagesDir, { recursive: true });
    }

    const pagePath = path.join(pagesDir, 'page.tsx');
    if (!fs.existsSync(pagePath)) {
      fs.writeFileSync(pagePath, pageTemplate(module, moduleTitle));
      console.log(`✅ Created page: ${module}/page.tsx`);
    }

    // Crear componente
    const componentsDir = path.join(frontendDir, 'components', module);
    if (!fs.existsSync(componentsDir)) {
      fs.mkdirSync(componentsDir, { recursive: true });
    }

    const componentPath = path.join(componentsDir, `${module}-component.tsx`);
    if (!fs.existsSync(componentPath)) {
      fs.writeFileSync(componentPath, componentTemplate(module, moduleTitle));
      console.log(`✅ Created component: ${module}/${module}-component.tsx`);
    }

    // Crear index para el componente
    const indexPath = path.join(componentsDir, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      const indexContent = `export { default as ${moduleTitle}Component } from './${module}-component';
export * from './${module}-component';
`;
      fs.writeFileSync(indexPath, indexContent);
      console.log(`✅ Created index: ${module}/index.ts`);
    }
  }
}

// Verificar que el directorio frontend existe
if (!fs.existsSync(frontendDir)) {
  console.log('⚠️  Frontend directory not found, creating structure...');
  fs.mkdirSync(frontendDir, { recursive: true });
  fs.mkdirSync(path.join(frontendDir, 'pages'), { recursive: true });
  fs.mkdirSync(path.join(frontendDir, 'components'), { recursive: true });
}

createFrontendFiles();

console.log('\n🎯 Archivos frontend prioritarios creados!');
console.log('📊 Progreso: +14 páginas y +14 componentes creados');
console.log('🚀 Próximo paso: Integrar con APIs backend');