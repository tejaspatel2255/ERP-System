import bcryptjs from 'bcryptjs';
import db from '../models/db.js';

export const runSeedAdmin = async (adminPassword = process.env.SEED_ADMIN_PASSWORD) => {
  if (!adminPassword) {
    throw new Error('SEED_ADMIN_PASSWORD environment variable is required.');
  }

  // 1. Seed 10 departments
  const departments = [
    'Sales', 'Purchase', 'Store', 'Production', 
    'Maintenance', 'QA', 'QC', 'Dispatch', 'HR', 'Design'
  ];
  const deptMap = {};
  for (const name of departments) {
    const dbRes = await db.query(`
      INSERT INTO departments (name) VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [name]);
    deptMap[name] = dbRes.rows[0].id;
  }

  // 2. Seed 3 roles
  const roles = ['Admin', 'Manager', 'Staff'];
  const roleMap = {};
  for (const name of roles) {
    const dbRes = await db.query(`
      INSERT INTO roles (name) VALUES ($1)
      ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
      RETURNING id;
    `, [name]);
    roleMap[name] = dbRes.rows[0].id;
  }

  // 3. Seed 1 admin user: name="Admin", email="admin@erp.com"
  const passwordHash = await bcryptjs.hash(adminPassword, 12);
  const adminDeptId = deptMap['Management'] || deptMap['HR'] || Object.values(deptMap)[0];
  const userRes = await db.query(`
    INSERT INTO users (name, email, password_hash, is_active, department_id)
    VALUES ('Admin', 'admin@erp.com', $1, true, $2)
    ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, name = EXCLUDED.name
    RETURNING id;
  `, [passwordHash, adminDeptId]);
  const adminUserId = userRes.rows[0].id;

  // 4. Link admin user to Admin role
  const adminRoleId = roleMap['Admin'];
  await db.query(`
    INSERT INTO user_roles (user_id, role_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING;
  `, [adminUserId, adminRoleId]);

  // 5. Seed all permissions for all modules for Admin role
  const modules = [
    'sales', 'purchase', 'inventory', 'store', 'production', 
    'maintenance', 'qa', 'qc', 'dispatch', 'hr', 'design', 
    'settings', 'users', 'auth', 'dashboard'
  ];
  const actions = ['view', 'create', 'edit', 'delete', 'approve'];

  for (const moduleName of modules) {
    for (const action of actions) {
      const permRes = await db.query(`
        INSERT INTO permissions (module_name, action)
        VALUES ($1, $2)
        ON CONFLICT (module_name, action) DO UPDATE SET module_name = EXCLUDED.module_name
        RETURNING id;
      `, [moduleName, action]);
      const permId = permRes.rows[0].id;

      await db.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING;
      `, [adminRoleId, permId]);
    }
  }

  return { name: 'Admin', email: 'admin@erp.com' };
};
