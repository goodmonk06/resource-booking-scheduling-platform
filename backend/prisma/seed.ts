import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-coworking' },
    update: {},
    create: {
      name: 'Demo Coworking Space',
      slug: 'demo-coworking',
    },
  });

  console.log('✅ Created tenant:', tenant.name);

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      tenantId: tenant.id,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create a booking policy
  const policy = await prisma.bookingPolicy.create({
    data: {
      tenantId: tenant.id,
      name: 'Standard Booking Policy',
      isDefault: true,
      rulesJson: {
        cancellationDeadlineHours: 24,
        maxDurationHours: 8,
        minDurationMinutes: 30,
        advanceBookingDays: 30,
      },
    },
  });

  console.log('✅ Created booking policy:', policy.name);

  // Create resource groups
  const meetingRoomsGroup = await prisma.resourceGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Meeting Rooms',
      type: 'ROOM',
      configJson: {
        requiresApproval: false,
        allowMultipleBookings: false,
      },
    },
  });

  const desksGroup = await prisma.resourceGroup.create({
    data: {
      tenantId: tenant.id,
      name: 'Hot Desks',
      type: 'ROOM',
      configJson: {
        requiresApproval: false,
        allowMultipleBookings: false,
      },
    },
  });

  console.log('✅ Created resource groups');

  // Create resources
  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        groupId: meetingRoomsGroup.id,
        name: 'Conference Room A',
        description: 'Large conference room with projector and whiteboard',
        capacity: 12,
        metaJson: {
          amenities: ['projector', 'whiteboard', 'video-conferencing'],
          floor: 2,
        },
      },
    }),
    prisma.resource.create({
      data: {
        groupId: meetingRoomsGroup.id,
        name: 'Conference Room B',
        description: 'Medium-sized meeting room',
        capacity: 6,
        metaJson: {
          amenities: ['whiteboard', 'tv-screen'],
          floor: 2,
        },
      },
    }),
    prisma.resource.create({
      data: {
        groupId: meetingRoomsGroup.id,
        name: 'Phone Booth 1',
        description: 'Private phone booth for calls',
        capacity: 1,
        metaJson: {
          amenities: ['soundproof'],
          floor: 1,
        },
      },
    }),
    prisma.resource.create({
      data: {
        groupId: desksGroup.id,
        name: 'Hot Desk 1',
        description: 'Desk in open area with monitor',
        capacity: 1,
        metaJson: {
          amenities: ['monitor', 'ergonomic-chair'],
          floor: 1,
        },
      },
    }),
    prisma.resource.create({
      data: {
        groupId: desksGroup.id,
        name: 'Hot Desk 2',
        description: 'Desk in quiet zone',
        capacity: 1,
        metaJson: {
          amenities: ['monitor', 'ergonomic-chair', 'standing-desk'],
          floor: 1,
        },
      },
    }),
  ]);

  console.log('✅ Created resources:', resources.length);

  // Create opening hours for meeting rooms group (Monday-Friday, 9 AM - 6 PM)
  for (let day = 1; day <= 5; day++) {
    await prisma.openingHours.create({
      data: {
        groupId: meetingRoomsGroup.id,
        weekday: day,
        startTime: '09:00',
        endTime: '18:00',
      },
    });
  }

  // Create opening hours for desks group (Monday-Friday, 8 AM - 8 PM)
  for (let day = 1; day <= 5; day++) {
    await prisma.openingHours.create({
      data: {
        groupId: desksGroup.id,
        weekday: day,
        startTime: '08:00',
        endTime: '20:00',
      },
    });
  }

  console.log('✅ Created opening hours');

  console.log('🎉 Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
