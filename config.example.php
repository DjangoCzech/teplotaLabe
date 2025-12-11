<?php
/**
 * Configuration file EXAMPLE
 * 
 * IMPORTANT: Copy this file to config.php and fill in your actual credentials!
 * The config.php file is in .gitignore and won't be committed to GitHub.
 * 
 * Usage:
 * 1. Copy this file: cp config.example.php config.php
 * 2. Edit config.php with your real database credentials
 * 3. Never commit config.php to GitHub!
 */

// Determine if we're on local or production environment
// You can set this manually or use environment detection
$isLocal = (
    $_SERVER['HTTP_HOST'] === 'localhost' || 
    strpos($_SERVER['HTTP_HOST'], '127.0.0.1') !== false ||
    strpos($_SERVER['HTTP_HOST'], 'localhost:') !== false
);

// Database configuration
if ($isLocal) {
    // Local development settings (XAMPP default)
    define('DB_HOST', 'localhost');
    define('DB_NAME', 'd388414_templ');
    define('DB_USER', 'root');
    define('DB_PASS', '');  // XAMPP default has no password
} else {
    // Production server settings - CHANGE THESE IN config.php!
    define('DB_HOST', 'localhost');  // Usually 'localhost' or specific host
    define('DB_NAME', 'd388414_templ');  // Your database name
    define('DB_USER', 'user');  // Your database username
    define('DB_PASS', 'password');  // Your database password
}

// Charset
define('DB_CHARSET', 'utf8mb4');

// ČHMÚ data source
define('DATA_URL', 'https://hydro.chmi.cz/hppsoldv/hpps_prfdata.php?seq=307338');

// Error reporting
if ($isLocal) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
}

// Timezone
date_default_timezone_set('Europe/Prague');

/**
 * Get database connection
 * @return PDO
 * @throws PDOException
 */
function getDbConnection() {
    try {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        
        return new PDO($dsn, DB_USER, DB_PASS, $options);
    } catch (PDOException $e) {
        error_log("Database connection failed: " . $e->getMessage());
        throw $e;
    }
}
