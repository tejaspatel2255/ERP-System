# CRUD Completeness Audit — 2026-07-25

## Summary
- 47 entities audited
- 11 entities fully complete (backend + frontend, all applicable operations)
- 36 entities with gaps

---

## Gaps found

### Auth & Roles

**Departments** (table: `departments`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ❌ MISSING | List ❌ MISSING | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: `GET /api/users/departments` and `POST /api/users/departments` exist on the backend, but the frontend only consumes departments as a dropdown in User/Employee creation forms with no dedicated UI page or management tools. Read-single, Update, and Delete endpoints are missing on the backend.

**Roles** (table: `roles`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ⚠️ PARTIAL | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ⚠️ PARTIAL | Delete ❌ MISSING]
- Notes: Role creation (`POST /api/users/roles`) and permission assignment (`PUT /api/users/roles/:id/permissions`) exist. However, `GET /roles/:id`, `DELETE /roles/:id`, and editing role name/metadata are missing on both backend and frontend.

---

### Store / Inventory

**Item Categories** (table: `item_categories`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ⚠️ PARTIAL | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Category creation is available via a modal inside `ItemsPage.jsx` and categories are listed in filter dropdowns. No endpoints or UI exist to view a single category, update category names, or delete categories.

**Goods Receipt Note (GRN)** (table: `grn`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: GRN records can be created, listed, and viewed in detail mode. No backend route or UI exists to edit posted GRNs or cancel/void a GRN entry.

---

### Sales

**Quotations** (table: `quotations`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ✅ | Delete ❌ MISSING]
- Notes: Quotations support full creation, listing, detail viewing, and editing. Status can be updated to Declined/Expired via `PATCH`, but no explicit hard delete or void endpoint/action exists.

**Sales Orders** (table: `sales_orders`)
- Backend: [Create ❌ MISSING | Read-list ✅ | Read-single ✅ | Update ⚠️ PARTIAL | Delete ✅ (Cancel)]
- Frontend: [Create ❌ MISSING | List ✅ | Detail ✅ | Edit ⚠️ PARTIAL | Delete ✅ (Cancel)]
- Notes: Sales Orders cannot be created directly via API/UI (they must originate from Quotation conversion via `POST /quotations/:id/convert`). Updating order items or quantities post-creation is not supported (only status updates via `PATCH /orders/:id/status`).

**Invoices** (table: `invoices`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ⚠️ PARTIAL | Delete ✅ (Void)]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ⚠️ PARTIAL | Delete ✅ (Void)]
- Notes: Invoices are created from Sales Orders. Updating invoice line items or totals post-creation is not supported (only status changes via `PATCH /invoices/:id/status`).

**Payments** (table: `payments`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Payments are recorded (`POST /api/sales/payments`) and displayed in the Invoices page drawer/tab. Read-single (`GET /payments/:id`), update (`PUT /payments/:id`), and delete/void endpoints or UI actions are missing.

---

### Purchase

**Vendor Invoices** (table: `vendor_invoices`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ⚠️ PARTIAL | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ⚠️ PARTIAL | Delete ❌ MISSING]
- Notes: Vendor invoices support creation, list, and single detail viewing. Update is restricted to status updates (`PATCH /invoices/:id/status`). No endpoint or UI exists to edit vendor invoice details or delete/void vendor invoices.

---

### Production

**Work Orders** (table: `work_orders`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ⚠️ PARTIAL | Delete ✅ (Cancel)]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ⚠️ PARTIAL | Delete ✅ (Cancel)]
- Notes: Work Orders can be created, listed, viewed in detail, and cancelled. Updating WO planned quantity or planned start/end dates post-creation is missing (`PUT /work-orders/:id` does not exist; only status transitions Start/Complete/Cancel are available).

**Material Consumption** (table: `material_consumption`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Issued materials are recorded per work order (`POST /api/production/consumption`) and listed in WO details. Single item lookup, edit, or reverse/delete consumption records are missing on backend and frontend.

**Production Costs** (table: `production_costs`)
- Backend: [Create ✅ | Read-list ❌ MISSING | Read-single ✅ | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ❌ MISSING | Detail ✅ | Edit ✅ | Delete ❌ MISSING]
- Notes: Production costing is managed via upsert (`POST /api/production/costing/:woId`) and fetched per Work Order ID. There is no standalone list view or deletion capability for production cost records.

---

### Maintenance

**Assets** (table: `assets`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ✅ | Delete ❌ MISSING]
- Notes: Asset management has full Create, Read-list, Read-single, and Update capabilities. However, no delete or deactivate/dispose endpoint (`DELETE /api/maintenance/assets/:id`) or frontend button exists.

**Maintenance Schedules** (table: `maintenance_schedules`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ✅ | Delete ❌ MISSING]
- Notes: Schedules can be created, listed, and updated. `GET /api/maintenance/schedules/:id` and `DELETE /api/maintenance/schedules/:id` are missing on backend and frontend.

**Maintenance Logs** (table: `maintenance_logs`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Completion logs are recorded when logging schedule execution. Single log lookup, edit, or delete operations do not exist on backend or frontend.

**Issue Logs / Maintenance Tickets** (table: `issue_logs`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ✅ | Delete ❌ MISSING]
- Notes: Issues support creation, listing, detail viewing, and resolution updating. Hard delete or ticket cancellation endpoint (`DELETE /api/maintenance/issues/:id`) is missing.

---

### Quality Assurance (QA)

**QA Checklists** (table: `qa_checklists`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ✅ | Delete ❌ MISSING]
- Notes: Checklists have full Create, Read-list, Read-single, and Update. No delete or deactivate endpoint/button exists.

**QA Tests** (table: `qa_tests`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ✅ | Delete ❌ MISSING]
- Notes: QA Tests support execution, result submission, and approval workflows. Deletion or cancellation of test records is not supported.

**QA Reports** (table: `qa_reports`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: PDF reports can be uploaded and viewed within QA test details, but individual report CRUD operations (Read-single, Update, Delete) are missing.

**QA Approvals** (table: `qa_approvals`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Approvals are logged during test review. Individual approval single lookup, edit, or revocation endpoints are missing.

---

### Quality Control (QC)

**QC Raw Material** (table: `qc_raw_material`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Raw material inspections can be submitted (`POST /api/qc/raw-material`) and listed (`GET /api/qc/raw-material`). Read-single, Update, and Delete are missing on backend and frontend.

**QC In-Process** (table: `qc_in_process`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: In-process inspections can be submitted and listed. Read-single, Update, and Delete are missing on backend and frontend.

**QC Final Product** (table: `qc_final`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Final product inspections can be submitted and listed. Read-single, Update, and Delete are missing on backend and frontend.

**Non-Conformance Reports (NCR)** (table: `ncr`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ✅ | Delete ❌ MISSING]
- Notes: NCRs can be raised, listed, and updated. Read-single (`GET /api/qc/ncr/:id`) and Delete endpoints/UI buttons are missing.

---

### Dispatch

**Packing Slips** (table: `packing_slips`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Packing slips can be created, listed, and viewed in detail. Endpoints and UI to edit items/notes or cancel/delete a packing slip are missing.

**Delivery Challans** (table: `delivery_challans`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ⚠️ PARTIAL | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ⚠️ PARTIAL | Delete ❌ MISSING]
- Notes: Delivery challans support creation, list, detail view, and attaching transport/POD info. General header editing (`PUT /challans/:id`) and deletion/cancellation endpoints are missing.

**Transport Details** (table: `transport_details`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ✅ | Delete ❌ MISSING]
- Notes: Transport details are created/updated via `POST /api/dispatch/challans/:id/transport` and displayed inside challan detail. Standalone single view and delete endpoints are missing.

**Proof of Delivery (POD)** (table: `proof_of_delivery`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: POD file and metadata are uploaded via `POST /api/dispatch/challans/:id/pod` and displayed inside challan detail. Separate update or delete endpoints are missing.

---

### HR

**Employees** (table: `employees`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ✅ | Delete ❌ MISSING]
- Notes: Employee records have full Create, Read-list, Read-single, and Update capabilities. However, no delete or deactivate endpoint (`DELETE /api/hr/employees/:id` or status toggle) or frontend action exists.

**Attendance** (table: `attendance`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ✅ | Delete ❌ MISSING]
- Notes: Attendance can be marked, summarized, listed, and corrected via `PUT /api/hr/attendance/:id`. `GET /attendance/:id` and `DELETE /attendance/:id` are missing on backend and frontend.

**Leave Types** (table: `leave_types`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Leave types can be created and listed. No `GET /leave-types/:id`, `PUT /leave-types/:id`, or `DELETE /leave-types/:id` endpoints or UI actions exist.

**Leave Applications** (table: `leave_applications`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ✅ (Approve/Reject) | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ✅ (Approve/Reject) | Delete ❌ MISSING]
- Notes: Leave applications can be applied for, listed, and approved/rejected via `PATCH`. Standalone single detail view, edit application, or cancel/delete application endpoints are missing.

**Training Sessions** (table: `training_sessions`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ✅ | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ✅ | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Training sessions can be created, listed, and viewed in detail (with attendance marking). Endpoint and UI to edit training details (`PUT /training/:id`) or cancel/delete session are missing.

---

### Design

**Design Versions** (table: `design_versions`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ❌ MISSING | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ❌ MISSING | Delete ❌ MISSING]
- Notes: Design versions are created when uploading a file update and viewed in file history timeline. Deletion or editing of previous version entries is missing.

**Design Tasks** (table: `design_tasks`)
- Backend: [Create ✅ | Read-list ✅ | Read-single ❌ MISSING | Update ✅ | Delete ❌ MISSING]
- Frontend: [Create ✅ | List ✅ | Detail ❌ MISSING | Edit ✅ | Delete ❌ MISSING]
- Notes: Design tasks can be created, listed, updated, and status toggled. Read-single (`GET /tasks/:id`) and Delete endpoints/UI buttons are missing.

---

## Entities fully complete
- **Users** (table: `users`) — Auth & Roles
- **Items** (table: `items`) — Store / Inventory
- **Stock Transactions** (table: `stock_transactions`) — Store / Inventory
- **Customers** (table: `customers`) — Sales
- **Vendors** (table: `vendors`) — Purchase
- **Purchase Orders** (table: `purchase_orders`) — Purchase
- **Bill of Materials (BOM)** (table: `bom`) — Production
- **Design Files** (table: `design_files`) — Design
- **Design Reviews** (table: `design_reviews`) — Design
- **Activity Logs** (table: `activity_logs`) — Auth & Roles
- **Settings** (table: `settings`) — Auth & Roles / System

---

## Join/link tables (no direct CRUD expected)
- `user_roles` (User <-> Role join table)
- `role_permissions` (Role <-> Permission join table)
- `permissions` (System permission list)
- `refresh_tokens` (Auth refresh tokens)
- `quotation_items` (Quotation line items child table)
- `sales_order_items` (Sales Order line items child table)
- `purchase_order_items` (Purchase Order line items child table)
- `grn_items` (GRN line items child table)
- `bom_items` (BOM raw material items child table)
- `qa_checklist_items` (QA checklist questions child table)
- `qa_test_results` (QA test question results child table)
- `packing_slip_items` (Packing Slip line items child table)
- `training_attendance` (Training session <-> Employee attendance join table)
- `leave_balances` (System-calculated employee leave balance summary table)

---

## Unprotected routes found (security note, separate from completeness)
- `backend/routes/hrRoutes.js`: `GET /api/hr/leave-types` (`router.get('/leave-types', getLeaveTypes)`) is protected by `verifyToken` but is missing `requirePermission('hr', 'view')`.
