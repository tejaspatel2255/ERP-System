-- Migration 005: Seed IT department and ensure departments name unique constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'departments_name_unique'
    ) THEN
        ALTER TABLE departments ADD CONSTRAINT departments_name_unique UNIQUE (name);
    END IF;
END $$;

INSERT INTO departments (name)
VALUES ('IT')
ON CONFLICT (name) DO NOTHING;
