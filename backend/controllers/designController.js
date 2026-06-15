import { query as dbQuery, pool } from '../models/db.js';
import { logActivity } from './userController.js';
import { uploadToSupabase } from '../middleware/upload.js';
const db = { query: dbQuery, pool };

// GET /api/design/files
export const getDesignFiles = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT df.*, u.name AS uploaded_by_name,
             (SELECT COUNT(*)::int FROM design_versions dv WHERE dv.design_file_id = df.id) AS versions_count,
             (SELECT COALESCE(MAX(version_number), 1) FROM design_versions dv WHERE dv.design_file_id = df.id) AS latest_version
      FROM design_files df
      LEFT JOIN users u ON df.uploaded_by = u.id
      ORDER BY df.created_at DESC
    `);
    return res.status(200).json({ success: true, designFiles: result.rows });
  } catch (e) { next(e); }
};

// POST /api/design/files (Upload new file)
export const uploadDesignFile = async (req, res, next) => {
  const { title, description, project_ref } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Title is required.' });
  }

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No design file uploaded.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Upload to Supabase bucket 'design-files'
    const fileUrl = await uploadToSupabase('design-files', req.file);
    const fileType = req.file.originalname.split('.').pop() || '';

    // 2. Insert into design_files
    const dfRes = await client.query(`
      INSERT INTO design_files (title, description, file_url, file_type, uploaded_by, project_ref)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [title, description || null, fileUrl, fileType, req.user.id, project_ref || null]);
    const fileId = dfRes.rows[0].id;

    // 3. Insert version v1 into design_versions
    const dvRes = await client.query(`
      INSERT INTO design_versions (design_file_id, version_number, file_url, uploaded_by, notes)
      VALUES ($1, 1, $2, $3, $4) RETURNING *
    `, [fileId, fileUrl, req.user.id, 'Initial Upload']);

    await client.query('COMMIT');
    await logActivity(req.user.id, 'UPLOAD_DESIGN_FILE', 'design', fileId, req);

    return res.status(201).json({ success: true, designFile: dfRes.rows[0], version: dvRes.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

// GET /api/design/files/:id
export const getDesignFileById = async (req, res, next) => {
  const { id } = req.params;
  try {
    const fileRes = await db.query(`
      SELECT df.*, u.name AS uploaded_by_name
      FROM design_files df
      LEFT JOIN users u ON df.uploaded_by = u.id
      WHERE df.id = $1
    `, [id]);

    if (fileRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Design file not found.' });
    }

    const versionsRes = await db.query(`
      SELECT dv.*, u.name AS uploaded_by_name
      FROM design_versions dv
      LEFT JOIN users u ON dv.uploaded_by = u.id
      WHERE dv.design_file_id = $1
      ORDER BY dv.version_number DESC
    `, [id]);

    const reviewsRes = await db.query(`
      SELECT dr.*, u.name AS reviewer_name, dv.version_number
      FROM design_reviews dr
      LEFT JOIN users u ON dr.reviewed_by = u.id
      LEFT JOIN design_versions dv ON dr.version_id = dv.id
      WHERE dr.design_file_id = $1
      ORDER BY dr.review_date DESC
    `, [id]);

    return res.status(200).json({
      success: true,
      designFile: fileRes.rows[0],
      versions: versionsRes.rows,
      reviews: reviewsRes.rows
    });
  } catch (e) { next(e); }
};

// POST /api/design/files/:id/versions (Upload new version)
export const uploadNewVersion = async (req, res, next) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No version file uploaded.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Verify file exists
    const checkRes = await client.query(`SELECT id FROM design_files WHERE id = $1`, [id]);
    if (checkRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Design file not found.' });
    }

    const fileUrl = await uploadToSupabase('design-files', req.file);

    // Get max version number
    const vRes = await client.query(`
      SELECT COALESCE(MAX(version_number), 0)::int AS max_v 
      FROM design_versions WHERE design_file_id = $1
    `, [id]);
    const nextVer = (vRes.rows[0].max_v || 0) + 1;

    // Insert version
    const dvRes = await client.query(`
      INSERT INTO design_versions (design_file_id, version_number, file_url, uploaded_by, notes)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `, [id, nextVer, fileUrl, req.user.id, notes || null]);

    // Update design files updated_at and file_url
    await client.query(`
      UPDATE design_files SET file_url = $1, updated_at = NOW() WHERE id = $2
    `, [fileUrl, id]);

    await client.query('COMMIT');
    await logActivity(req.user.id, 'UPLOAD_DESIGN_VERSION', 'design', id, req);

    return res.status(201).json({ success: true, version: dvRes.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};

// GET /api/design/tasks
export const getDesignTasks = async (req, res, next) => {
  try {
    const { assigned_to, status } = req.query;
    const params = [];
    let queryText = `
      SELECT dt.*, u.name AS assigned_to_name, df.title AS design_file_title
      FROM design_tasks dt
      LEFT JOIN users u ON dt.assigned_to = u.id
      LEFT JOIN design_files df ON dt.design_file_id = df.id
      WHERE 1=1
    `;

    if (assigned_to) {
      params.push(assigned_to);
      queryText += ` AND dt.assigned_to = $${params.length}`;
    }
    if (status) {
      params.push(status);
      queryText += ` AND dt.status = $${params.length}`;
    }

    queryText += ` ORDER BY dt.due_date ASC, dt.created_at DESC`;
    const result = await db.query(queryText, params);
    return res.status(200).json({ success: true, tasks: result.rows });
  } catch (e) { next(e); }
};

// POST /api/design/tasks
export const createDesignTask = async (req, res, next) => {
  const { title, description, assigned_to, due_date, priority, design_file_id } = req.body;
  if (!title) {
    return res.status(400).json({ success: false, message: 'Task Title is required.' });
  }

  try {
    const result = await db.query(`
      INSERT INTO design_tasks (title, description, assigned_to, due_date, priority, status, design_file_id)
      VALUES ($1, $2, $3, $4, $5, 'Pending', $6) RETURNING *
    `, [title, description || null, assigned_to || null, due_date || null, priority || 'Medium', design_file_id || null]);

    await logActivity(req.user.id, 'CREATE_DESIGN_TASK', 'design', result.rows[0].id, req);
    return res.status(201).json({ success: true, task: result.rows[0] });
  } catch (e) { next(e); }
};

// PUT /api/design/tasks/:id
export const updateDesignTask = async (req, res, next) => {
  const { id } = req.params;
  const { title, description, assigned_to, due_date, priority, status, design_file_id } = req.body;
  try {
    const result = await db.query(`
      UPDATE design_tasks
      SET title = $1, description = $2, assigned_to = $3, due_date = $4, priority = $5, status = $6, design_file_id = $7, updated_at = NOW()
      WHERE id = $8 RETURNING *
    `, [title, description, assigned_to || null, due_date || null, priority || 'Medium', status || 'Pending', design_file_id || null, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Design task not found.' });
    }

    await logActivity(req.user.id, 'UPDATE_DESIGN_TASK', 'design', id, req);
    return res.status(200).json({ success: true, task: result.rows[0] });
  } catch (e) { next(e); }
};

// PATCH /api/design/tasks/:id/status
export const updateDesignTaskStatus = async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await db.query(`
      UPDATE design_tasks SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *
    `, [status, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Design task not found.' });
    }

    await logActivity(req.user.id, 'UPDATE_DESIGN_TASK_STATUS', 'design', id, req);
    return res.status(200).json({ success: true, task: result.rows[0] });
  } catch (e) { next(e); }
};

// GET /api/design/reviews (List pending reviews)
export const getPendingReviews = async (req, res, next) => {
  try {
    // Return design files/versions that haven't been approved yet
    const result = await db.query(`
      SELECT dv.*, df.title AS design_file_title, df.project_ref, u.name AS uploaded_by_name
      FROM design_versions dv
      JOIN design_files df ON dv.design_file_id = df.id
      LEFT JOIN users u ON dv.uploaded_by = u.id
      WHERE NOT EXISTS (
        SELECT 1 FROM design_reviews dr 
        WHERE dr.version_id = dv.id AND dr.status = 'Approved'
      )
      ORDER BY dv.uploaded_at ASC
    `);
    return res.status(200).json({ success: true, pendingReviews: result.rows });
  } catch (e) { next(e); }
};

// POST /api/design/files/:id/reviews (Submit review)
export const submitReview = async (req, res, next) => {
  const { id } = req.params; // design_file_id
  const { version_id, status, remarks } = req.body; // status: Approved, Changes Requested

  if (!version_id || !status) {
    return res.status(400).json({ success: false, message: 'version_id and status are required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Constraint: The uploader cannot be the reviewer of their own file
    const versionRes = await client.query(`SELECT uploaded_by FROM design_versions WHERE id = $1`, [version_id]);
    if (versionRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Design version not found.' });
    }

    const uploaderId = versionRes.rows[0].uploaded_by;
    if (uploaderId === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'The uploader cannot review their own design file version.'
      });
    }

    // 2. Insert into design_reviews
    const drRes = await client.query(`
      INSERT INTO design_reviews (design_file_id, version_id, reviewed_by, review_date, status, remarks)
      VALUES ($1, $2, $3, NOW(), $4, $5) RETURNING *
    `, [id, version_id, req.user.id, status, remarks || null]);

    // 3. Update task status: After approval: task status can be set to Completed
    if (status === 'Approved') {
      await client.query(`
        UPDATE design_tasks SET status = 'Completed', updated_at = NOW()
        WHERE design_file_id = $1 AND status IN ('Pending', 'In Progress', 'In Review')
      `, [id]);
    }

    await client.query('COMMIT');
    await logActivity(req.user.id, 'SUBMIT_DESIGN_REVIEW', 'design', drRes.rows[0].id, req);

    return res.status(201).json({ success: true, review: drRes.rows[0] });
  } catch (e) {
    await client.query('ROLLBACK');
    next(e);
  } finally {
    client.release();
  }
};
