<?php
/**
 * API endpoint to retrieve measurements from database
 * Returns data in JSON format
 * 
 * Usage: 
 * - Get latest data: api.php
 * - Get specific number of records: api.php?limit=50
 * - Get data from specific date: api.php?from=2024-01-01
 */

require_once 'config.php';

// Set headers for JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Prevent caching - always fetch fresh data
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Pragma: no-cache');
header('Expires: 0');

try {
    // Get database connection
    $pdo = getDbConnection();
    
    // Get parameters
    $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 100;
    $from = isset($_GET['from']) ? $_GET['from'] : null;
    
    // Validate limit
    if ($limit < 1 || $limit > 500) {
        $limit = 100;
    }
    
    // Build query
    $sql = "SELECT 
                date_time,
                water_level,
                flow_rate,
                temperature
            FROM measurements
            WHERE 1=1";
    
    $params = [];
    
    if ($from) {
        $sql .= " AND date_time >= :from";
        $params[':from'] = $from;
    }
    
    $sql .= " ORDER BY date_time DESC LIMIT :limit";
    
    $stmt = $pdo->prepare($sql);
    
    // Bind limit separately with correct type
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    
    // Bind other parameters
    foreach ($params as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    
    $stmt->execute();
    $measurements = $stmt->fetchAll();
    
    // Format the data
    $formattedData = [];
    foreach ($measurements as $row) {
        // Format datetime to Czech format for frontend
        $dateTime = new DateTime($row['date_time']);
        $formattedDateTime = $dateTime->format('d.m.Y H:i');
        
        $formattedData[] = [
            'dateTime' => $formattedDateTime,
            'level' => $row['water_level'] !== null ? number_format($row['water_level'], 0, ',', '') : '-',
            'flow' => $row['flow_rate'] !== null ? number_format($row['flow_rate'], 2, ',', '') : '-',
            // Use dot for decimal separator for JavaScript parseFloat
            'temperature' => $row['temperature'] !== null ? number_format($row['temperature'], 1, '.', '') : '-'
        ];
    }
    
    // Get latest fetch log
    $logStmt = $pdo->query("SELECT fetch_time, status, records_inserted FROM fetch_log ORDER BY fetch_time DESC LIMIT 1");
    $lastFetch = $logStmt->fetch();
    
    // Return response
    echo json_encode([
        'success' => true,
        'count' => count($formattedData),
        'data' => $formattedData,
        'lastFetch' => $lastFetch ? [
            'time' => $lastFetch['fetch_time'],
            'status' => $lastFetch['status'],
            'records' => $lastFetch['records_inserted']
        ] : null,
        'timestamp' => date('Y-m-d H:i:s')
    ], JSON_UNESCAPED_UNICODE);
    
} catch (PDOException $e) {
    error_log("API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Database error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    error_log("API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server error',
        'message' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
