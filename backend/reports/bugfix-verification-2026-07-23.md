# Bugfix Verification Report: Department Creation & HR Selection Safeguards

**Date:** July 23, 2026  
**Branch:** `main`

---

## Executive Summary
This fix resolves the issue where missing departments (such as `IT`) could not be selected when editing or creating users, and adds defensive safeguards for department selection and persistence (e.g. `HR`).

The resolution includes:
1. Seeding the `IT` department via database migration.
2. Providing inline "+ Add New Department..." capability inside the user department dropdown.
3. Adding a dedicated "Organization Departments" management section on the Roles & Permissions page.
4. Live database diagnostics for duplicate department schema drift & defensive stringification/logging in the frontend.

---

## Live Database Diagnostic Results (STEP-18 Section 1)

```sql
-- 1a. Look for duplicate department names:
SELECT name, COUNT(*), array_agg(id) AS ids FROM departments GROUP BY name HAVING COUNT(*) > 1;
-- Output: [] (Zero duplicate rows found)

-- 1b. Confirm whether UNIQUE constraint on departments.name exists:
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'departments'::regclass;
-- Output: departments_name_key (UNIQUE name), departments_name_unique (UNIQUE name)

-- 1c. Check for hidden whitespace/casing variants of "HR":
SELECT id, name, length(name), encode(name::bytea, 'hex') FROM departments WHERE lower(trim(name)) = 'hr';
-- Output: 1 row | ID: 'd3333333-3333-3333-3333-333333333333' | Name: 'HR' | Length: 2 | Hex: '4852'

-- 1d. Existing users referencing "HR":
SELECT u.id, u.name, u.department_id, d.name FROM users u JOIN departments d ON u.department_id = d.id WHERE lower(trim(d.name)) = 'hr';
-- Output: Admin user (f1111111-1111-1111-1111-111111111111) -> d3333333-3333-3333-3333-333333333333
```

---

## Summary of Implementation & Safeguards

### 1. Seeding IT Department & Schema Constraints
- **File:** `backend/db/migrations/005_seed_it_department.sql`
- Added migration to seed `IT` with `ON CONFLICT (name) DO NOTHING`.
- Verified database contains 11 canonical departments (`Design`, `Dispatch`, `HR`, `IT`, `Maintenance`, `Production`, `Purchase`, `QA`, `QC`, `Sales`, `Store`).

### 2. Inline Department Creation Dropdown
- **File:** `frontend/src/pages/UsersPage.jsx`
- Added `+ Add New Department...` option to the Department dropdown, guarded by `hasPermission('auth', 'create')`.
- Implemented inline input with "Create" and "Cancel" buttons replacing the dropdown upon selecting "+ Add New Department...".
- Integrated `createDepartment` API call: upon creation, metadata is re-fetched and the newly created department is automatically selected in the form.

### 3. Admin Department Management
- **File:** `frontend/src/pages/RolesPage.jsx`
- Added an "Organization Departments" card guarded by `hasPermission('auth', 'create')`.
- Displays existing system departments as tags and provides a dedicated form to create new departments.

### 4. Backend Update Response Enhancement
- **File:** `backend/controllers/userController.js`
- Updated `updateUser` query to return `department_name` in addition to `department_id` via a SQL CTE.

### 5. Defensive Frontend Safeguards (STEP-18 Section 3)
- **File:** `frontend/src/pages/UsersPage.jsx`
- Explicitly stringified `key` and `value` on `<option>` elements: `<option key={String(dept.id)} value={String(dept.id)}>{dept.name}</option>`.
- Ensured `formData.department_id` is consistently initialized and updated as a `String`.
- Added `console.debug` logging for sent vs returned `department_id` in `handleSubmit` with a `console.warn` alert if a mismatch ever occurs.
- Optimistically updated local table state upon save to ensure instant UI responsiveness.

---

## Verification Results
- **Migration Status Check:** `node backend/scripts/check-migration-status.js` passed with `✅ Department IT EXISTS`.
- **Frontend Production Build:** `npm run build` executed successfully without errors.
- **Git Status:** All commits merged to `main` and pushed to GitHub.
