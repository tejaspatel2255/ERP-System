# Bugfix Verification - 2026-07-24

## 1. Error Message Leak Fix
- **Issue:** The `register` and `seedAdmin` methods in `backend/controllers/authController.js` were catching errors and manually sending `error.message` in a 500 JSON response, leaking raw internal error details to the client.
- **Fix:** Removed the manual JSON error response and instead routed the error through `next(error)`, which passes it to the central `errorHandler` middleware. The `console.error` logs were retained so backend logs still capture the raw details.
- **Verification:** Searched the remaining controllers in `backend/controllers/` to ensure no other occurrences of leaked `error.message` existed. (One match in `dashboardController.js` was safely inside a `console.error` and did not leak to the response). Tested execution to confirm it successfully forwards to the error handler.

## 2. Department FK Safety for Employees
- **Issue:** Migration 006 updated `departments` and `users` but did not update the `department_id` foreign key constraint logic to cascade updates for either `users` or `employees`.
- **Fix:** 
  - Added migration `007_department_fk_audit.sql` which runs an audit (DO block) confirming no orphaned references currently exist for `employees.department_id` or `users.department_id`.
  - Added `ON UPDATE CASCADE` to the `users_department_id_fkey` and `employees_department_id_fkey` constraints.
  - Updated `backend/db/schema.sql` to include `ON UPDATE CASCADE` for both fields so fresh installs are safe by default.
- **Verification:** Tested the SQL script syntax. Unable to perform live database verification via `run_migration.js` due to the local PostgreSQL database service currently being down / offline, but the constraint structure guarantees cascaded updates moving forward.
