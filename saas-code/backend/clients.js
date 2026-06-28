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

// Helper function to auto-generate sessions
async function generateClientSessions(pool, client_id, start_date, end_date, preferred_time, preferred_days, package_type) {
  // Clear upcoming sessions to prevent duplicates
  await pool.query(
    "DELETE FROM sessions WHERE client_id = $1 AND session_date >= $2 AND status = 'upcoming'",
    [client_id, start_date]
  );

  let sessionsCount = 12; // Silver
  if (package_type === 'Gold') sessionsCount = 20;
  else if (package_type === 'Platinum') sessionsCount = 30;

  const daysAllowed = preferred_days ? preferred_days.split(',').map(Number) : [1, 3, 5];
  const generated = [];
  let currentDate = new Date(start_date);
  const stopDate = new Date(end_date);
  let scheduledCount = 0;
  let safety = 0;

  while (scheduledCount < sessionsCount && currentDate <= stopDate && safety < 150) {
    safety++;
    const jsDay = currentDate.getDay();
    const currentDayNum = jsDay === 0 ? 7 : jsDay; // Convert to 1=Mon, 7=Sun

    if (daysAllowed.includes(currentDayNum)) {
      const formattedDate = currentDate.toISOString().split('T')[0];
      generated.push({
        client_id,
        session_date: formattedDate,
        session_time: preferred_time || '08:00',
        status: 'upcoming',
        notes: `${package_type} Package Workout`
      });
      scheduledCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  for (const session of generated) {
    await pool.query(
      `INSERT INTO sessions (client_id, session_date, session_time, status, notes) 
       VALUES ($1, $2, $3, $4, $5)`,
      [session.client_id, session.session_date, session.session_time, session.status, session.notes]
    );
  }
  return scheduledCount;
}

// 1. GET ALL CLIENTS
router.get('/', async (req, res) => {
  const pool = req.app.get('dbPool');
  try {
    const result = await pool.query(
      "SELECT * FROM clients WHERE trainer_id = $1 ORDER BY name ASC",
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
      "SELECT * FROM clients WHERE id = $1 AND trainer_id = $2",
      [req.params.id, req.trainerId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST - ADD NEW CLIENT & AUTO-GENERATE SCHEDULE
router.post('/', async (req, res) => {
  const pool = req.app.get('dbPool');
  const {
    name, age, gender, height, weight, bmi, water_level, visceral_fat, 
    muscle_mass, body_fat_pct, target_weight, notes,
    package_type, amount_paid, start_date, end_date, preferred_days, preferred_time
  } = req.body;

  try {
    const clientResult = await pool.query(
      `INSERT INTO clients (
        trainer_id, name, age, gender, height, weight, bmi, water_level, visceral_fat, 
        muscle_mass, body_fat_pct, target_weight, notes,
        package_type, amount_paid, start_date, end_date, preferred_days, preferred_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        req.trainerId, name, parseInt(age), gender, parseFloat(height), parseFloat(weight), 
        parseFloat(bmi), parseFloat(water_level || 0), parseFloat(visceral_fat || 0), 
        parseFloat(muscle_mass || 0), parseFloat(body_fat_pct || 0), parseFloat(target_weight || 0), notes,
        package_type || null, amount_paid ? parseFloat(amount_paid) : 0, 
        start_date || null, end_date || null, preferred_days || null, preferred_time || null
      ]
    );

    const client = clientResult.rows[0];

    // Log initial progress history metric
    await pool.query(
      `INSERT INTO progress_logs (
        client_id, weight, body_fat_pct, muscle_mass, visceral_fat, water_level, bmi, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        client.id, client.weight, client.body_fat_pct, client.muscle_mass, 
        client.visceral_fat, client.water_level, client.bmi, 'Initial physical metrics log.'
      ]
    );

    // Auto-generate sessions if package details are present
    if (client.package_type && client.start_date && client.end_date) {
      await generateClientSessions(
        pool, client.id, client.start_date, client.end_date, 
        client.preferred_time, client.preferred_days, client.package_type
      );
    }

    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. PUT - UPDATE CLIENT PROFILE
router.put('/:id', async (req, res) => {
  const pool = req.app.get('dbPool');
  const {
    name, age, gender, height, weight, bmi, water_level, visceral_fat, 
    muscle_mass, body_fat_pct, target_weight, notes, status,
    package_type, amount_paid, start_date, end_date, preferred_days, preferred_time
  } = req.body;

  try {
    const check = await pool.query("SELECT id FROM clients WHERE id = $1 AND trainer_id = $2", [req.params.id, req.trainerId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Client unauthorized' });
    }

    const result = await pool.query(
      `UPDATE clients SET 
        name = $1, age = $2, gender = $3, height = $4, weight = $5, bmi = $6, water_level = $7, 
        visceral_fat = $8, muscle_mass = $9, body_fat_pct = $10, target_weight = $11, notes = $12, status = $13,
        package_type = $14, amount_paid = $15, start_date = $16, end_date = $17, preferred_days = $18, preferred_time = $19
       WHERE id = $20 RETURNING *`,
      [
        name, parseInt(age), gender, parseFloat(height), parseFloat(weight), parseFloat(bmi), 
        parseFloat(water_level || 0), parseFloat(visceral_fat || 0), parseFloat(muscle_mass || 0), 
        parseFloat(body_fat_pct || 0), parseFloat(target_weight || 0), notes, status || 'active',
        package_type || null, amount_paid ? parseFloat(amount_paid) : 0, 
        start_date || null, end_date || null, preferred_days || null, preferred_time || null, req.params.id
      ]
    );

    const client = result.rows[0];

    // Log progress history
    await pool.query(
      `INSERT INTO progress_logs (
        client_id, weight, body_fat_pct, muscle_mass, visceral_fat, water_level, bmi, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        client.id, client.weight, client.body_fat_pct, client.muscle_mass, 
        client.visceral_fat, client.water_level, client.bmi, 'Biometric update metric sync.'
      ]
    );

    // Auto-generate/reschedule upcoming sessions
    if (client.package_type && client.start_date && client.end_date) {
      await generateClientSessions(
        pool, client.id, client.start_date, client.end_date, 
        client.preferred_time, client.preferred_days, client.package_type
      );
    }

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
