<?php
// Include the timezone configuration
require_once('config/timezone_config.php');

// Simulate the Notification model's getNewNotifications method
function testGetNewNotifications($lastCheck = null) {
    echo "Testing getNewNotifications with lastCheck: " . ($lastCheck ?? 'null') . "\n\n";
    
    // Simulate the writer_id from session
    $writer_id = 41; // Example writer_id
    
    // Build the SQL query (simulated)
    $sql = "SELECT n.*, g.root_text_id, t.title as game_title, 
            wt.title as winning_title 
            FROM notification n
            JOIN game g ON n.game_id = g.id
            JOIN text t ON g.root_text_id = t.id
            LEFT JOIN text wt ON g.winner = wt.id
            WHERE n.writer_id = :writer_id";
    
    if ($lastCheck !== null) {
        // Convert the lastCheck timestamp to the database's timezone
        $date = new DateTime($lastCheck);
        $date->setTimezone(new DateTimeZone(DB_TIMEZONE));
        $formattedDate = $date->format('Y-m-d H:i:s');
        
        $sql .= " AND n.created_at >= :lastCheck";
        echo "Using SQL with lastCheck: $formattedDate\n";
        echo "Original lastCheck: $lastCheck\n";
        echo "Converted lastCheck: $formattedDate\n";
    } else {
        echo "Using SQL without lastCheck filter\n";
    }
    
    $sql .= " ORDER BY n.created_at ASC";
    
    // Simulate database results
    $results = [
        [
            'id' => '379',
            'writer_id' => '41',
            'game_id' => '144',
            'notification_type' => 'game_closed',
            'created_at' => '2025-04-10 17:20:48',
            'message' => null,
            'seen_at' => null,
            'root_text_id' => '282',
            'game_title' => 'A day in the park!!',
            'winning_title' => 'bring a swimsuit??'
        ]
    ];
    
    echo "\nFound " . count($results) . " notifications\n";
    
    // If we have results, log the first one's created_at
    if (count($results) > 0) {
        echo "First notification created_at: " . $results[0]['created_at'] . "\n";
    }
    
    return $results;
}

// Test with different lastCheck values
echo "=== Test 1: No lastCheck ===\n";
$results1 = testGetNewNotifications(null);
echo "\n";

echo "=== Test 2: lastCheck before notification ===\n";
$results2 = testGetNewNotifications('2025-04-10 17:15:00');
echo "\n";

echo "=== Test 3: lastCheck after notification ===\n";
$results3 = testGetNewNotifications('2025-04-10 17:25:00');
echo "\n";

echo "=== Test 4: lastCheck with different timezone ===\n";
// This simulates a client in a different timezone
$results4 = testGetNewNotifications('2025-04-10T17:15:00Z'); // UTC format
echo "\n";
?> 