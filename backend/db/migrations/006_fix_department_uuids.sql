-- Migration 006: Replace mock dummy non-standard UUIDs in departments with standard Postgres gen_random_uuid()
DO $$
DECLARE
    d_row RECORD;
    new_uuid UUID;
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_department_id_fkey;

    FOR d_row IN SELECT id, name FROM departments LOOP
        IF d_row.id::text LIKE 'd1111111%' OR d_row.id::text LIKE 'd2222222%' OR d_row.id::text LIKE 'd3333333%' THEN
            new_uuid := gen_random_uuid();
            UPDATE departments SET id = new_uuid WHERE id = d_row.id;
            UPDATE users SET department_id = new_uuid WHERE department_id = d_row.id;
        END IF;
    END LOOP;

    ALTER TABLE users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
END $$;
