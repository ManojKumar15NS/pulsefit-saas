-- PulseFit PostgreSQL Database Schema
-- Version: 2.0 (Production Upgraded)

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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
    duration_months INTEGER NOT NULL, -- 1, 3
    sessions_per_week INTEGER NOT NULL, -- Auto-calculated (e.g., 3, 5, 7)
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Clients Table (With Extended Physical Metrics & Subscription Tier bindings)
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    name VARCHAR(150) NOT NULL,
    age INTEGER NOT NULL,
    gender VARCHAR(50) NOT NULL,
    height REAL NOT NULL, -- In cm
    weight REAL NOT NULL, -- In kg
    bmi REAL NOT NULL, -- Body Mass Index
    water_level REAL NOT NULL DEFAULT 0.0, -- In %
    visceral_fat REAL NOT NULL DEFAULT 0.0,
    body_fat_pct REAL NOT NULL DEFAULT 0.0, -- In %
    muscle_mass REAL NOT NULL DEFAULT 0.0, -- In kg
    target_weight REAL NOT NULL DEFAULT 0.0, -- In kg
    notes TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- 'active', 'inactive'
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    package_start_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Progress Logs Table (History tracking)
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

-- 5. Sessions Table (Smart Scheduling with Attendance States)
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    session_time TIME NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- 'upcoming', 'attended', 'missed', 'rescheduled'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default packages
INSERT INTO packages (name, duration_months, sessions_per_week, price) VALUES 
('Silver', 1, 3, 99.00),
('Silver', 3, 3, 249.00),
('Gold', 1, 5, 149.00),
('Gold', 3, 5, 399.00),
('Platinum', 1, 7, 199.00),
('Platinum', 3, 7, 549.00)
ON CONFLICT DO NOTHING;

-- Database Indexing for optimization
CREATE INDEX IF NOT EXISTS idx_clients_trainer ON clients(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_client_date ON sessions(client_id, session_date);
CREATE INDEX IF NOT EXISTS idx_progress_client ON progress_logs(client_id);
