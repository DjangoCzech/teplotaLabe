<?php
/**
 * Fetch data from ČHMÚ and store in database
 * This script should be run periodically (e.g., every 30 minutes via cron)
 * 
 * Usage: php fetch_data.php
 * Or call via browser: http://localhost/teplotaLabe/fetch_data.php
 */

require_once 'config.php';

// Set timeout for long-running operations
set_time_limit(300); // 5 minutes max

/**
 * Fetch HTML data from ČHMÚ
 * @return string|false
 */
function fetchFromChmu() {
    $context = stream_context_create([
        'http' => [
            'timeout' => 30,
            'user_agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ]
    ]);
    
    $html = @file_get_contents(DATA_URL, false, $context);
    
    if ($html === false) {
        return false;
    }
    
    return $html;
}

/**
 * Parse HTML and extract measurement data
 * @param string $html
 * @return array
 */
function parseHtml($html) {
    $dom = new DOMDocument();
    @$dom->loadHTML(mb_convert_encoding($html, 'HTML-ENTITIES', 'UTF-8'));
    $xpath = new DOMXPath($dom);
    
    // Find table with class "tborder center_text"
    $tables = $xpath->query("//div[contains(@class, 'tborder') and contains(@class, 'center_text')]//table");
    
    if ($tables->length === 0) {
        return [];
    }
    
    $table = $tables->item(0);
    $rows = $xpath->query(".//tr", $table);
    
    $data = [];
    $debugLog = [
        'fetch_time' => date('Y-m-d H:i:s'),
        'total_rows_found' => $rows->length,
        'rows' => []
    ];
    
    // Skip header row (first row)
    for ($i = 1; $i < $rows->length; $i++) {
        $row = $rows->item($i);
        $cells = $xpath->query(".//td", $row);
        
        $rowLog = [
            'row_number' => $i,
            'cells_count' => $cells->length
        ];
        
        if ($cells->length >= 4) {
            $dateTime = trim($cells->item(0)->textContent);
            $level = trim($cells->item(1)->textContent);
            $flow = trim($cells->item(2)->textContent);
            $temp = trim($cells->item(3)->textContent);
            
            $rowLog['raw_data'] = [
                'dateTime' => $dateTime,
                'level' => $level,
                'flow' => $flow,
                'temperature' => $temp
            ];
            
            // Skip empty or header rows
            if (empty($dateTime) || stripos($dateTime, 'Datum') !== false) {
                $rowLog['status'] = 'SKIPPED';
                $rowLog['reason'] = 'header or empty row';
                $debugLog['rows'][] = $rowLog;
                continue;
            }
            
            // Convert Czech date format to MySQL datetime
            $parsedDateTime = parseDateTime($dateTime);
            $parsedLevel = parseValue($level);
            $parsedFlow = parseValue($flow);
            $parsedTemp = parseValue($temp);
            
            $rowLog['parsed_data'] = [
                'dateTime' => $parsedDateTime,
                'level' => $parsedLevel,
                'flow' => $parsedFlow,
                'temperature' => $parsedTemp
            ];
            
            if ($parsedDateTime) {
                $data[] = [
                    'date_time' => $parsedDateTime,
                    'water_level' => $parsedLevel,
                    'flow_rate' => $parsedFlow,
                    'temperature' => $parsedTemp
                ];
                $rowLog['status'] = 'ADDED';
            } else {
                $rowLog['status'] = 'SKIPPED';
                $rowLog['reason'] = 'failed to parse datetime';
            }
        } else {
            $rowLog['status'] = 'SKIPPED';
            $rowLog['reason'] = 'insufficient cells (expected 4+)';
        }
        
        $debugLog['rows'][] = $rowLog;
    }
    
    $debugLog['total_processed'] = count($data);
    
    // If 'debug' parameter is present, show debug info as JSON
    if (isset($_GET['debug'])) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($debugLog, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    return $data;
}

/**
 * Parse Czech datetime format to MySQL format
 * @param string $dateTime
 * @return string|null
 */
function parseDateTime($dateTime) {
    // Try format: DD.MM.YYYY HH:MM
    if (preg_match('/(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/', $dateTime, $matches)) {
        return sprintf('%s-%s-%s %s:%s:00', $matches[3], $matches[2], $matches[1], $matches[4], $matches[5]);
    }
    return null;
}

/**
 * Parse numeric value (handle dash/empty as null)
 * @param string $value
 * @return float|null
 */
function parseValue($value) {
    $value = trim($value);
    if (empty($value) || $value === '-') {
        return null;
    }
    
    // Replace comma with dot for decimal
    $value = str_replace(',', '.', $value);
    
    if (is_numeric($value)) {
        return (float)$value;
    }
    
    return null;
}

/**
 * Get the latest date_time from database
 * @param PDO $pdo
 * @return string|null
 */
function getLatestDateTime($pdo) {
    try {
        $stmt = $pdo->query("SELECT MAX(date_time) as latest FROM measurements");
        $result = $stmt->fetch();
        return $result['latest'];
    } catch (PDOException $e) {
        error_log("Error getting latest date_time: " . $e->getMessage());
        return null;
    }
}

/**
 * Store data in database (only new records)
 * @param PDO $pdo
 * @param array $data
 * @param string|null $latestDateTime Only insert records newer than this
 * @return int Number of records inserted
 */
function storeData($pdo, $data, $latestDateTime = null) {
    $insertedCount = 0;
    
    // Filter data - only records newer than latest in DB
    $dataToInsert = [];
    foreach ($data as $row) {
        // If we have latest datetime, only add newer records
        if ($latestDateTime === null || $row['date_time'] > $latestDateTime) {
            $dataToInsert[] = $row;
        }
    }
    
    echo "Records in DB: " . ($latestDateTime ? "latest is $latestDateTime" : "empty") . "\n";
    echo "New records to insert: " . count($dataToInsert) . "\n";
    
    if (empty($dataToInsert)) {
        echo "No new records to insert\n";
        return 0;
    }
    
    $stmt = $pdo->prepare("
        INSERT INTO measurements (date_time, water_level, flow_rate, temperature)
        VALUES (:date_time, :water_level, :flow_rate, :temperature)
        ON DUPLICATE KEY UPDATE
            water_level = VALUES(water_level),
            flow_rate = VALUES(flow_rate),
            temperature = VALUES(temperature)
    ");
    
    foreach ($dataToInsert as $row) {
        try {
            $stmt->execute([
                ':date_time' => $row['date_time'],
                ':water_level' => $row['water_level'],
                ':flow_rate' => $row['flow_rate'],
                ':temperature' => $row['temperature']
            ]);
            
            if ($stmt->rowCount() > 0) {
                $insertedCount++;
                echo "Inserted: {$row['date_time']}\n";
            }
        } catch (PDOException $e) {
            error_log("Error inserting record: " . $e->getMessage());
        }
    }
    
    return $insertedCount;
}

/**
 * Log fetch operation
 * @param PDO $pdo
 * @param string $status
 * @param int $recordsInserted
 * @param string|null $errorMessage
 */
function logFetch($pdo, $status, $recordsInserted = 0, $errorMessage = null) {
    try {
        $stmt = $pdo->prepare("
            INSERT INTO fetch_log (status, records_inserted, error_message)
            VALUES (:status, :records_inserted, :error_message)
        ");
        
        $stmt->execute([
            ':status' => $status,
            ':records_inserted' => $recordsInserted,
            ':error_message' => $errorMessage
        ]);
    } catch (PDOException $e) {
        error_log("Error logging fetch: " . $e->getMessage());
    }
}

/**
 * Clean old data (keep only last 7 days)
 * @param PDO $pdo
 */
function cleanOldData($pdo) {
    try {
        $stmt = $pdo->prepare("DELETE FROM measurements WHERE date_time < DATE_SUB(NOW(), INTERVAL 7 DAY)");
        $stmt->execute();
        $deletedCount = $stmt->rowCount();
        
        if ($deletedCount > 0) {
            echo "Cleaned $deletedCount old records\n";
        }
    } catch (PDOException $e) {
        error_log("Error cleaning old data: " . $e->getMessage());
    }
}

// Main execution
try {
    echo "=== Starting data fetch at " . date('Y-m-d H:i:s') . " ===\n";
    
    // Get database connection
    $pdo = getDbConnection();
    echo "Database connected\n";
    
    // Fetch data from ČHMÚ
    echo "Fetching data from ČHMÚ...\n";
    $html = fetchFromChmu();
    
    if ($html === false) {
        throw new Exception("Failed to fetch data from ČHMÚ");
    }
    
    echo "Data fetched, parsing...\n";
    
    // Parse HTML
    $data = parseHtml($html);
    
    if (empty($data)) {
        throw new Exception("No data parsed from HTML");
    }
    
    echo "Parsed " . count($data) . " records\n";
    
    // Get latest date_time from database
    echo "Checking for existing data...\n";
    $latestDateTime = getLatestDateTime($pdo);
    
    // Store in database (only new records)
    echo "Storing in database...\n";
    $insertedCount = storeData($pdo, $data, $latestDateTime);
    echo "Inserted/updated $insertedCount records\n";
    
    // Log success
    logFetch($pdo, 'success', $insertedCount);
    
    // Clean old data
    cleanOldData($pdo);
    
    echo "=== Fetch completed successfully ===\n";
    
    // If called via browser, show JSON response
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'records_parsed' => count($data),
            'records_inserted' => $insertedCount,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
} catch (Exception $e) {
    $errorMsg = $e->getMessage();
    echo "ERROR: $errorMsg\n";
    error_log("Fetch data error: $errorMsg");
    
    try {
        if (isset($pdo)) {
            logFetch($pdo, 'error', 0, $errorMsg);
        }
    } catch (Exception $logError) {
        error_log("Failed to log error: " . $logError->getMessage());
    }
    
    // If called via browser, show JSON error
    if (php_sapi_name() !== 'cli') {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $errorMsg,
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
    
    exit(1);
}
