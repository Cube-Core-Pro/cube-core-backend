// path: backend/prisma/seeds/office-seed.ts
// purpose: Seed data for Office Suite - templates, folders, sample documents
// dependencies: Prisma client, faker for test data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedOfficeData() {
  console.log('📄 Seeding Office Suite data...');

  try {
    // Get default tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });

    if (!tenant) {
      console.log('❌ Default tenant not found, skipping Office seed');
      return;
    }

    // Get admin user for relationships
    const adminUser = await prisma.user.findFirst({
      where: { 
        tenantId: tenant.id,
        role: 'ADMIN'
      }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found, skipping Office seed');
      return;
    }

    // Create default templates
    const templates = [
      {
        name: 'Blank Document',
        type: 'DOCUMENT',
        description: 'Start with a blank document',
        category: 'Basic',
        isPublic: true,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ''
                }
              ]
            }
          ]
        }
      },
      {
        name: 'Business Letter',
        type: 'DOCUMENT',
        description: 'Professional business letter template',
        category: 'Business',
        isPublic: true,
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '[Your Company Letterhead]',
                  marks: [{ type: 'bold' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '[Date]'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '[Recipient Name]\n[Title]\n[Company]\n[Address]'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Dear [Recipient Name],'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '[Your message content goes here...]'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Sincerely,'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: '[Your Name]\n[Your Title]'
                }
              ]
            }
          ]
        }
      },
      {
        name: 'Meeting Minutes',
        type: 'DOCUMENT',
        description: 'Template for recording meeting minutes',
        category: 'Business',
        isPublic: true,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [
                {
                  type: 'text',
                  text: 'Meeting Minutes'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Date: [Meeting Date]',
                  marks: [{ type: 'bold' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Time: [Start Time] - [End Time]',
                  marks: [{ type: 'bold' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: 'Location: [Meeting Location]',
                  marks: [{ type: 'bold' }]
                }
              ]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: '' }]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [
                {
                  type: 'text',
                  text: 'Attendees'
                }
              ]
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: '[Attendee 1]'
                        }
                      ]
                    }
                  ]
                },
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: '[Attendee 2]'
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [
                {
                  type: 'text',
                  text: 'Agenda Items'
                }
              ]
            },
            {
              type: 'orderedList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: '[Agenda Item 1]'
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            {
              type: 'heading',
              attrs: { level: 2 },
              content: [
                {
                  type: 'text',
                  text: 'Action Items'
                }
              ]
            },
            {
              type: 'bulletList',
              content: [
                {
                  type: 'listItem',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: '[Action Item] - [Assigned To] - [Due Date]'
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      },
      {
        name: 'Budget Spreadsheet',
        type: 'SPREADSHEET',
        description: 'Basic budget tracking spreadsheet',
        category: 'Finance',
        isPublic: true,
        content: {
          sheets: [
            {
              name: 'Budget',
              cells: {
                'A1': { value: 'Category', type: 'text', style: { fontWeight: 'bold' } },
                'B1': { value: 'Budgeted', type: 'text', style: { fontWeight: 'bold' } },
                'C1': { value: 'Actual', type: 'text', style: { fontWeight: 'bold' } },
                'D1': { value: 'Variance', type: 'text', style: { fontWeight: 'bold' } },
                'A2': { value: 'Revenue', type: 'text' },
                'A3': { value: 'Expenses', type: 'text' },
                'A4': { value: '  - Salaries', type: 'text' },
                'A5': { value: '  - Office Rent', type: 'text' },
                'A6': { value: '  - Utilities', type: 'text' },
                'A7': { value: '  - Marketing', type: 'text' },
                'A8': { value: 'Net Income', type: 'text', style: { fontWeight: 'bold' } },
                'D2': { formula: '=C2-B2', type: 'formula' },
                'D3': { formula: '=C3-B3', type: 'formula' },
                'D4': { formula: '=C4-B4', type: 'formula' },
                'D5': { formula: '=C5-B5', type: 'formula' },
                'D6': { formula: '=C6-B6', type: 'formula' },
                'D7': { formula: '=C7-B7', type: 'formula' },
                'D8': { formula: '=C8-B8', type: 'formula' }
              },
              rows: 100,
              cols: 26
            }
          ]
        }
      },
      {
        name: 'Project Timeline',
        type: 'SPREADSHEET',
        description: 'Project management timeline template',
        category: 'Project Management',
        isPublic: true,
        content: {
          sheets: [
            {
              name: 'Timeline',
              cells: {
                'A1': { value: 'Task', type: 'text', style: { fontWeight: 'bold' } },
                'B1': { value: 'Start Date', type: 'text', style: { fontWeight: 'bold' } },
                'C1': { value: 'End Date', type: 'text', style: { fontWeight: 'bold' } },
                'D1': { value: 'Duration (Days)', type: 'text', style: { fontWeight: 'bold' } },
                'E1': { value: 'Assigned To', type: 'text', style: { fontWeight: 'bold' } },
                'F1': { value: 'Status', type: 'text', style: { fontWeight: 'bold' } },
                'A2': { value: 'Project Planning', type: 'text' },
                'A3': { value: 'Requirements Gathering', type: 'text' },
                'A4': { value: 'Design Phase', type: 'text' },
                'A5': { value: 'Development', type: 'text' },
                'A6': { value: 'Testing', type: 'text' },
                'A7': { value: 'Deployment', type: 'text' },
                'D2': { formula: '=C2-B2', type: 'formula' },
                'D3': { formula: '=C3-B3', type: 'formula' },
                'D4': { formula: '=C4-B4', type: 'formula' },
                'D5': { formula: '=C5-B5', type: 'formula' },
                'D6': { formula: '=C6-B6', type: 'formula' },
                'D7': { formula: '=C7-B7', type: 'formula' }
              },
              rows: 100,
              cols: 26
            }
          ]
        }
      },
      {
        name: 'Company Presentation',
        type: 'PRESENTATION',
        description: 'Professional company presentation template',
        category: 'Business',
        isPublic: true,
        content: {
          slides: [
            {
              id: 'slide_1',
              title: 'Title Slide',
              layout: 'title-slide',
              background: { type: 'solid', color: '#ffffff' },
              elements: [
                {
                  type: 'text',
                  content: '[Company Name]',
                  style: { fontSize: 48, fontWeight: 'bold', textAlign: 'center' },
                  position: { x: 100, y: 200, width: 600, height: 100 }
                },
                {
                  type: 'text',
                  content: '[Presentation Title]',
                  style: { fontSize: 24, textAlign: 'center' },
                  position: { x: 100, y: 320, width: 600, height: 60 }
                },
                {
                  type: 'text',
                  content: '[Presenter Name] | [Date]',
                  style: { fontSize: 16, textAlign: 'center' },
                  position: { x: 100, y: 400, width: 600, height: 40 }
                }
              ]
            },
            {
              id: 'slide_2',
              title: 'Agenda',
              layout: 'title-content',
              background: { type: 'solid', color: '#ffffff' },
              elements: [
                {
                  type: 'text',
                  content: 'Agenda',
                  style: { fontSize: 36, fontWeight: 'bold' },
                  position: { x: 50, y: 50, width: 700, height: 60 }
                },
                {
                  type: 'text',
                  content: '• Introduction\n• Company Overview\n• Products & Services\n• Market Analysis\n• Financial Performance\n• Future Plans\n• Q&A',
                  style: { fontSize: 20, lineHeight: 1.5 },
                  position: { x: 50, y: 150, width: 700, height: 300 }
                }
              ]
            },
            {
              id: 'slide_3',
              title: 'Thank You',
              layout: 'title-slide',
              background: { type: 'solid', color: '#ffffff' },
              elements: [
                {
                  type: 'text',
                  content: 'Thank You',
                  style: { fontSize: 48, fontWeight: 'bold', textAlign: 'center' },
                  position: { x: 100, y: 200, width: 600, height: 100 }
                },
                {
                  type: 'text',
                  content: 'Questions?',
                  style: { fontSize: 24, textAlign: 'center' },
                  position: { x: 100, y: 320, width: 600, height: 60 }
                }
              ]
            }
          ],
          theme: {
            name: 'Professional',
            colors: {
              primary: '#3B82F6',
              secondary: '#64748B',
              accent: '#F59E0B',
              background: '#FFFFFF',
              text: '#1F2937'
            },
            fonts: {
              heading: 'Inter',
              body: 'Inter'
            }
          }
        }
      }
    ];

    const createdTemplates = [];
    for (const template of templates) {
      const created = await prisma.officeTemplate.create({
        data: {
          tenantId: template.isPublic ? null : tenant.id,
          createdById: adminUser.id,
          name: template.name,
          type: template.type as any,
          description: template.description,
          content: template.content,
          category: template.category,
          isPublic: template.isPublic,
          usageCount: 0,
        }
      });
      createdTemplates.push(created);
    }

    console.log(`✅ Created ${createdTemplates.length} office templates`);

    // Create sample folders
    const folders = [
      { name: 'Projects', description: 'Project-related documents', color: '#3B82F6' },
      { name: 'HR Documents', description: 'Human resources documents', color: '#10B981' },
      { name: 'Financial Reports', description: 'Financial and accounting documents', color: '#F59E0B' },
      { name: 'Marketing Materials', description: 'Marketing and promotional content', color: '#EF4444' },
      { name: 'Templates', description: 'Document templates', color: '#8B5CF6' },
    ];

    const createdFolders = [];
    for (const folder of folders) {
      const created = await prisma.officeFolder.create({
        data: {
          tenantId: tenant.id,
          ownerId: adminUser.id,
          name: folder.name,
          description: folder.description,
          color: folder.color,
        }
      });
      createdFolders.push(created);
    }

    console.log(`✅ Created ${createdFolders.length} office folders`);

    // Create sample documents
    const documents = [
      {
        title: 'Company Handbook',
        type: 'DOCUMENT',
        description: 'Employee handbook and policies',
        folderId: createdFolders.find(f => f.name === 'HR Documents')?.id,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Company Handbook' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'Welcome to our company! This handbook contains important information about our policies, procedures, and culture.' }]
            }
          ]
        },
        tags: ['HR', 'Policies', 'Handbook']
      },
      {
        title: 'Q4 Financial Report',
        type: 'DOCUMENT',
        description: 'Quarterly financial performance report',
        folderId: createdFolders.find(f => f.name === 'Financial Reports')?.id,
        content: {
          type: 'doc',
          content: [
            {
              type: 'heading',
              attrs: { level: 1 },
              content: [{ type: 'text', text: 'Q4 Financial Report' }]
            },
            {
              type: 'paragraph',
              content: [{ type: 'text', text: 'This report summarizes our financial performance for the fourth quarter.' }]
            }
          ]
        },
        tags: ['Finance', 'Q4', 'Report']
      },
      {
        title: 'Sales Dashboard',
        type: 'SPREADSHEET',
        description: 'Real-time sales tracking dashboard',
        folderId: createdFolders.find(f => f.name === 'Projects')?.id,
        content: {
          sheets: [
            {
              name: 'Sales Data',
              cells: {
                'A1': { value: 'Month', type: 'text', style: { fontWeight: 'bold' } },
                'B1': { value: 'Sales', type: 'text', style: { fontWeight: 'bold' } },
                'C1': { value: 'Target', type: 'text', style: { fontWeight: 'bold' } },
                'A2': { value: 'January', type: 'text' },
                'B2': { value: 50000, type: 'number' },
                'C2': { value: 45000, type: 'number' },
                'A3': { value: 'February', type: 'text' },
                'B3': { value: 55000, type: 'number' },
                'C3': { value: 50000, type: 'number' }
              },
              rows: 100,
              cols: 26
            }
          ]
        },
        tags: ['Sales', 'Dashboard', 'Analytics']
      },
      {
        title: 'Product Launch Presentation',
        type: 'PRESENTATION',
        description: 'New product launch presentation for stakeholders',
        folderId: createdFolders.find(f => f.name === 'Marketing Materials')?.id,
        content: {
          slides: [
            {
              id: 'slide_1',
              title: 'Product Launch',
              layout: 'title-slide',
              elements: [
                {
                  type: 'text',
                  content: 'New Product Launch',
                  style: { fontSize: 48, fontWeight: 'bold', textAlign: 'center' },
                  position: { x: 100, y: 200, width: 600, height: 100 }
                }
              ]
            }
          ]
        },
        tags: ['Marketing', 'Product', 'Launch']
      }
    ];

    const createdDocuments = [];
    for (const doc of documents) {
      const documentNumber = `DOC${String(createdDocuments.length + 1).padStart(6, '0')}`;
      const created = await prisma.officeDocument.create({
        data: {
          tenantId: tenant.id,
          ownerId: adminUser.id,
          documentNumber,
          title: doc.title,
          type: doc.type as any,
          description: doc.description,
          content: doc.content,
          folderId: doc.folderId,
          tags: doc.tags,
          size: JSON.stringify(doc.content).length,
        }
      });

      // Create initial version
      await prisma.officeVersion.create({
        data: {
          documentId: created.id,
          version: 1,
          content: doc.content,
          createdById: adminUser.id,
          changeLog: 'Initial version',
        }
      });

      createdDocuments.push(created);
    }

    console.log(`✅ Created ${createdDocuments.length} office documents`);

    // Create some sample shares and comments
    const users = await prisma.user.findMany({
      where: { tenantId: tenant.id },
      take: 3
    });

    if (users.length > 1) {
      // Share first document with other users
      const firstDoc = createdDocuments[0];
      for (let i = 1; i < users.length; i++) {
        await prisma.officeShare.create({
          data: {
            documentId: firstDoc.id,
            userId: users[i].id,
            permission: i === 1 ? 'EDIT' : 'VIEW',
            sharedById: adminUser.id,
          }
        });
      }

      // Add some comments
      await prisma.officeComment.create({
        data: {
          documentId: firstDoc.id,
          authorId: users[1].id,
          text: 'Great work on this handbook! I have a few suggestions for the benefits section.',
          position: { section: 'benefits', line: 1 },
        }
      });

      console.log('✅ Created sample shares and comments');
    }

    console.log('🎉 Office Suite seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding Office data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedOfficeData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}