import dotenv from 'dotenv';
dotenv.config();
import { runSeedAdmin } from '../services/seedService.js';

async function seed() {
  try {
    console.log('Starting database seeding...');
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password) {
      console.error('Error: SEED_ADMIN_PASSWORD environment variable is not set in .env');
      process.exit(1);
    }
    const admin = await runSeedAdmin(password);
    console.log(`Database seeding completed successfully! Seeded admin user: ${admin.email}`);
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exit(1);
  }
}

seed();
