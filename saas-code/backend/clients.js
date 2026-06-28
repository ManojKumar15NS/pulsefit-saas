const express = require('express');
const router = express.Router();

// Middleware to ensure user is authenticated (populated via session cookie)
const requireAuth = (req, res, next) => {
  if (req.cookies && req.cookies.trainer_session) {
    req.trainerId = parseInt(req.cookies.trainer_session);
    if (!isNaN(req.trainerId)) return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
};

router.use(requireAuth);

// 1. GET ALL CLIENTS
router.get('/', async (req, res) => {
  const pool = req.app.get('dbPool');
  try {
    const result = await pool.query(
      `SELECT c.*, p.name as package_name, p.sessions_per_week 
       FROM clients c 
       LEFT JOIN packages p ON c.package_id = p.id
       WHERE c.trainer_id = $1 
       ORDER BY c.name ASC`,
      [req.trainerId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET CLIENT BY ID
router.get('/:id', async (req, res) => {
  const pool = req.app.get('dbPool');
  try {
    const result = await pool.query(
      `SELECT c.*, p.name as package_name, p.sessions_per_week, p.price, p.duration_months
       FROM clients c 
       LEFT JOIN packages p ON c.package_id = p.id
       WHERE c.id = $1 AND c.trainer_id = $2`,
      [req.params.id, req.trainerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or unauthorized' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. CREATE NEW CLIENT
router.post('/', async (req, res) => {
  const pool = req.app.get('dbPool');
  const {
    name, age, gender, height, weight, bmi, water_level, 
    visceral_fat, body_fat_pct, muscle_mass, target_weight, notes, package_id
  } = req.body;

  // Auto-calculate BMI if not manually override
  const heightInMeters = parseFloat(height) / 100;
  const computedBmi = bmi ? parseFloat(bmi) : (parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(1);

  try {
    const clientResult = await pool.query(
      `INSERT INTO clients (
        trainer_id, name, age, gender, height, weight, bmi, water_level, 
        visceral_fat, body_fat_pct, muscle_mass, target_weight, notes, package_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        req.trainerId, name, parseInt(age), gender, parseFloat(height), parseFloat(weight), 
        parseFloat(computedBmi), parseFloat(water_level || 0), parseFloat(visceral_fat || 0), 
        parseFloat(body_fat_pct || 0), parseFloat(muscle_mass || 0), parseFloat(target_weight || 0), 
        notes, package_id || null
      ]
    );

    const client = clientResult.rows[0];

    // Log initial progress log record
    await pool.query(
      `INSERT INTO progress_logs (
        client_id, weight, body_fat_pct, muscle_mass, visceral_fat, water_level, bmi, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        client.id, client.weight, client.body_fat_pct, client.muscle_mass, 
        client.visceral_fat, client.water_level, client.bmi, 'Initial registration metric log.'
      ]
    );

    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. UPDATE CLIENT DETAILS
router.put('/:id', async (req, res) => {
  const pool = req.app.get('dbPool');
  const {
    name, age, gender, height, weight, bmi, water_level, 
    visceral_fat, body_fat_pct, muscle_mass, target_weight, notes, status
  } = req.body;

  const heightInMeters = parseFloat(height) / 100;
  const computedBmi = bmi ? parseFloat(bmi) : (parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(1);

  try {
    // Verify client belongs to active trainer
    const clientCheck = await pool.query("SELECT id FROM clients WHERE id = $1 AND trainer_id = $2", [req.params.id, req.trainerId]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or unauthorized' });
    }

    const result = await pool.query(
      `UPDATE clients SET 
        name = $1, age = $2, gender = $3, height = $4, weight = $5, bmi = $6, water_level = $7, 
        visceral_fat = $8, body_fat_pct = $9, muscle_mass = $10, target_weight = $11, notes = $12, status = $13
       WHERE id = $14 RETURNING *`,
      [
        name, parseInt(age), gender, parseFloat(height), parseFloat(weight), parseFloat(computedBmi), 
        parseFloat(water_level || 0), parseFloat(visceral_fat || 0), parseFloat(body_fat_pct || 0), 
        parseFloat(muscle_mass || 0), parseFloat(target_weight || 0), notes, status || 'active', req.params.id
      ]
    );

    // Append to progress logs if weight or fat percentage changed
    await pool.query(
      `INSERT INTO progress_logs (
        client_id, weight, body_fat_pct, muscle_mass, visceral_fat, water_level, bmi, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        req.params.id, parseFloat(weight), parseFloat(body_fat_pct || 0), parseFloat(muscle_mass || 0), 
        parseFloat(visceral_fat || 0), parseFloat(water_level || 0), parseFloat(computedBmi), 'Profile update metric sync.'
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. DELETE CLIENT
router.delete('/:id', async (req, res) => {
  const pool = req.app.get('dbPool');
  try {
    const result = await pool.query(
      "DELETE FROM clients WHERE id = $1 AND trainer_id = $2",
      [req.params.id, req.trainerId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Client not found or unauthorized' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
