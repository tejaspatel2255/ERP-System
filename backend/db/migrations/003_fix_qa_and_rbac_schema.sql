-- Migration 003: Fix QA tests missing approval columns
ALTER TABLE qa_tests ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE qa_tests ADD COLUMN IF NOT EXISTS approval_remarks TEXT;
