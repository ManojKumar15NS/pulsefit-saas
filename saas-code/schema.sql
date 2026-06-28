-- PulseFit PostgreSQL Database Schema & Migrations
-- Version: 2.1 (Conolidated Features)

-- 1. Trainers Table
CREATE TABLE IF NOT EXISTS trainers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fullname VARCHAR(150) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Packages Table
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- 'Silver', 'Gold', 'Platinum'
    duration_months INTEGER NOT NULL DEFAULT 1,
    sessions_per_week INTEGER NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clients Table (With Manual BMI, Body Composition, and Preference Settings)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(50) NOT NULL,
    height REAL NOT NULL, -- In cm
    weight REAL NOT NULL, -- In kg
    bmi REAL NOT NULL, -- Manual input
    water_level REAL NOT NULL DEFAULT 0.0,
    visceral_fat REAL NOT NULL DEFAULT 0.0,
    muscle_mass REAL NOT NULL DEFAULT 0.0,
    body_fat_pct REAL NOT NULL DEFAULT 0.0,
    target_weight REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- Package Fields
    package_type VARCHAR(50), -- 'Silver', 'Gold', 'Platinum'
    amount_paid DECIMAL(10, 2) DEFAULT 0.00,
    start_date DATE,
    end_date DATE,
    
    -- Schedule preferences
    preferred_days VARCHAR(100), -- Comma-separated indices: '1,3,5'
    preferred_time TIME,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Sessions Table (Reschedule audits)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'attended', 'missed', 'rescheduled'
    original_date DATE, -- Stripped for strikethrough display reference
    rescheduled_date DATE,
    rescheduled_time TIME,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Progress Logs Table
CREATE TABLE IF NOT EXISTS progress_logs (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    weight REAL NOT NULL,
    body_fat_pct REAL NOT NULL,
    muscle_mass REAL NOT NULL,
    visceral_fat REAL NOT NULL,
    water_level REAL NOT NULL,
    bmi REAL NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Database Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON sessions(client_id, session_date);
CREATE INDEX IF NOT EXISTS idx_clients_package ON clients(package_type);
