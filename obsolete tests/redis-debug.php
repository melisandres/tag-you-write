<?php
/**
 * Redis Debug Script
 * 
 * This script helps debug Redis pub/sub for activity updates.
 * Run with: php redis-debug.php [mode]
 * 
 * Modes:
 * - publish: Publishes test activity updates
 * - subscribe: Listens for activity updates  
 * - test: Tests Redis connection and availability
 */

// Load necessary files
if (file_exists('services/RedisManager.php')) {
    require_once('services/RedisManager.php');
} else {
    die("RedisManager.php not found\n");
}

if (file_exists('model/WriterActivity.php')) {
    require_once('model/Crud.php');
    require_once('model/WriterActivity.php');
}

class RedisDebugger {
    private $redisManager;
    private $writerActivity;
    
    public function __construct() {
        $this->redisManager = new RedisManager();
        
        if (class_exists('WriterActivity')) {
            $this->writerActivity = new WriterActivity();
        }
    }
    
    public function testConnection() {
        echo "Testing Redis connection...\n";
        echo "Redis available: " . ($this->redisManager->isAvailable() ? "YES" : "NO") . "\n";
        
        if ($this->redisManager->isAvailable()) {
            $redis = $this->redisManager->getRedis();
            if ($redis) {
                try {
                    $pong = $redis->ping();
                    echo "Ping result: $pong\n";
                } catch (Exception $e) {
                    echo "Ping failed: " . $e->getMessage() . "\n";
                }
            }
        }
        
        echo "\n";
    }
    
    public function publishTest() {
        echo "Publishing test activity update to 'activities:site'...\n";
        
        if (!$this->redisManager->isAvailable()) {
            echo "ERROR: Redis not available\n";
            return;
        }
        
        // Create test site-wide activity data
        $testData = [
            'browsing' => rand(1, 5),
            'writing' => rand(1, 3),
            'timestamp' => time()
        ];
        
        // Create the message structure used by ControllerWriterActivity
        $message = [
            'type' => 'site_activity_counts',
            'data' => $testData,
            'timestamp' => time()
        ];
        
        echo "Test data: " . json_encode($testData) . "\n";
        echo "Publishing message: " . json_encode($message) . "\n";
        
        $result = $this->redisManager->publish('activities:site', $message);
        echo "Publish result (number of subscribers): $result\n";
        
        if ($result === 0) {
            echo "WARNING: No subscribers received the message\n";
        }
        
        echo "\n";
    }
    
    public function subscribe() {
        echo "Subscribing to 'activities:site' channel...\n";
        echo "Press Ctrl+C to stop\n\n";
        
        if (!$this->redisManager->isAvailable()) {
            echo "ERROR: Redis not available\n";
            return;
        }
        
        $messageCount = 0;
        
        $this->redisManager->subscribe(['activities:site'], function($redis, $channel, $message) use (&$messageCount) {
            $messageCount++;
            $timestamp = date('Y-m-d H:i:s');
            
            echo "[$timestamp] Message #$messageCount received on channel: $channel\n";
            echo "Raw message: $message\n";
            
            try {
                $data = json_decode($message, true);
                if ($data) {
                    echo "Parsed data: " . json_encode($data, JSON_PRETTY_PRINT) . "\n";
                    
                    if (isset($data['data'])) {
                        $activityData = $data['data'];
                        echo "Activity counts - Browsing: {$activityData['browsing']}, Writing: {$activityData['writing']}\n";
                    }
                } else {
                    echo "Failed to parse JSON\n";
                }
            } catch (Exception $e) {
                echo "Error parsing message: " . $e->getMessage() . "\n";
            }
            
            echo "---\n\n";
            
            return true; // Continue listening
        });
    }
    
    public function simulateHeartbeat() {
        echo "Simulating activity heartbeat and Redis publish...\n";
        
        if (!$this->writerActivity) {
            echo "WriterActivity model not available\n";
            return;
        }
        
        // Simulate storing activity data
        $activityData = [
            'writer_id' => 999, // Test user ID
            'activity_type' => 'browsing',
            'activity_level' => 'active',
            'page_type' => 'game_list',
            'game_id' => null,
            'text_id' => null,
            'parent_id' => null,
            'session_id' => 'test_session_' . time()
        ];
        
        echo "Test activity data: " . json_encode($activityData) . "\n";
        
        // Store in database (commented out to avoid DB issues)
        // $success = $this->writerActivity->storeOrUpdate($activityData);
        // echo "Database store result: " . ($success ? "SUCCESS" : "FAILED") . "\n";
        
        // Simulate the Redis publishing logic from ControllerWriterActivity
        if ($this->redisManager->isAvailable()) {
            echo "Publishing to Redis...\n";
            
            // Get site-wide counts (or simulate them)
            try {
                $siteWideCounts = $this->writerActivity->getSiteWideActivityCounts();
            } catch (Exception $e) {
                echo "Could not get real counts, using mock data: " . $e->getMessage() . "\n";
                $siteWideCounts = [
                    'browsing' => rand(1, 5),
                    'writing' => rand(1, 3), 
                    'timestamp' => time()
                ];
            }
            
            $siteWideMessage = [
                'type' => 'site_activity_counts',
                'data' => $siteWideCounts,
                'timestamp' => time()
            ];
            
            echo "Publishing site-wide message: " . json_encode($siteWideMessage) . "\n";
            
            $result = $this->redisManager->publish('activities:site', $siteWideMessage);
            echo "Publish result: $result subscribers\n";
        } else {
            echo "Redis not available for publishing\n";
        }
    }
    
    public function checkChannels() {
        echo "Checking active Redis channels...\n";
        
        if (!$this->redisManager->isAvailable()) {
            echo "ERROR: Redis not available\n";
            return;
        }
        
        $redis = $this->redisManager->getRedis();
        if (!$redis) {
            echo "Could not get Redis client\n";
            return;
        }
        
        try {
            // Get active channels
            $channels = $redis->pubsub('channels');
            echo "Active channels: " . implode(', ', $channels) . "\n";
            
            // Get number of subscribers for activities:site
            $subscribers = $redis->pubsub('numsub', 'activities:site');
            echo "Subscribers to 'activities:site': " . ($subscribers['activities:site'] ?? 0) . "\n";
            
        } catch (Exception $e) {
            echo "Error checking channels: " . $e->getMessage() . "\n";
        }
    }
}

// Command line interface
$mode = $argv[1] ?? 'test';

$debugger = new RedisDebugger();

switch ($mode) {
    case 'test':
        $debugger->testConnection();
        $debugger->checkChannels();
        break;
        
    case 'publish':
        $debugger->testConnection();
        $debugger->publishTest();
        break;
        
    case 'subscribe':
        $debugger->testConnection();
        $debugger->subscribe();
        break;
        
    case 'heartbeat':
        $debugger->testConnection();
        $debugger->simulateHeartbeat();
        break;
        
    case 'channels':
        $debugger->testConnection();
        $debugger->checkChannels();
        break;
        
    default:
        echo "Usage: php redis-debug.php [mode]\n";
        echo "Modes:\n";
        echo "  test      - Test Redis connection and show channel info\n";
        echo "  publish   - Publish a test activity update\n";
        echo "  subscribe - Subscribe and listen for activity updates\n";
        echo "  heartbeat - Simulate a complete heartbeat cycle\n";
        echo "  channels  - Check active channels and subscribers\n";
        break;
} 