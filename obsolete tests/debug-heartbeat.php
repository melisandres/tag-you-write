<?php
/**
 * Debug Heartbeat Endpoint
 * 
 * This endpoint manually triggers a heartbeat and Redis publish
 * to help debug why real-time updates aren't working.
 * 
 * Visit: /debug-heartbeat.php?user_id=41
 */

session_start();

// Load necessary files
require_once('library/RequirePage.php');
RequirePage::model('WriterActivity');

if (file_exists('services/RedisManager.php')) {
    require_once('services/RedisManager.php');
}

// Get user ID from URL parameter or session
$userId = $_GET['user_id'] ?? $_SESSION['writer_id'] ?? null;

if (!$userId) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id parameter required or no session']);
    exit;
}

echo "Debug Heartbeat Test\n";
echo "==================\n\n";

// Simulate activity data like CurrentActivityManager would send
$activityData = [
    'writer_id' => $userId,
    'activity_type' => 'browsing',
    'activity_level' => 'active', 
    'page_type' => 'game_list',
    'game_id' => null,
    'text_id' => null,
    'parent_id' => null,
    'session_id' => session_id()
];

echo "1. Simulated activity data:\n";
echo json_encode($activityData, JSON_PRETTY_PRINT) . "\n\n";

// Try to store in database
try {
    $writerActivity = new WriterActivity();
    $success = $writerActivity->storeOrUpdate($activityData);
    echo "2. Database store result: " . ($success ? "SUCCESS" : "FAILED") . "\n\n";
} catch (Exception $e) {
    echo "2. Database store ERROR: " . $e->getMessage() . "\n\n";
    $success = false;
}

// Try Redis publishing
echo "3. Redis publishing test:\n";

if (!$success) {
    echo "   SKIPPED - database store failed\n\n";
} else {
    try {
        if (file_exists('services/RedisManager.php')) {
            echo "   RedisManager.php found\n";
            
            if (class_exists('RedisManager')) {
                echo "   RedisManager class loaded\n";
                
                $redisManager = new RedisManager();
                echo "   RedisManager instantiated\n";
                
                if ($redisManager->isAvailable()) {
                    echo "   Redis is available\n";
                    
                    // Get site-wide counts
                    $siteWideCounts = $writerActivity->getSiteWideActivityCounts();
                    echo "   Site-wide counts: " . json_encode($siteWideCounts) . "\n";
                    
                    $siteWideMessage = [
                        'type' => 'site_activity_counts',
                        'data' => $siteWideCounts,
                        'timestamp' => time()
                    ];
                    
                    echo "   Publishing message: " . json_encode($siteWideMessage) . "\n";
                    
                    $result = $redisManager->publish('activities:site', $siteWideMessage);
                    echo "   Publish result: $result subscribers notified\n";
                    
                    if ($result > 0) {
                        echo "   ✅ SUCCESS - Message sent to $result subscribers\n";
                    } else {
                        echo "   ⚠️  WARNING - No subscribers received the message\n";
                    }
                } else {
                    echo "   ❌ Redis not available\n";
                }
            } else {
                echo "   ❌ RedisManager class not found\n";
            }
        } else {
            echo "   ❌ RedisManager.php not found\n";
        }
    } catch (Exception $e) {
        echo "   ❌ Redis ERROR: " . $e->getMessage() . "\n";
    }
}

echo "\n4. Test complete!\n";
echo "If you have your browser open, you should see this activity update appear immediately.\n";
?> 