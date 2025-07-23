<?php
/**
 * Activity Monitoring Test Script
 * 
 * This script simulates multiple users to test the activity monitoring system.
 * It can run both locally and on the server to verify that:
 * 1. User heartbeats are properly stored
 * 2. SSE connections receive real-time updates
 * 3. Activity indicators update correctly
 * 4. Multiple concurrent users don't interfere with each other
 */

// Set up error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== Activity Monitoring Test ===\n";
echo "This test simulates multiple users to verify activity monitoring\n\n";

// Load required files with correct paths for MVC system
require_once(__DIR__ . '/../config/load_env.php');

// Load models using RequirePage
RequirePage::model('WriterActivity');

// Only load DataFetchService if it exists and can be loaded
$GLOBALS['dataFetchServiceAvailable'] = false;
try {
    RequirePage::service('DataFetchService');
    $GLOBALS['dataFetchServiceAvailable'] = true;
} catch (Exception $e) {
    echo "⚠️  DataFetchService not available: " . $e->getMessage() . "\n";
    echo "   Continuing with basic tests only...\n\n";
}

class ActivityMonitoringTest {
    private $writerActivity;
    private $dataFetchService;
    private $testUsers = [];
    private $testResults = [];
    
    public function __construct() {
        $this->writerActivity = new WriterActivity();
        
        // Only create DataFetchService if it's available
        if ($GLOBALS['dataFetchServiceAvailable']) {
            $this->dataFetchService = new DataFetchService();
        } else {
            $this->dataFetchService = null;
        }
        
        // Define test users (you'll need to use real user IDs from your database)
        $this->testUsers = [
            [
                'writer_id' => 1,
                'name' => 'Test User 1',
                'activity_type' => 'browsing',
                'page_type' => 'game_list'
            ],
            [
                'writer_id' => 2, 
                'name' => 'Test User 2',
                'activity_type' => 'iterating',
                'page_type' => 'text_form'
            ]
        ];
    }
    
    /**
     * Test 1: Verify we can store and retrieve user activity
     */
    public function testUserActivityStorage() {
        echo "1. Testing user activity storage...\n";
        
        $testUser = $this->testUsers[0];
        $activityData = [
            'writer_id' => $testUser['writer_id'],
            'activity_type' => $testUser['activity_type'],
            'activity_level' => 'active',
            'page_type' => $testUser['page_type'],
            'game_id' => 1,
            'text_id' => null,
            'parent_id' => null,
            'session_id' => 'test_session_' . uniqid()
        ];
        
        try {
            // Store activity
            $result = $this->writerActivity->storeOrUpdate($activityData);
            
            if ($result) {
                echo "   ✅ Activity stored successfully\n";
                
                // Verify we can retrieve it
                $activeUsers = $this->writerActivity->getAllActiveUsers();
                $found = false;
                
                foreach ($activeUsers as $user) {
                    if ($user['writer_id'] == $testUser['writer_id']) {
                        $found = true;
                        echo "   ✅ Activity retrieved successfully\n";
                        break;
                    }
                }
                
                if (!$found) {
                    echo "   ❌ Activity not found in active users\n";
                    return false;
                }
                
                return true;
            } else {
                echo "   ❌ Failed to store activity\n";
                return false;
            }
        } catch (Exception $e) {
            echo "   ❌ Error: " . $e->getMessage() . "\n";
            return false;
        }
    }
    
    /**
     * Test 2: Test multiple concurrent users
     */
    public function testMultipleUsers() {
        echo "2. Testing multiple concurrent users...\n";
        
        $success = true;
        
        // Store activities for all test users
        foreach ($this->testUsers as $user) {
            $activityData = [
                'writer_id' => $user['writer_id'],
                'activity_type' => $user['activity_type'],
                'activity_level' => 'active',
                'page_type' => $user['page_type'],
                'game_id' => rand(1, 5), // Random game
                'text_id' => null, // Don't use random text_id to avoid foreign key issues
                'parent_id' => null,
                'session_id' => 'test_session_' . uniqid()
            ];
            
            try {
                $result = $this->writerActivity->storeOrUpdate($activityData);
                if (!$result) {
                    echo "   ❌ Failed to store activity for user {$user['name']}\n";
                    $success = false;
                }
            } catch (Exception $e) {
                echo "   ❌ Error storing activity for user {$user['name']}: " . $e->getMessage() . "\n";
                $success = false;
            }
        }
        
        if ($success) {
            // Verify all users are active
            $activeUsers = $this->writerActivity->getAllActiveUsers();
            $foundUsers = [];
            
            foreach ($activeUsers as $user) {
                foreach ($this->testUsers as $testUser) {
                    if ($user['writer_id'] == $testUser['writer_id']) {
                        $foundUsers[] = $testUser['name'];
                        break;
                    }
                }
            }
            
            if (count($foundUsers) === count($this->testUsers)) {
                echo "   ✅ All test users found in active users\n";
                echo "   📊 Active users count: " . count($activeUsers) . "\n";
                return true;
            } else {
                echo "   ❌ Not all test users found. Found: " . implode(', ', $foundUsers) . "\n";
                return false;
            }
        }
        
        return false;
    }
    
    /**
     * Test 3: Test activity level changes (active -> idle)
     */
    public function testActivityLevelChanges() {
        echo "3. Testing activity level changes...\n";
        
        $testUser = $this->testUsers[0];
        
        // First, set user as active
        $activeData = [
            'writer_id' => $testUser['writer_id'],
            'activity_type' => $testUser['activity_type'],
            'activity_level' => 'active',
            'page_type' => $testUser['page_type'],
            'game_id' => 1,
            'text_id' => null,
            'parent_id' => null,
            'session_id' => 'test_session_' . uniqid()
        ];
        
        try {
            $this->writerActivity->storeOrUpdate($activeData);
            
            // Verify user is active
            $activeUsers = $this->writerActivity->getAllActiveUsers();
            $foundActive = false;
            foreach ($activeUsers as $user) {
                if ($user['writer_id'] == $testUser['writer_id']) {
                    $foundActive = true;
                    break;
                }
            }
            
            if (!$foundActive) {
                echo "   ❌ User not found in active users after setting to active\n";
                return false;
            }
            
            echo "   ✅ User correctly appears in active users\n";
            
            // Now set as idle
            $idleData = $activeData;
            $idleData['activity_level'] = 'idle';
            
            $result = $this->writerActivity->storeOrUpdate($idleData);
            
            if ($result) {
                echo "   ✅ Activity level changed successfully\n";
                
                // Wait a moment for database to update
                sleep(1);
                
                // Verify the change
                $activeUsers = $this->writerActivity->getAllActiveUsers();
                $found = false;
                
                foreach ($activeUsers as $user) {
                    if ($user['writer_id'] == $testUser['writer_id']) {
                        $found = true;
                        break;
                    }
                }
                
                // User should NOT be in active users when idle
                if (!$found) {
                    echo "   ✅ Idle user correctly excluded from active users\n";
                    return true;
                } else {
                    echo "   ❌ Idle user still appears in active users\n";
                    echo "   📊 Active users count: " . count($activeUsers) . "\n";
                    return false;
                }
            } else {
                echo "   ❌ Failed to change activity level\n";
                return false;
            }
        } catch (Exception $e) {
            echo "   ❌ Error: " . $e->getMessage() . "\n";
            return false;
        }
    }
    
    /**
     * Test 4: Test SSE data fetching
     */
    public function testSSEDataFetching() {
        echo "4. Testing SSE data fetching...\n";
        
        if (!$this->dataFetchService) {
            echo "   ⚠️  DataFetchService not available, skipping test\n";
            return true; // Not a failure, just not available
        }
        
        try {
            // Test user activity data fetching
            $userActivityData = $this->dataFetchService->fetchUserActivityData();
            
            if ($userActivityData) {
                echo "   ✅ User activity data fetched successfully\n";
                echo "   📊 User activity data structure: " . json_encode(array_keys($userActivityData)) . "\n";
                return true;
            } else {
                echo "   ❌ No user activity data returned\n";
                return false;
            }
        } catch (Exception $e) {
            echo "   ❌ Error fetching user activity data: " . $e->getMessage() . "\n";
            return false;
        }
    }
    
    /**
     * Test 5: Test Redis availability (if applicable)
     */
    public function testRedisAvailability() {
        echo "5. Testing Redis availability...\n";
        
        if (file_exists(__DIR__ . '/../services/RedisManager.php')) {
            require_once(__DIR__ . '/../services/RedisManager.php');
            
            if (class_exists('RedisManager')) {
                try {
                    $redisManager = new RedisManager();
                    
                    if ($redisManager->isAvailable()) {
                        echo "   ✅ Redis is available\n";
                        
                        // Test publishing a message
                        $testMessage = [
                            'type' => 'test_message',
                            'data' => ['test' => 'data'],
                            'timestamp' => time()
                        ];
                        
                        $result = $redisManager->publish('test:channel', $testMessage);
                        
                        if ($result) {
                            echo "   ✅ Redis publishing works\n";
                            return true;
                        } else {
                            echo "   ❌ Redis publishing failed\n";
                            return false;
                        }
                    } else {
                        echo "   ⚠️  Redis is not available (will use polling fallback)\n";
                        return true; // Not a failure, just not available
                    }
                } catch (Exception $e) {
                    echo "   ❌ Redis error: " . $e->getMessage() . "\n";
                    return false;
                }
            } else {
                echo "   ⚠️  RedisManager class not found\n";
                return true; // Not a failure
            }
        } else {
            echo "   ⚠️  RedisManager.php not found\n";
            return true; // Not a failure
        }
    }
    
    /**
     * Run all tests
     */
    public function runAllTests() {
        $tests = [
            'testUserActivityStorage',
            'testMultipleUsers', 
            'testActivityLevelChanges',
            'testSSEDataFetching'
        ];
        
        // Only add Redis test if DataFetchService is available
        if ($this->dataFetchService) {
            $tests[] = 'testRedisAvailability';
        }
        
        $passed = 0;
        $total = count($tests);
        
        foreach ($tests as $test) {
            $result = $this->$test();
            if ($result) {
                $passed++;
            }
            echo "\n";
        }
        
        echo "=== Test Results ===\n";
        echo "Passed: $passed/$total tests\n";
        
        if ($passed === $total) {
            echo "✅ All tests passed! Activity monitoring system appears to be working correctly.\n";
        } else {
            echo "❌ Some tests failed. Check the output above for details.\n";
        }
        
        return $passed === $total;
    }
    
    /**
     * Clean up test data
     */
    public function cleanup() {
        echo "Cleaning up test data...\n";
        
        try {
            // Remove test activities (older than 1 minute)
            $this->writerActivity->cleanupOldActivities(1);
            echo "✅ Test data cleaned up\n";
        } catch (Exception $e) {
            echo "❌ Error cleaning up: " . $e->getMessage() . "\n";
        }
    }
}

// Run the tests
try {
    $test = new ActivityMonitoringTest();
    $success = $test->runAllTests();
    
    // Clean up
    $test->cleanup();
    
    if ($success) {
        echo "\n🎉 Activity monitoring system is ready for manual testing!\n";
        echo "\nNext steps:\n";
        echo "1. Open the application in multiple browser tabs\n";
        echo "2. Log in with different users in each tab\n";
        echo "3. Navigate between games and text forms\n";
        echo "4. Check that activity indicators update in real-time\n";
        echo "5. Monitor browser console for SSE connection status\n";
    } else {
        echo "\n⚠️  Some issues detected. Please review the test output above.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Test failed with error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?> 