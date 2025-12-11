-- Database setup for Teplota Labe project
-- This script creates the necessary tables for storing water temperature and measurement data

-- Create database (optional, comment out if database already exists)
CREATE DATABASE IF NOT EXISTS teplota_labe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE teplota_labe;

-- Table for storing measurements
-- Stores all measurements from ČHMÚ including temperature, water level, and flow rate
CREATE TABLE IF NOT EXISTS measurements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date_time DATETIME NOT NULL,
    water_level DECIMAL(10, 2) NULL COMMENT 'Water level in cm',
    flow_rate DECIMAL(10, 2) NULL COMMENT 'Flow rate in m³/s',
    temperature DECIMAL(5, 2) NULL COMMENT 'Water temperature in °C',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_date_time (date_time DESC),
    INDEX idx_temperature (temperature),
    UNIQUE KEY unique_measurement (date_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for logging fetch operations
-- Tracks when data was fetched and if there were any errors
CREATE TABLE IF NOT EXISTS fetch_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fetch_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('success', 'error') NOT NULL,
    records_inserted INT DEFAULT 0,
    error_message TEXT NULL,
    INDEX idx_fetch_time (fetch_time DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Create a view for latest measurements (last 48 hours)
CREATE OR REPLACE VIEW latest_measurements AS
SELECT 
    id,
    date_time,
    water_level,
    flow_rate,
    temperature,
    created_at
FROM measurements
WHERE date_time >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
ORDER BY date_time DESC;
