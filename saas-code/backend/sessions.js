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

// 1. GET ALL SESSIONS WITH FILTERS (trainer isolated)
router.get('/', async (req, res) => {
  const pool = req.app.get('dbPool');
  const { client_id, start_date, end_date } = req.query;

  let query = `
    SELECT s.*, c.name as client_name, p.name as package_name
    FROM sessions s
    JOIN clients c ON s.client_id = c.id
    LEFT JOIN packages p ON c.package_id = p.id
    WHERE c.trainer_id = $1
  `;
  const params = [req.trainerId];
  let paramIndex = 2;

  if (client_id) {
    query += ` AND s.client_id = $${paramIndex++}`;
    params.push(parseInt(client_id));
  }

  if (start_date && end_date) {
    query += ` AND s.session_date BETWEEN $${paramIndex++} AND $${paramIndex++}`;
    params.push(start_date, end_date);
  }

  query += ` ORDER BY s.session_date ASC, s.session_time ASC`;

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. TOGGLE ATTENDANCE / STATUS (attended, missed, upcoming)
router.put('/:id/status', async (req, res) => {
  const pool = req.app.get('dbPool');
  const { status } = req.body; // 'attended', 'missed', 'upcoming'

  try {
    // Verify owner
    const sessionCheck = await pool.query(
      `SELECT s.id FROM sessions s 
       JOIN clients c ON s.client_id = c.id 
       WHERE s.id = $1 AND c.trainer_id = $2`,
      [req.params.id, req.trainerId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
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

// 3. RESCHEDULE A SESSION (changes time/date and flags status)
router.put('/:id/reschedule', async (req, res) => {
  const pool = req.app.get('dbPool');
  const { session_date, session_time, notes } = req.body;

  try {
    // Verify owner
    const sessionCheck = await pool.query(
      `SELECT s.id FROM sessions s 
       JOIN clients c ON s.client_id = c.id 
       WHERE s.id = $1 AND c.trainer_id = $2`,
      [req.params.id, req.trainerId]
    );

    if (sessionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found or unauthorized' });
    }

    const result = await pool.query(
      `UPDATE sessions 
       SET session_date = $1, session_time = $2, status = 'rescheduled', notes = COALESCE($3, notes) 
       WHERE id = $4 RETURNING *`,
      [session_date, session_time, notes || null, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
