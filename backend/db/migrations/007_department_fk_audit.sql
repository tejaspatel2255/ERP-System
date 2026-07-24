DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM employees e
  WHERE e.department_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = e.department_id);

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % employees with orphaned department_id references after migration 006. Manual review required.', orphan_count;
  END IF;

  SELECT COUNT(*) INTO orphan_count
  FROM users u
  WHERE u.department_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = u.department_id);

  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Found % users with orphaned department_id references after migration 006. Manual review required.', orphan_count;
  END IF;
END $$;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_department_id_fkey,
  ADD CONSTRAINT users_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE employees
  DROP CONSTRAINT IF EXISTS employees_department_id_fkey,
  ADD CONSTRAINT employees_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
