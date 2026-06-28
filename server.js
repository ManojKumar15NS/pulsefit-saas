const express = require('express');
const sqlite3 = require('sqlite3').verbose();
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

// Database initialization (Auto-detect Glitch persistent .data directory)
const dbFolder = process.env.PROJECT_DOMAIN ? path.join(__dirname, '.data') : __dirname;
if (process.env.PROJECT_DOMAIN && !fs.existsSync(dbFolder)) {
  fs.mkdirSync(dbFolder, { recursive: true });
}
const dbPath = path.join(dbFolder, 'gym_tracker.db');
const db = new sqlite3.Database(dbPath);

// Promisified database helpers
const dbRun = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (query, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

// Database schema setup
db.serialize(async () => {
  db.run('PRAGMA foreign_keys = ON');

  // Trainers Table
  db.run(`CREATE TABLE IF NOT EXISTS trainers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    fullname TEXT NOT NULL
  )`);

  // Clients Table (Updated with trainer_id FK)
  db.run(`CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT NOT NULL,
    height REAL NOT NULL,
    weight REAL NOT NULL,
    body_fat REAL NOT NULL,
    bmi REAL NOT NULL,
    medical_conditions TEXT,
    fitness_goal TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    join_date TEXT NOT NULL,
    trainer_id INTEGER REFERENCES trainers(id) ON DELETE CASCADE
  )`);

  // Progress Logs Table
  db.run(`CREATE TABLE IF NOT EXISTS progress_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    date TEXT NOT NULL,
    weight REAL NOT NULL,
    body_fat REAL NOT NULL,
    bmi REAL NOT NULL,
    notes TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  // Reports Table
  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    upload_date TEXT NOT NULL,
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  // Sessions Table
  db.run(`CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    day_of_week INTEGER NOT NULL,
    session_time TEXT NOT NULL,
    notes TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  // Messages Table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER,
    message_text TEXT NOT NULL,
    sent_date TEXT NOT NULL,
    template_type TEXT,
    FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
  )`);

  // Dynamic Column Migration Helper
  db.all("PRAGMA table_info(clients)", (err, columns) => {
    if (!err && columns.length > 0) {
      const hasTrainerId = columns.some(col => col.name === 'trainer_id');
      if (!hasTrainerId) {
        db.run("ALTER TABLE clients ADD COLUMN trainer_id INTEGER REFERENCES trainers(id)", (alterErr) => {
          if (!alterErr) {
            console.log("Migration: Added trainer_id column to clients table.");
            // Seed default trainer
            const defaultHash = crypto.createHash('sha256').update(SECRET_PASSWORD).digest('hex');
            db.run("INSERT OR IGNORE INTO trainers (id, username, password_hash, fullname) VALUES (?, ?, ?, ?)", [1, 'trainer123', defaultHash, 'Coach Manoj'], (insErr) => {
              if (!insErr) {
                db.run("UPDATE clients SET trainer_id = 1 WHERE trainer_id IS NULL");
                console.log("Migration: Associated existing clients with default trainer.");
              }
            });
          }
        });
      }
    }
  });

  // Seed default data if database has no trainers
  db.get("SELECT COUNT(*) as count FROM trainers", async (err, row) => {
    if (!err && row.count === 0) {
      console.log("Seeding initial gym database...");
      try {
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

        console.log("Database seeded successfully!");
      } catch (seedErr) {
        console.error("Error seeding database:", seedErr);
      }
    }
  });
});

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
    if (trainersCount.count === 0 && password === SECRET_PASSWORD && username === 'trainer123') {
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
        total: totalClients.count,
        active: activeClients.count,
        weightLossCount: losingWeight
      },
      goals: {
        weightLoss: goalWeightLoss,
        weightGain: goalWeightGain,
        muscleGain: goalMuscleGain,
        maintenance: goalMaintenance
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

app.post('/api/clients', async (req, res) => {
  try {
    const { name, age, gender, height, weight, body_fat, medical_conditions, fitness_goal, phone, email, join_date, status } = req.body;
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

    const result = await dbRun(
      `INSERT INTO clients (name, age, gender, height, weight, body_fat, bmi, medical_conditions, fitness_goal, phone, email, status, join_date, trainer_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, parseInt(age), gender, parseFloat(height), parseFloat(weight), parseFloat(body_fat), parseFloat(bmi), medical_conditions, fitness_goal, phone, email, status || 'active', join_date, req.trainerId]
    );

    // Initial log entry
    await dbRun(
      `INSERT INTO progress_logs (client_id, date, weight, body_fat, bmi, notes) VALUES (?, ?, ?, ?, ?, ?)`,
      [result.lastID, join_date, parseFloat(weight), parseFloat(body_fat), parseFloat(bmi), 'Initial assessment log.']
    );

    res.status(201).json({ id: result.lastID, bmi });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    const { name, age, gender, height, weight, body_fat, medical_conditions, fitness_goal, phone, email, status, join_date } = req.body;
    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

    await dbRun(
      `UPDATE clients SET name = ?, age = ?, gender = ?, height = ?, weight = ?, body_fat = ?, bmi = ?, medical_conditions = ?, fitness_goal = ?, phone = ?, email = ?, status = ?, join_date = ?
       WHERE id = ? AND trainer_id = ?`,
      [name, parseInt(age), gender, parseFloat(height), parseFloat(weight), parseFloat(body_fat), parseFloat(bmi), medical_conditions, fitness_goal, phone, email, status, join_date, req.params.id, req.trainerId]
    );

    res.json({ success: true, bmi });
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
       ORDER BY s.day_of_week ASC, s.session_time ASC`,
      [req.trainerId]
    );
    res.json(sessions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/schedule', async (req, res) => {
  try {
    const { client_id, day_of_week, session_time, notes } = req.body;
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [client_id, req.trainerId]);
    if (!clientExists) return res.status(401).json({ error: "Unauthorized client booking" });

    const result = await dbRun(
      `INSERT INTO sessions (client_id, day_of_week, session_time, notes) VALUES (?, ?, ?, ?)`,
      [client_id, parseInt(day_of_week), session_time, notes]
    );
    res.status(201).json({ id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/clients/:id/sessions', async (req, res) => {
  try {
    const clientExists = await dbGet("SELECT id FROM clients WHERE id = ? AND trainer_id = ?", [req.params.id, req.trainerId]);
    if (!clientExists) return res.status(404).json({ error: "Client not found" });

    const sessions = await dbAll(
      `SELECT * FROM sessions WHERE client_id = ? ORDER BY day_of_week ASC, session_time ASC`,
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
  console.log(`Gym Trainer Server is running on http://localhost:${PORT}`);
});
