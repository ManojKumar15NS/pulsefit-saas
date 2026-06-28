const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_PASSWORD = process.env.TRAINER_PASSWORD || 'trainer123';

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Database connection pool setup (Auto-detect DATABASE_URL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/gym_tracker',
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Dynamic Query translator helper (SQLite parameter ? to PostgreSQL $1, $2)
const translateQuery = (query) => {
  let index = 1;
  let pgQuery = query.replace(/\?/g, () => `$${index++}`);
  
  // Clean SQLite specific keywords
  pgQuery = pgQuery.replace(/INTEGER PRIMARY KEY AUTOINCREMENT/gi, 'SERIAL PRIMARY KEY')
                   .replace(/AUTOINCREMENT/gi, '');
                   
  // Ensure primary keys use SERIAL structure
  if (pgQuery.trim().toUpperCase().startsWith('INSERT') && !pgQuery.toUpperCase().includes('RETURNING')) {
    pgQuery += ' RETURNING id';
  }
  return pgQuery;
};

// Promisified database helpers to mimic SQLite on PostgreSQL
const dbRun = async (query, params = []) => {
  const pgQuery = translateQuery(query);
  const res = await pool.query(pgQuery, params);
  return { lastID: res.rows[0]?.id };
};

const dbAll = async (query, params = []) => {
  const pgQuery = translateQuery(query);
  const res = await pool.query(pgQuery, params);
  return res.rows;
};

const dbGet = async (query, params = []) => {
  const pgQuery = translateQuery(query);
  const res = await pool.query(pgQuery, params);
  return res.rows[0];
};

// Database schema setup
(async () => {
  try {
    // Create Tables
    await dbRun(`CREATE TABLE IF NOT EXISTS trainers (
      id SERIAL PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      fullname VARCHAR(255) NOT NULL
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS clients (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      age INTEGER NOT NULL,
      gender VARCHAR(50) NOT NULL,
      height REAL NOT NULL,
      weight REAL NOT NULL,
      body_fat REAL NOT NULL,
      bmi REAL NOT NULL,
      medical_conditions TEXT,
      fitness_goal VARCHAR(255) NOT NULL,
      phone VARCHAR(50) NOT NULL,
      email VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      join_date VARCHAR(50) NOT NULL,
      trainer_id INTEGER REFERENCES trainers(id) ON DELETE CASCADE
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS progress_logs (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      date VARCHAR(50) NOT NULL,
      weight REAL NOT NULL,
      body_fat REAL NOT NULL,
      bmi REAL NOT NULL,
      notes TEXT
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path VARCHAR(255) NOT NULL,
      upload_date VARCHAR(50) NOT NULL
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      session_time VARCHAR(50) NOT NULL,
      notes TEXT
    )`);

    await dbRun(`CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      message_text TEXT NOT NULL,
      sent_date VARCHAR(50) NOT NULL,
      template_type VARCHAR(255)
    )`);

    // Seed default trainer and clients if empty
    const trainersCount = await dbGet("SELECT COUNT(*) as count FROM trainers");
    if (trainersCount && parseInt(trainersCount.count) === 0) {
      console.log("Seeding initial gym database in PostgreSQL...");
      const defaultHash = crypto.createHash('sha256').update(SECRET_PASSWORD).digest('hex');
      const defaultTrainer = await dbRun(
        `INSERT INTO trainers (username, password_hash, fullname) VALUES (?, ?, ?)`,
        ['trainer123', defaultHash, 'Coach Manoj']
      );
      const tId = defaultTrainer.lastID;

      // Insert Clients
      const client1 = await dbRun(
        `INSERT INTO clients (name, age, gender, height, weight, body_fat, bmi, medical_conditions, fitness_goal, phone, email, status, join_date, trainer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['John Doe', 28, 'Male', 180, 85.0, 22.0, 26.2, 'Slight lower back tightness', 'Muscle Gain', '+15550199', 'john.doe@example.com', 'active', '2026-05-01', tId]
      );
      const c1Id = client1.lastID;

      const client2 = await dbRun(
        `INSERT INTO clients (name, age, gender, height, weight, body_fat, bmi, medical_conditions, fitness_goal, phone, email, status, join_date, trainer_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['Jane Smith', 32, 'Female', 165, 70.0, 30.0, 25.7, 'None', 'Weight Loss', '+15550288', 'jane.smith@example.com', 'active', '2026-05-15', tId]
      );
      const c2Id = client2.lastID;

      // Insert Progress Logs
      await dbRun(`INSERT INTO progress_logs (client_id, date, weight, body_fat, bmi, notes) VALUES (?, ?, ?, ?, ?, ?)`, [c1Id, '2026-05-01', 85.0, 22.0, 26.2, 'Starting weight assessment.']);
      await dbRun(`INSERT INTO progress_logs (client_id, date, weight, body_fat, bmi, notes) VALUES (?, ?, ?, ?, ?, ?)`, [c1Id, '2026-05-15', 84.2, 21.2, 26.0, 'Protein target hit.']);
      await dbRun(`INSERT INTO progress_logs (client_id, date, weight, body_fat, bmi, notes) VALUES (?, ?, ?, ?, ?, ?)`, [c2Id, '2026-05-15', 70.0, 30.0, 25.7, 'First evaluation session.']);

      // Seed Sessions
      await dbRun(`INSERT INTO sessions (client_id, day_of_week, session_time, notes) VALUES (?, ?, ?, ?)`, [c1Id, 1, '08:30', 'Leg Day focus']);
      await dbRun(`INSERT INTO sessions (client_id, day_of_week, session_time, notes) VALUES (?, ?, ?, ?)`, [c2Id, 1, '10:00', 'Core circuit']);

      console.log("PostgreSQL database seeded successfully!");
    }

    // Run table migrations to add body composition, package details, and rescheduling audits
    try {
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS visceral_fat REAL DEFAULT 0.0");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS muscle_mass REAL DEFAULT 0.0");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS water_level REAL DEFAULT 0.0");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS package_type VARCHAR(50)");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.0");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS start_date VARCHAR(50)");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS end_date VARCHAR(50)");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_days VARCHAR(100)");
      await dbRun("ALTER TABLE clients ADD COLUMN IF NOT EXISTS preferred_time VARCHAR(50)");
      
      // Update sessions table
      await dbRun("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_date VARCHAR(50)");
      await dbRun("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'upcoming'");
      await dbRun("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS original_date VARCHAR(50)");
    } catch (migErr) {
      console.log("Database migrations check warning:", migErr.message);
    }
  } catch (err) {
    console.error("PostgreSQL database initialization error:", err.message);
  }
})();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Public static files (unauthenticated)
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/login.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.js'));
});
app.get('/style.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'style.css'));
});

// Auth API endpoints (Multi-Trainer login & signup)
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const trainer = await dbGet("SELECT * FROM trainers WHERE username = ? AND password_hash = ?", [username, hashedPassword]);
    if (trainer) {
      res.cookie('trainer_session', trainer.id.toString(), { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 }); // 30 days
      return res.json({ success: true });
    }
    // Fallback for default config if trainers are not present
    const trainersCount = await dbGet("SELECT COUNT(*) as count FROM trainers");
    if (trainersCount && parseInt(trainersCount.count) === 0 && password === SECRET_PASSWORD && username === 'trainer123') {
      const defaultHash = crypto.createHash('sha256').update(SECRET_PASSWORD).digest('hex');
      const defaultTrainer = await dbRun("INSERT INTO trainers (username, password_hash, fullname) VALUES (?, ?, ?)", ['trainer123', defaultHash, 'Coach Manoj']);
      res.cookie('trainer_session', defaultTrainer.lastID.toString(), { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
      return res.json({ success: true });
    }
    return res.status(401).json({ success: false, message: 'Invalid username or password.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/register', async (req, res) => {
  const { fullname, username, password } = req.body;
  try {
    const existing = await dbGet("SELECT id FROM trainers WHERE username = ?", [username]);
    if (existing) {
      return res.status(400).json({ success: false, message: 'Username is already taken.' });
    }
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    const result = await dbRun(
      "INSERT INTO trainers (fullname, username, password_hash) VALUES (?, ?, ?)",
      [fullname, username, hashedPassword]
    );
    res.cookie('trainer_session', result.lastID.toString(), { httpOnly: true, maxAge: 30 * 24 * 60 * 60 * 1000 });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('trainer_session');
  res.json({ success: true });
});

// Auth Middleware (Retrieves active Trainer ID)
const requireAuth = (req, res, next) => {
  if (req.cookies.trainer_session) {
    req.trainerId = parseInt(req.cookies.trainer_session);
    if (!isNaN(req.trainerId)) {
      return next();
    }
  }
  if (req.path.startsWith('/api/')) {
    res.status(401).json({ error: 'Unauthorized' });
  } else {
    res.redirect('/login.html');
  }
};

app.use(requireAuth);

// Secure uploads path and static files
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, 'public')));

// Fetch Trainer Profile details
app.get('/api/profile', async (req, res) => {
  try {
    const trainer = await dbGet("SELECT id, username, fullname FROM trainers WHERE id = ?", [req.trainerId]);
    if (!trainer) return res.status(404).json({ error: "Trainer profile not found" });
    res.json(trainer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to index.html for SPA router
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- API ROUTES (Trainer isolated filter) ---

// 1. Dashboard Stats
app.get('/api/dashboard-stats', async (req, res) => {
  try {
    const totalClients = await dbGet('SELECT COUNT(*) as count FROM clients WHERE trainer_id = ?', [req.trainerId]);
    const activeClients = await dbGet("SELECT COUNT(*) as count FROM clients WHERE status = 'active' AND trainer_id = ?", [req.trainerId]);
    
    // Quick summary: Clients gaining weight vs losing weight in their last 2 logs
    const clients = await dbAll("SELECT id, name, fitness_goal FROM clients WHERE trainer_id = ?", [req.trainerId]);
    let losingWeight = 0;
    let gainingWeight = 0;
    let maintaining = 0;

    for (const client of clients) {
      const logs = await dbAll("SELECT weight FROM progress_logs WHERE client_id = ? ORDER BY date DESC LIMIT 2", [client.id]);
      if (logs.length >= 2) {
        const diff = logs[0].weight - logs[1].weight;
        if (diff < -0.1) losingWeight++;
        else if (diff > 0.1) gainingWeight++;
        else maintaining++;
      }
    }

    // Inactive alerts: active clients with no progress logged or session in the last 7 days
    const activeClientList = await dbAll("SELECT id, name, phone, email, join_date FROM clients WHERE status = 'active' AND trainer_id = ?", [req.trainerId]);
    const inactiveAlerts = [];
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    for (const client of activeClientList) {
      const lastProgress = await dbGet("SELECT MAX(date) as last_date FROM progress_logs WHERE client_id = ?", [client.id]);
      const lastProgressDate = lastProgress ? lastProgress.last_date : null;
      const latestInteraction = lastProgressDate || client.join_date;

      if (latestInteraction && latestInteraction < sevenDaysAgo) {
        inactiveAlerts.push({
          id: client.id,
          name: client.name,
          last_interaction: latestInteraction,
          days_inactive: Math.floor((now - new Date(latestInteraction)) / (1000 * 60 * 60 * 24))
        });
      }
    }

    // Fetch goals distribution
    const goalWeightLoss = (await dbGet("SELECT COUNT(*) as count FROM clients WHERE fitness_goal = 'Weight Loss' AND trainer_id = ?", [req.trainerId])).count;
    const goalWeightGain = (await dbGet("SELECT COUNT(*) as count FROM clients WHERE fitness_goal = 'Weight Gain' AND trainer_id = ?", [req.trainerId])).count;
    const goalMuscleGain = (await dbGet("SELECT COUNT(*) as count FROM clients WHERE fitness_goal = 'Muscle Gain' AND trainer_id = ?", [req.trainerId])).count;
    const goalMaintenance = (await dbGet("SELECT COUNT(*) as count FROM clients WHERE fitness_goal = 'Maintenance' AND trainer_id = ?", [req.trainerId])).count;

    res.json({
      stats: {
        total: parseInt(totalClients.count || 0),
        active: parseInt(activeClients.count || 0),
        weightLossCount: losingWeight
      },
      goals: {
        weightLoss: parseInt(goalWeightLoss || 0),
        weightGain: parseInt(goalWeightGain || 0),
        muscleGain: parseInt(goalMuscleGain || 0),
        maintenance: parseInt(goalMaintenance || 0)
      },
      inactiveAlerts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Client Management CRUD
app.get('/api/clients', async (req, res) => {
  try {
    const clients = await dbAll("SELECT * FROM clients WHERE trainer_id = ? ORDER BY name ASC", [req.trainerId]);
    res.json(clients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id', async (req, res) => {
  try {
    const client = await dbGet("SELECT * FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!client) return res.status(404).json({ error: "Client not found or unauthorized access" });
    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Smart scheduling auto-generation engine helper
const generateClientSessions = async (client_id, start_date, end_date, preferred_time, preferred_days, package_type) => {
  try {
    // Delete existing upcoming sessions to prevent overrides
    await dbRun("DELETE FROM sessions WHERE client_id = ? AND session_date >= ? AND status = 'upcoming'", [client_id, start_date]);

    let sessionsCount = 12; // Default Silver alternate
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
      const currentDayNum = jsDay === 0 ? 7 : jsDay;

      if (daysAllowed.includes(currentDayNum)) {
        const formattedDate = currentDate.toISOString().split('T')[0];
        generated.push({
          client_id,
          session_date: formattedDate,
          session_time: preferred_time || '07:00',
          status: 'upcoming',
          notes: `${package_type} Package Workout`
        });
        scheduledCount++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    for (const session of generated) {
      const sDay = new Date(session.session_date).getDay();
      const legacyDay = sDay === 0 ? 7 : sDay;

      await dbRun(
        `INSERT INTO sessions (client_id, day_of_week, session_time, notes, session_date, status) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [session.client_id, legacyDay, session.session_time, session.notes, session.session_date, session.status]
      );
    }
    return scheduledCount;
  } catch (genErr) {
    console.error("Auto-scheduling generator warning:", genErr.message);
  }
};

app.post('/api/clients', async (req, res) => {
  try {
    const { 
      name, age, gender, height, weight, body_fat, medical_conditions, fitness_goal, phone, email, join_date, status,
      bmi, visceral_fat, muscle_mass, water_level, package_type, amount_paid, start_date, end_date, preferred_days, preferred_time
    } = req.body;

    const heightInMeters = parseFloat(height) / 100;
    const computedBmi = bmi ? parseFloat(bmi) : (parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(1);

    const result = await dbRun(
      `INSERT INTO clients (
        name, age, gender, height, weight, body_fat, bmi, medical_conditions, fitness_goal, phone, email, status, join_date, trainer_id,
        visceral_fat, muscle_mass, water_level, package_type, amount_paid, start_date, end_date, preferred_days, preferred_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, parseInt(age), gender, parseFloat(height), parseFloat(weight), parseFloat(body_fat), parseFloat(computedBmi), 
        medical_conditions, fitness_goal, phone, email, status || 'active', join_date, req.trainerId,
        parseFloat(visceral_fat || 0), parseFloat(muscle_mass || 0), parseFloat(water_level || 0),
        package_type || null, amount_paid ? parseFloat(amount_paid) : 0, 
        start_date || null, end_date || null, preferred_days || null, preferred_time || null
      ]
    );

    const newClientId = result.lastID;

    // Initial progress log entry
    await dbRun(
      `INSERT INTO progress_logs (client_id, date, weight, body_fat, bmi, visceral_fat, muscle_mass, water_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [newClientId, join_date, parseFloat(weight), parseFloat(body_fat), parseFloat(computedBmi), parseFloat(visceral_fat || 0), parseFloat(muscle_mass || 0), parseFloat(water_level || 0), 'Initial evaluation logs.']
    );

    // Auto-generate scheduling sessions
    if (package_type && start_date && end_date) {
      await generateClientSessions(newClientId, start_date, end_date, preferred_time, preferred_days, package_type);
    }

    res.status(201).json({ id: newClientId, bmi: computedBmi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    const { 
      name, age, gender, height, weight, body_fat, medical_conditions, fitness_goal, phone, email, status, join_date,
      bmi, visceral_fat, muscle_mass, water_level, package_type, amount_paid, start_date, end_date, preferred_days, preferred_time
    } = req.body;

    const heightInMeters = parseFloat(height) / 100;
    const computedBmi = bmi ? parseFloat(bmi) : (parseFloat(weight) / (heightInMeters * heightInMeters)).toFixed(1);

    await dbRun(
      `UPDATE clients SET 
        name = ?, age = ?, gender = ?, height = ?, weight = ?, body_fat = ?, bmi = ?, medical_conditions = ?, fitness_goal = ?, phone = ?, email = ?, status = ?, join_date = ?,
        visceral_fat = ?, muscle_mass = ?, water_level = ?, package_type = ?, amount_paid = ?, start_date = ?, end_date = ?, preferred_days = ?, preferred_time = ?
       WHERE id = ? AND trainer_id = ?`,
      [
        name, parseInt(age), gender, parseFloat(height), parseFloat(weight), parseFloat(body_fat), parseFloat(computedBmi), 
        medical_conditions, fitness_goal, phone, email, status, join_date,
        parseFloat(visceral_fat || 0), parseFloat(muscle_mass || 0), parseFloat(water_level || 0),
        package_type || null, amount_paid ? parseFloat(amount_paid) : 0, 
        start_date || null, end_date || null, preferred_days || null, preferred_time || null,
        req.params.id, req.trainerId
      ]
    );

    // Sync metric to progress logs
    await dbRun(
      `INSERT INTO progress_logs (client_id, date, weight, body_fat, bmi, visceral_fat, muscle_mass, water_level, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.params.id, join_date, parseFloat(weight), parseFloat(body_fat), parseFloat(computedBmi), parseFloat(visceral_fat || 0), parseFloat(muscle_mass || 0), parseFloat(water_level || 0), 'Profile metric sync update.']
    );

    // Re-trigger schedule updates
    if (package_type && start_date && end_date) {
      await generateClientSessions(req.params.id, start_date, end_date, preferred_time, preferred_days, package_type);
    }

    res.json({ success: true, bmi: computedBmi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    const reports = await dbAll("SELECT file_path FROM reports WHERE client_id = ?", [req.params.id]);
    for (const report of reports) {
      const fullPath = path.join(__dirname, report.file_path);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
    
    await dbRun("DELETE FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Progress Logs API
app.get('/api/clients/:id/progress', async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    const logs = await dbAll("SELECT * FROM progress_logs WHERE client_id = ? ORDER BY date DESC", [req.params.id]);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:id/progress', async (req, res) => {
  try {
    const client = await dbGet("SELECT height FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!client) return res.status(404).json({ error: "Client not found or unauthorized" });

    const { date, weight, body_fat, notes } = req.body;
    const heightInMeters = client.height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

    await dbRun(
      `INSERT INTO progress_logs (client_id, date, weight, body_fat, bmi, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [req.params.id, date, parseFloat(weight), parseFloat(body_fat), parseFloat(bmi), notes]
    );

    await dbRun(
      `UPDATE clients SET weight = ?, body_fat = ?, bmi = ? WHERE id = ? AND trainer_id = ?`,
      [parseFloat(weight), parseFloat(body_fat), parseFloat(bmi), req.params.id, req.trainerId]
    );

    res.status(201).json({ success: true, bmi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/progress/:id', async (req, res) => {
  try {
    const log = await dbGet("SELECT client_id FROM progress_logs WHERE id = ?", [req.params.id]);
    if (!log) return res.status(404).json({ error: "Log not found" });

    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [log.client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized" });

    await dbRun("DELETE FROM progress_logs WHERE id = ?", [req.params.id]);
    
    // Sync client's current metrics to the remaining latest log
    const latestLog = await dbGet("SELECT weight, body_fat, bmi FROM progress_logs WHERE client_id = ? ORDER BY date DESC LIMIT 1", [log.client_id]);
    if (latestLog) {
      await dbRun(
        `UPDATE clients SET weight = ?, body_fat = ?, bmi = ? WHERE id = ? AND trainer_id = ?`,
        [latestLog.weight, latestLog.body_fat, latestLog.bmi, log.client_id, req.trainerId]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Reports Upload API
app.get('/api/clients/:id/reports', async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    const reports = await dbAll("SELECT * FROM reports WHERE client_id = ? ORDER BY upload_date DESC", [req.params.id]);
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/clients/:id/reports', upload.single('report'), async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const relativePath = 'uploads/' + req.file.filename;
    const result = await dbRun(
      `INSERT INTO reports (client_id, file_name, file_path, upload_date) VALUES (?, ?, ?, ?)`,
      [req.params.id, req.file.originalname, relativePath, new Date().toISOString().split('T')[0]]
    );

    res.status(201).json({ id: result.lastID, file_name: req.file.originalname, file_path: relativePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reports/:id', async (req, res) => {
  try {
    const report = await dbGet("SELECT client_id, file_path FROM reports WHERE id = ?", [req.params.id]);
    if (!report) return res.status(404).json({ error: "Report not found" });

    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [report.client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized" });

    const fullPath = path.join(__dirname, report.file_path);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    await dbRun("DELETE FROM reports WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Schedule Sessions API
app.get('/api/schedule', async (req, res) => {
  try {
    const sessions = await dbAll(
      `SELECT s.*, c.name as client_name 
       FROM sessions s 
       JOIN clients c ON s.client_id = c.id 
       WHERE c.trainer_id = ?
       ORDER BY s.session_date ASC, s.day_of_week ASC, s.session_time ASC`,
      [req.trainerId]
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedule', async (req, res) => {
  try {
    const { client_id, day_of_week, session_time, notes, session_date } = req.body;
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized client booking" });

    // Fallback date calculations if session_date not sent
    let sDate = session_date;
    if (!sDate) {
      sDate = new Date().toISOString().split('T')[0];
    }

    const result = await dbRun(
      `INSERT INTO sessions (client_id, day_of_week, session_time, notes, session_date, status) VALUES (?, ?, ?, ?, ?, 'upcoming')`,
      [client_id, parseInt(day_of_week), session_time, notes, sDate]
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedule/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const session = await dbGet("SELECT client_id FROM sessions WHERE id = ?", [req.params.id]);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [session.client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized access" });

    await dbRun("UPDATE sessions SET status = ? WHERE id = ?", [status, req.params.id]);
    res.json({ success: true, status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/schedule/:id/reschedule', async (req, res) => {
  try {
    const { session_date, session_time, notes } = req.body;
    const session = await dbGet("SELECT * FROM sessions WHERE id = ?", [req.params.id]);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [session.client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized access" });

    const originalDate = session.original_date || session.session_date || '';

    const sDay = new Date(session_date).getDay();
    const legacyDay = sDay === 0 ? 7 : sDay;

    await dbRun(
      `UPDATE sessions SET session_date = ?, session_time = ?, day_of_week = ?, original_date = ?, status = 'rescheduled', notes = COALESCE(?, notes)
       WHERE id = ?`,
      [session_date, session_time, legacyDay, originalDate, notes || null, req.params.id]
    );

    res.json({ success: true, session_date, session_time, original_date: originalDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id/sessions', async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    const sessions = await dbAll(
      `SELECT * FROM sessions WHERE client_id = ? ORDER BY session_date ASC, day_of_week ASC, session_time ASC`,
      [req.params.id]
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/schedule/:id', async (req, res) => {
  try {
    const session = await dbGet("SELECT client_id FROM sessions WHERE id = ?", [req.params.id]);
    if (!session) return res.status(404).json({ error: "Session not found" });

    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [session.client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized access" });

    await dbRun("DELETE FROM sessions WHERE id = ?", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Messaging API
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await dbAll(
      `SELECT m.*, c.name as client_name 
       FROM messages m 
       JOIN clients c ON m.client_id = c.id 
       WHERE c.trainer_id = ?
       ORDER BY m.sent_date DESC`,
      [req.trainerId]
    );
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { client_id, message_text, template_type } = req.body;
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized client message log" });

    const result = await dbRun(
      `INSERT INTO messages (client_id, message_text, sent_date, template_type) VALUES (?, ?, ?, ?)`,
      [client_id, message_text, new Date().toISOString(), template_type || 'Custom']
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Gym Trainer Server (PostgreSQL) is running on port ${PORT}`);
});
