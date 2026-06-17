import dotenv from 'dotenv';
dotenv.config();
import { query } from '../models/db.js';
import bcryptjs from 'bcryptjs';

async function seed() {
  try {
    console.log('Starting database seeding...');

    // 1. Seed 10 departments
    const departments = [
      'Sales', 'Purchase', 'Store', 'Production', 
      'Maintenance', 'QA', 'QC', 'Dispatch', 'HR', 'Design'
    ];
    const deptMap = {};
    for (const name of departments) {
      const res = await query(`
        INSERT INTO departments (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `, [name]);
      deptMap[name] = res.rows[0].id;
    }
    console.log('Seeded 10 departments.');

    // 2. Seed 3 roles
    const roles = ['Admin', 'Manager', 'Staff'];
    const roleMap = {};
    for (const name of roles) {
      const res = await query(`
        INSERT INTO roles (name) VALUES ($1)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id;
      `, [name]);
      roleMap[name] = res.rows[0].id;
    }
    console.log('Seeded 3 roles.');

    // 3. Seed 1 admin user: name="Admin", email="admin@erp.com", password="Admin@123"
    const passwordHash = await bcryptjs.hash('Admin@123', 12);
    const adminDeptId = deptMap['Management'] || deptMap['HR'] || Object.values(deptMap)[0];
    const userRes = await query(`
      INSERT INTO users (name, email, password_hash, is_active, department_id)
      VALUES ('Admin', 'admin@erp.com', $1, true, $2)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
      RETURNING id;
    `, [passwordHash, adminDeptId]);
    const adminUserId = userRes.rows[0].id;
    console.log('Seeded Admin user.');

    // 4. Link admin user to Admin role
    const adminRoleId = roleMap['Admin'];
    await query(`
      INSERT INTO user_roles (user_id, role_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING;
    `, [adminUserId, adminRoleId]);
    console.log('Linked Admin user to Admin role.');

    // 5. Seed all permissions for all modules for Admin role
    const modules = [
      'sales', 'purchase', 'inventory', 'store', 'production', 
      'maintenance', 'qa', 'qc', 'dispatch', 'hr', 'design', 
      'settings', 'users', 'auth', 'dashboard'
    ];
    const actions = ['view', 'create', 'edit', 'delete', 'approve'];

    for (const moduleName of modules) {
      for (const action of actions) {
        // Insert permission
        const permRes = await query(`
          INSERT INTO permissions (module_name, action)
          VALUES ($1, $2)
          ON CONFLICT (module_name, action) DO UPDATE SET module_name = EXCLUDED.module_name
          RETURNING id;
        `, [moduleName, action]);
        const permId = permRes.rows[0].id;

        // Associate with Admin role
        await query(`
          INSERT INTO role_permissions (role_id, permission_id)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING;
        `, [adminRoleId, permId]);
      }
    }
    console.log('Seeded all permissions and mapped them to the Admin role.');
    console.log('Database seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seed();
