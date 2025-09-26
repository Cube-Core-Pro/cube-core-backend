// path: backend/prisma/seeds/hr-seed.ts
// purpose: Seed data for HR module - employees, leave requests, and performance reviews
// dependencies: Prisma client, faker for test data

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedHRData() {
  console.log('🏢 Seeding HR module data...');

  try {
    // Get default tenant
    const tenant = await prisma.tenant.findFirst({
      where: { name: 'Default Tenant' }
    });

    if (!tenant) {
      console.log('❌ Default tenant not found, skipping HR seed');
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
      console.log('❌ Admin user not found, skipping HR seed');
      return;
    }

    // Create departments and sample employees
    const departments = [
      'Engineering',
      'Sales',
      'Marketing',
      'Human Resources',
      'Finance',
      'Operations',
      'Customer Success'
    ];

    const positions = {
      'Engineering': ['Software Engineer', 'Senior Software Engineer', 'Engineering Manager', 'DevOps Engineer', 'QA Engineer'],
      'Sales': ['Sales Representative', 'Senior Sales Rep', 'Sales Manager', 'Account Executive', 'Sales Director'],
      'Marketing': ['Marketing Specialist', 'Content Creator', 'Marketing Manager', 'Digital Marketing Lead', 'Brand Manager'],
      'Human Resources': ['HR Specialist', 'HR Manager', 'Recruiter', 'HR Director', 'People Operations'],
      'Finance': ['Financial Analyst', 'Accountant', 'Finance Manager', 'Controller', 'CFO'],
      'Operations': ['Operations Specialist', 'Operations Manager', 'Project Manager', 'Operations Director'],
      'Customer Success': ['Customer Success Rep', 'Customer Success Manager', 'Support Specialist', 'CS Director']
    };

    const employees = [];

    // Create sample employees
    for (let i = 0; i < 25; i++) {
      const department = departments[Math.floor(Math.random() * departments.length)];
      const positionList = positions[department];
      const position = positionList[Math.floor(Math.random() * positionList.length)];
      
      const firstName = [
        'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa',
        'James', 'Maria', 'William', 'Jennifer', 'Richard', 'Patricia', 'Charles',
        'Linda', 'Joseph', 'Elizabeth', 'Thomas', 'Barbara', 'Christopher', 'Susan',
        'Daniel', 'Jessica', 'Matthew'
      ][i];

      const lastName = [
        'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
        'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez',
        'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
        'Lee', 'Perez', 'Thompson', 'White', 'Harris'
      ][i];

      const hireDate = new Date();
      hireDate.setFullYear(hireDate.getFullYear() - Math.floor(Math.random() * 5));
      hireDate.setMonth(Math.floor(Math.random() * 12));

      const salary = Math.floor(Math.random() * 100000) + 50000; // $50k - $150k

      const employee = await prisma.employee.create({
        data: {
          tenantId: tenant.id,
          employeeNumber: `EMP${String(i + 1).padStart(4, '0')}`,
          firstName,
          lastName,
          email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`,
          phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          department,
          position,
          hireDate,
          status: Math.random() > 0.1 ? 'ACTIVE' : (Math.random() > 0.5 ? 'INACTIVE' : 'TERMINATED'),
          salary,
          currency: 'USD',
          address: `${Math.floor(Math.random() * 9999) + 1} Main St, City, State 12345`,
          emergencyContactName: `Emergency Contact ${i + 1}`,
          emergencyContactPhone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
          notes: Math.random() > 0.7 ? `Sample notes for employee ${firstName} ${lastName}` : null,
        }
      });

      employees.push(employee);
    }

    console.log(`✅ Created ${employees.length} employees`);

    // Create sample leave requests
    const leaveTypes = ['VACATION', 'SICK', 'PERSONAL', 'MATERNITY', 'PATERNITY', 'EMERGENCY'];
    const leaveStatuses = ['PENDING', 'APPROVED', 'REJECTED'];

    for (let i = 0; i < 15; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const type = leaveTypes[Math.floor(Math.random() * leaveTypes.length)];
      const status = leaveStatuses[Math.floor(Math.random() * leaveStatuses.length)];
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 90)); // Next 90 days
      
      const endDate = new Date(startDate);
      const days = Math.floor(Math.random() * 10) + 1; // 1-10 days
      endDate.setDate(endDate.getDate() + days - 1);

      await prisma.leaveRequest.create({
        data: {
          tenantId: tenant.id,
          employeeId: employee.id,
          type: type as any,
          startDate,
          endDate,
          days,
          reason: `Sample ${type.toLowerCase()} leave request`,
          status: status as any,
          approvedById: status !== 'PENDING' ? adminUser.id : null,
          approvedAt: status !== 'PENDING' ? new Date() : null,
          rejectionReason: status === 'REJECTED' ? 'Sample rejection reason' : null,
        }
      });
    }

    console.log('✅ Created 15 leave requests');

    // Create sample performance reviews
    const reviewTypes = ['ANNUAL', 'QUARTERLY', 'PROBATIONARY', 'MID_YEAR', 'PROJECT'];
    const reviewStatuses = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'APPROVED'];

    for (let i = 0; i < 12; i++) {
      const employee = employees[Math.floor(Math.random() * employees.length)];
      const type = reviewTypes[Math.floor(Math.random() * reviewTypes.length)];
      const status = reviewStatuses[Math.floor(Math.random() * reviewStatuses.length)];
      
      const currentYear = new Date().getFullYear();
      const period = type === 'ANNUAL' ? `${currentYear}` : 
                   type === 'QUARTERLY' ? `Q${Math.floor(Math.random() * 4) + 1} ${currentYear}` :
                   type === 'MID_YEAR' ? `Mid-Year ${currentYear}` :
                   `${type} Review ${currentYear}`;

      const nextReviewDate = new Date();
      nextReviewDate.setMonth(nextReviewDate.getMonth() + (type === 'ANNUAL' ? 12 : type === 'QUARTERLY' ? 3 : 6));

      const goals = [
        { goal: 'Improve technical skills', weight: 30, achieved: Math.random() > 0.3 },
        { goal: 'Enhance team collaboration', weight: 25, achieved: Math.random() > 0.2 },
        { goal: 'Meet project deadlines', weight: 25, achieved: Math.random() > 0.1 },
        { goal: 'Professional development', weight: 20, achieved: Math.random() > 0.4 }
      ];

      const achievements = [
        'Successfully completed major project ahead of schedule',
        'Mentored junior team members',
        'Improved process efficiency by 15%',
        'Received positive client feedback'
      ];

      const areasForImprovement = [
        'Time management skills',
        'Communication with stakeholders',
        'Technical documentation',
        'Cross-functional collaboration'
      ];

      await prisma.performanceReview.create({
        data: {
          tenantId: tenant.id,
          employeeId: employee.id,
          reviewerId: adminUser.id,
          type: type as any,
          period,
          status: status as any,
          overallRating: status === 'COMPLETED' || status === 'APPROVED' ? 
            Math.round((Math.random() * 2 + 3) * 10) / 10 : null, // 3.0 - 5.0 rating
          goals,
          achievements: achievements.slice(0, Math.floor(Math.random() * 3) + 1),
          areasForImprovement: areasForImprovement.slice(0, Math.floor(Math.random() * 2) + 1),
          feedback: status === 'COMPLETED' || status === 'APPROVED' ? 
            'Sample performance review feedback. Employee shows strong performance in key areas.' : null,
          nextReviewDate: status === 'APPROVED' ? nextReviewDate : null,
        }
      });
    }

    console.log('✅ Created 12 performance reviews');

    // Set up manager relationships (some employees report to others)
    const managers = employees.filter(emp => 
      emp.position?.includes('Manager') || 
      emp.position?.includes('Director') || 
      emp.position?.includes('Lead')
    );

    if (managers.length > 0) {
      const nonManagers = employees.filter(emp => !managers.includes(emp));
      
      for (const employee of nonManagers.slice(0, 10)) { // Set managers for first 10 non-managers
        const manager = managers[Math.floor(Math.random() * managers.length)];
        if (manager.department === employee.department) {
          await prisma.employee.update({
            where: { id: employee.id },
            data: { managerId: manager.id }
          });
        }
      }
      
      console.log('✅ Set up manager relationships');
    }

    console.log('🎉 HR module seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding HR data:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedHRData()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}