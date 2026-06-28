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

// 1. GET ALL SUBSCRIPTION PACKAGES
router.get('/', async (req, res) => {
  const pool = req.app.get('dbPool');
  try {
    const result = await pool.query('SELECT * FROM packages ORDER BY price ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. ASSIGN PACKAGE & AUTO-GENERATE WORKOUT SCHEDULE
router.post('/assign', async (req, res) => {
  const pool = req.app.get('dbPool');
  const { client_id, package_id, start_date, preferred_time, preferred_days } = req.body;
  // preferred_days: Array of day numbers, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat, 7=Sun

  try {
    // Verify client belongs to active trainer
    const clientCheck = await pool.query("SELECT id FROM clients WHERE id = $1 AND trainer_id = $2", [client_id, req.trainerId]);
    if (clientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found or unauthorized' });
    }

    // Fetch package details
    const packageResult = await pool.query("SELECT * FROM packages WHERE id = $1", [package_id]);
    if (packageResult.rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    const pkg = packageResult.rows[0];

    // Determine total sessions based on tier name & duration
    let sessionsCount = 12; // Default Silver
    if (pkg.name === 'Gold') sessionsCount = 20;
    else if (pkg.name === 'Platinum') sessionsCount = 30;

    // Multiply by duration months
    const totalSessions = sessionsCount * pkg.duration_months;

    // Update client with package bindings
    await pool.query(
      "UPDATE clients SET package_id = $1, package_start_date = $2 WHERE id = $3",
      [package_id, start_date, client_id]
    );

    // Delete existing upcoming sessions to prevent overrides
    await pool.query(
      "DELETE FROM sessions WHERE client_id = $1 AND session_date >= $2 AND status = 'upcoming'",
      [client_id, start_date]
    );

    // Auto-Generation Scheduling Engine
    const generatedSessions = [];
    let currentDate = new Date(start_date);
    let scheduledCount = 0;

    // Safety limit of 120 days loop to prevent infinite loops
    let safetyCounter = 0;
    const daysAllowed = preferred_days && preferred_days.length > 0 ? preferred_days : [1, 3, 5]; // Default Mon, Wed, Fri

    while (scheduledCount < totalSessions && safetyCounter < 150) {
      safetyCounter++;
      // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
      const jsDay = currentDate.getDay();
      const currentDayNum = jsDay === 0 ? 7 : jsDay; // Convert to 1=Mon, 7=Sun

      if (daysAllowed.includes(currentDayNum)) {
        const formattedDate = currentDate.toISOString().split('T')[0];
        
        generatedSessions.push({
          client_id,
          session_date: formattedDate,
          session_time: preferred_time || '08:00',
          status: 'upcoming',
          notes: `${pkg.name} Tier Session ${scheduledCount + 1}`
        });
        
        scheduledCount++;
      }
      
      // Advance to the next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Batch insert sessions into PostgreSQL
    for (const session of generatedSessions) {
      await pool.query(
        `INSERT INTO sessions (client_id, session_date, session_time, status, notes) 
         VALUES ($1, $2, $3, $4, $5)`,
        [session.client_id, session.session_date, session.session_time, session.status, session.notes]
      );
    }

    res.json({
      success: true,
      message: `Assigned package ${pkg.name} and auto-scheduled ${scheduledCount} sessions.`,
      sessionsScheduled: scheduledCount
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
