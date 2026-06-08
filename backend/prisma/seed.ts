import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Hash passwords
  const password1 = await bcrypt.hash('password123', 10);
  const password2 = await bcrypt.hash('password456', 10);

  // Create test users
  const user1 = await prisma.user.upsert({
    where: { email: 'john@example.com' },
    update: {},
    create: {
      email: 'john@example.com',
      password: password1,
      name: 'John Doe',
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      email: 'jane@example.com',
      password: password2,
      name: 'Jane Smith',
    },
  });

  console.log('✅ Created users:', { user1: user1.email, user2: user2.email });

  // Create sample guests for user1
  const guestsForUser1 = [
    {
      userId: user1.id,
      fullName: 'Alice Johnson',
      phone: '+1 (555) 100-1001',
      companions: 1,
      category: 'BRIDE' as const,
      rsvpStatus: 'CONFIRMED' as const,
      notes: 'Bride\'s best friend, bringing her sister',
    },
    {
      userId: user1.id,
      fullName: 'Bob Smith',
      phone: '+1 (555) 100-1002',
      companions: 0,
      category: 'GROOM' as const,
      rsvpStatus: 'CONFIRMED' as const,
      notes: 'College roommate',
    },
    {
      userId: user1.id,
      fullName: 'Carol Davis',
      phone: '+1 (555) 100-1003',
      companions: 2,
      category: 'FAMILY' as const,
      rsvpStatus: 'CONFIRMED' as const,
      notes: 'Bringing husband and teenage daughter',
    },
    {
      userId: user1.id,
      fullName: 'David Wilson',
      phone: '+1 (555) 100-1004',
      companions: 1,
      category: 'FRIENDS' as const,
      rsvpStatus: 'PENDING' as const,
      notes: 'High school friend, maybe bringing girlfriend',
    },
    {
      userId: user1.id,
      fullName: 'Emma Martinez',
      phone: '+1 (555) 100-1005',
      companions: 0,
      category: 'WORK' as const,
      rsvpStatus: 'CONFIRMED' as const,
      notes: 'Coworker from finance department',
    },
  ];

  // Create sample guests for user2
  const guestsForUser2 = [
    {
      userId: user2.id,
      fullName: 'Frank Anderson',
      phone: '+1 (555) 100-2001',
      companions: 1,
      category: 'FAMILY' as const,
      rsvpStatus: 'CONFIRMED' as const,
      notes: 'Uncle, bringing cousin',
    },
    {
      userId: user2.id,
      fullName: 'Grace Lee',
      phone: '+1 (555) 100-2002',
      companions: 0,
      category: 'FRIENDS' as const,
      rsvpStatus: 'CONFIRMED' as const,
      notes: 'Childhood best friend',
    },
    {
      userId: user2.id,
      fullName: 'Henry Brown',
      phone: '+1 (555) 100-2003',
      companions: 2,
      category: 'FAMILY' as const,
      rsvpStatus: 'CONFIRMED' as const,
      notes: 'Brother with wife and child',
    },
    {
      userId: user2.id,
      fullName: 'Iris Taylor',
      phone: '+1 (555) 100-2004',
      companions: 0,
      category: 'WORK' as const,
      rsvpStatus: 'DECLINED' as const,
      notes: 'Declined due to prior commitment',
    },
    {
      userId: user2.id,
      fullName: 'Jack Robinson',
      phone: '+1 (555) 100-2005',
      companions: 1,
      category: 'FRIENDS' as const,
      rsvpStatus: 'PENDING' as const,
      notes: 'Still waiting on response',
    },
  ];

  // Create all guests
  for (const guest of [...guestsForUser1, ...guestsForUser2]) {
    await prisma.guest.upsert({
      where: {
        userId_phone: {
          userId: guest.userId,
          phone: guest.phone,
        },
      },
      update: guest,
      create: guest,
    });
  }

  console.log('✅ Created 10 sample guests (5 per user)');
  console.log('');
  console.log('📧 Test Credentials:');
  console.log('  User 1: john@example.com / password123');
  console.log('  User 2: jane@example.com / password456');
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log('');
    console.log('✨ Seed completed successfully!');
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
