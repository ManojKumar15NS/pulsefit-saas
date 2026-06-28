const express = require('express');
const router = express.Router();

const requireAuth = (req, res, next) => {
  if (req.cookies && req.cookies.trainer_session) {
    req.trainerId = parseInt(req.cookies.trainer_session);
    if (!isNaN(req.trainerId)) return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

router.use(requireAuth);

// 1. GET ALL SESSIONS WITH FILTERS
router.get('/', async (req, res) => {
  const pool = req.app.get('dbPool');
  const { client_id } = req.query;

  let query = `
    SELECT s.*, c.name as client_name, c.package_type
    FROM sessions s
    JOIN clients c ON s.client_id = c.id
    WHERE c.trainer_id = $1
  `;
  const params = [req.trainerId];

  if (client_id) {
    query += ` AND s.client_id = $2`;
    params.push(parseInt(client_id));
  }

  query += ` ORDER BY s.session_date ASC, s.session_time ASC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. MARK ATTENDANCE STATUS
router.put('/:id/status', async (req, res) => {
  const pool = req.app.get('dbPool');
  const { status } = req.body; // 'attended', 'missed', 'upcoming', 'rescheduled'

  try {
    const sessionCheck = await pool.query(
      `SELECT s.id FROM sessions s 
       JOIN clients c ON s.client_id = c.id 
       WHERE s.id = $1 AND c.trainer_id = $2`,
      [req.params.id, req.trainerId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session unauthorized' });
    }

    const result = await pool.query(
      "UPDATE sessions SET status = $1 WHERE id = $2 RETURNING *",
      [status, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. RESCHEDULE SLOT & STORE HISTORY
router.put('/:id/reschedule', async (req, res) => {
  const pool = req.app.get('dbPool');
  const { session_date, session_time, notes } = req.body;

  try {
    // Retrieve current session to log original_date audit trail
    const currentSessionQuery = await pool.query(
      `SELECT s.* FROM sessions s 
       JOIN clients c ON s.client_id = c.id 
       WHERE s.id = $1 AND c.trainer_id = $2`,
      [req.params.id, req.trainerId]
    );

    if (currentSessionQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Session unauthorized' });
    }

    const currentSession = currentSessionQuery.rows[0];

    // If original_date is not yet set, lock it to the active session_date
    const originalDate = currentSession.original_date || currentSession.session_date;

    const result = await pool.query(
      `UPDATE sessions 
       SET session_date = $1, session_time = $2, 
           original_date = $3, status = 'rescheduled', 
           notes = COALESCE($4, notes)
       WHERE id = $5 RETURNING *`,
      [session_date, session_time, originalDate, notes || null, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
