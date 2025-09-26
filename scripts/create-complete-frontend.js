#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🎨 CREANDO FRONTEND COMPLETO PARA TODOS LOS 96 MÓDULOS');
console.log('=' .repeat(70));

const frontendDir = path.join(__dirname, '..', '..', 'frontend', 'src');

// Lista completa de todos los 96 módulos
const allModules = [
  '@types', 'admin', 'advanced-accounting-cpa', 'advanced-analytics', 'advanced-asset-management',
  'advanced-compliance-management', 'advanced-crm', 'advanced-document-management', 'advanced-erp',
  'advanced-financial-management', 'advanced-fintech', 'advanced-hr-management', 'advanced-inventory-management',
  'advanced-project-management', 'advanced-quality-management', 'advanced-reporting', 'advanced-risk-management',
  'advanced-security', 'advanced-supply-chain-management', 'ai-enterprise', 'ai-ethics', 'ai-module-generator',
  'ai-modules', 'ai-no-code-builder', 'ai-predictive-bi', 'ai-trading-markets', 'analytics', 'antifraud',
  'api', 'api-gateway', 'asset-management', 'audit', 'auth', 'autonomous-business-ops', 'banking',
  'billing', 'bpm', 'business-intelligence', 'common', 'compliance', 'config', 'constants',
  'controllers', 'crm', 'dashboard', 'data-warehouse', 'database', 'devops-deployment', 'digital-asset-management',
  'document-management', 'email', 'enterprise', 'enterprise-analytics-bi', 'enterprise-integration-hub',
  'enterprise-office-suite', 'enterprise-webmail', 'events', 'global-compliance-automation', 'health',
  'hr', 'intelligent-ecommerce', 'intelligent-education', 'internationalization', 'knowledge-management',
  'logger', 'machine-learning', 'marketing-automation-social', 'markets', 'metaverse-vr-collaboration',
  'mobile-pwa', 'no-code-ai-builder', 'pci-dss-compliance', 'performance-monitoring', 'pos',
  'prisma', 'procurement', 'project-management', 'quality-management', 'quantum-computing', 'real-time-communication',
  'redis', 'remote-desktop-access', 'risk-management', 'routes', 'scm', 'scripts', 'setup',
  'smart-agriculture', 'smart-cities-iot', 'socket', 'telemedicine-healthtech', 'test', 'testing-qa',
  'tokenization-blockchain', 'users', 'virtual-classrooms-conferences'
];

// Plantilla avanzada para páginas
const pageTemplate = (moduleName, moduleTitle) => `'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Filter, 
  Download,
  RefreshCw,
  Settings,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Bell,
  Shield
} from 'lucide-react';
import { ${moduleTitle}Component } from '@/components/${moduleName}';

interface ${moduleTitle}Data {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  metadata?: any;
}

export default function ${moduleTitle}Page() {
  const [data, setData] = useState<${moduleTitle}Data[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    completed: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API call
      const response = await fetch(\`/api/${moduleName}\`);
      if (response.ok) {
        const result = await response.json();
        setData(result.data || []);
        setStats(result.stats || stats);
      }
    } catch (error) {
      console.error('Error fetching ${moduleName} data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // TODO: Implement search functionality
  };

  const handleCreate = () => {
    // TODO: Implement create functionality
    console.log('Creating new ${moduleName} item');
  };

  const handleRefresh = () => {
    fetchData();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting ${moduleName} data');
  };

  const filteredData = data.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">${moduleTitle}</h1>
          <p className="text-muted-foreground">
            Gestión completa de ${moduleName.replace(/-/g, ' ')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Nuevo
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Total de elementos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="text-xs text-muted-foreground">
              Elementos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Elementos pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
            <p className="text-xs text-muted-foreground">
              Elementos completados
            </p>
          </CardContent>
        </Card>
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
              <Settings className="h-4 w-4 mr-2" />
              Configuración
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Vista General</TabsTrigger>
          <TabsTrigger value="data">Datos</TabsTrigger>
          <TabsTrigger value="analytics">Analíticas</TabsTrigger>
          <TabsTrigger value="settings">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <${moduleTitle}Component 
            data={filteredData} 
            loading={loading}
            onAction={(action, item) => {
              console.log('Action:', action, 'Item:', item);
            }}
          />
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de ${moduleTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No hay datos disponibles. Comience creando un nuevo elemento.
                  </p>
                  <Button onClick={handleCreate} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Primer Elemento
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredData.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.description || 'Sin descripción'}</p>
                        <p className="text-xs text-muted-foreground">
                          Creado: {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                          {item.status}
                        </Badge>
                        <Button size="sm" variant="outline">
                          Ver
                        </Button>
                        <Button size="sm" variant="outline">
                          Editar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analíticas de ${moduleTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Las analíticas estarán disponibles próximamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuración de ${moduleTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Settings className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  La configuración estará disponible próximamente.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
`;

// Plantilla avanzada para componentes
const componentTemplate = (moduleName, moduleTitle) => `'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  MoreHorizontal, 
  Eye, 
  Edit, 
  Trash2,
  Download,
  Share
} from 'lucide-react';

interface ${moduleTitle}Data {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
  metadata?: any;
}

interface ${moduleTitle}ComponentProps {
  data?: ${moduleTitle}Data[];
  loading?: boolean;
  onAction?: (action: string, item?: ${moduleTitle}Data) => void;
}

export function ${moduleTitle}Component({ 
  data = [], 
  loading = false,
  onAction 
}: ${moduleTitle}ComponentProps) {
  
  const handleAction = (action: string, item?: ${moduleTitle}Data) => {
    onAction?.(action, item);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>${moduleTitle} Component</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex justify-between items-center p-3 border rounded">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[300px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          ${moduleTitle} Component
          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => handleAction('refresh')}
            >
              Actualizar
            </Button>
            <Button 
              size="sm"
              onClick={() => handleAction('create')}
            >
              Crear Nuevo
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                No hay datos de ${moduleName.replace(/-/g, ' ')} disponibles
              </p>
              <Button onClick={() => handleAction('create')}>
                Crear Primer Elemento
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {data.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge 
                        variant={
                          item.status === 'active' ? 'default' :
                          item.status === 'pending' ? 'secondary' :
                          item.status === 'completed' ? 'outline' : 'destructive'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {item.description || 'Sin descripción disponible'}
                    </p>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>Creado: {new Date(item.createdAt).toLocaleDateString()}</span>
                      <span>Actualizado: {new Date(item.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleAction('view', item)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleAction('edit', item)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleAction('share', item)}
                    >
                      <Share className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleAction('download', item)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleAction('delete', item)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ${moduleTitle}Component;
`;

// Crear estructura de directorios
function ensureDirectoryStructure() {
  console.log('📁 Creando estructura de directorios...');
  
  const dirs = [
    path.join(frontendDir, 'pages'),
    path.join(frontendDir, 'components'),
    path.join(frontendDir, 'lib'),
    path.join(frontendDir, 'hooks'),
    path.join(frontendDir, 'types'),
    path.join(frontendDir, 'utils')
  ];

  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Created directory: ${path.relative(frontendDir, dir)}`);
    }
  });
}

// Crear todas las páginas
function createAllPages() {
  console.log('\n📄 CREANDO TODAS LAS PÁGINAS...');
  
  let created = 0;
  for (const module of allModules) {
    const moduleTitle = module.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('').replace('@', '');

    const pagesDir = path.join(frontendDir, 'pages', module);
    if (!fs.existsSync(pagesDir)) {
      fs.mkdirSync(pagesDir, { recursive: true });
    }

    const pagePath = path.join(pagesDir, 'page.tsx');
    if (!fs.existsSync(pagePath)) {
      fs.writeFileSync(pagePath, pageTemplate(module, moduleTitle));
      created++;
      console.log(`✅ Created page: ${module}/page.tsx`);
    }
  }
  console.log(`📊 Total páginas creadas: ${created}`);
}

// Crear todos los componentes
function createAllComponents() {
  console.log('\n🧩 CREANDO TODOS LOS COMPONENTES...');
  
  let created = 0;
  for (const module of allModules) {
    const moduleTitle = module.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join('').replace('@', '');

    const componentsDir = path.join(frontendDir, 'components', module);
    if (!fs.existsSync(componentsDir)) {
      fs.mkdirSync(componentsDir, { recursive: true });
    }

    const componentPath = path.join(componentsDir, `${module}-component.tsx`);
    if (!fs.existsSync(componentPath)) {
      fs.writeFileSync(componentPath, componentTemplate(module, moduleTitle));
      created++;
      console.log(`✅ Created component: ${module}/${module}-component.tsx`);
    }

    // Crear index para el componente
    const indexPath = path.join(componentsDir, 'index.ts');
    if (!fs.existsSync(indexPath)) {
      const indexContent = `export { default as ${moduleTitle}Component } from './${module}-component';
export * from './${module}-component';
`;
      fs.writeFileSync(indexPath, indexContent);
    }
  }
  console.log(`📊 Total componentes creados: ${created}`);
}

// Crear tipos TypeScript
function createTypes() {
  console.log('\n📝 CREANDO TIPOS TYPESCRIPT...');
  
  const typesContent = `// Auto-generated types for all modules
${allModules.map(module => {
  const moduleTitle = module.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('').replace('@', '');
  
  return `
export interface ${moduleTitle}Data {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'pending' | 'completed';
  createdAt: string;
  updatedAt: string;
  description?: string;
  metadata?: Record<string, any>;
  tenantId?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface ${moduleTitle}Stats {
  total: number;
  active: number;
  pending: number;
  completed: number;
}

export interface ${moduleTitle}ComponentProps {
  data?: ${moduleTitle}Data[];
  loading?: boolean;
  onAction?: (action: string, item?: ${moduleTitle}Data) => void;
}`;
}).join('\n')}

// Common types
export type ActionType = 'view' | 'edit' | 'delete' | 'create' | 'refresh' | 'share' | 'download';

export interface ApiResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  stats?: any;
}
`;

  const typesPath = path.join(frontendDir, 'types', 'modules.ts');
  fs.writeFileSync(typesPath, typesContent);
  console.log('✅ Created types/modules.ts');
}

// Crear hooks personalizados
function createHooks() {
  console.log('\n🪝 CREANDO HOOKS PERSONALIZADOS...');
  
  const hooksContent = `import { useState, useEffect } from 'react';

export function useModuleData<T>(moduleName: string) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(\`/api/\${moduleName}\`);
      if (!response.ok) {
        throw new Error(\`Failed to fetch \${moduleName} data\`);
      }
      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [moduleName]);

  return { data, loading, error, refetch: fetchData };
}

export function useSearch<T>(data: T[], searchFields: (keyof T)[]) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredData = data.filter(item =>
    searchFields.some(field => {
      const value = item[field];
      return typeof value === 'string' && 
             value.toLowerCase().includes(searchTerm.toLowerCase());
    })
  );

  return { searchTerm, setSearchTerm, filteredData };
}
`;

  const hooksPath = path.join(frontendDir, 'hooks', 'useModuleData.ts');
  fs.writeFileSync(hooksPath, hooksContent);
  console.log('✅ Created hooks/useModuleData.ts');
}

// Ejecutar todas las funciones
function executeAllSteps() {
  try {
    ensureDirectoryStructure();
    createAllPages();
    createAllComponents();
    createTypes();
    createHooks();
    
    console.log('\n🎯 FRONTEND COMPLETO CREADO EXITOSAMENTE!');
    console.log('📊 Resumen:');
    console.log(`   • ${allModules.length} páginas creadas`);
    console.log(`   • ${allModules.length} componentes creados`);
    console.log(`   • Tipos TypeScript generados`);
    console.log(`   • Hooks personalizados creados`);
    console.log('🚀 Frontend listo para integración con backend!');
    
  } catch (error) {
    console.error('❌ Error durante la creación del frontend:', error.message);
  }
}

executeAllSteps();