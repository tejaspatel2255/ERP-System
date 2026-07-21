-- ============================================================================
-- MIGRATION 002: User Approval Flow (Set default is_active to FALSE)
-- ============================================================================

ALTER TABLE users ALTER COLUMN is_active SET DEFAULT FALSE;
