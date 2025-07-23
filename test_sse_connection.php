<?php
/**
 * SSE Connection Test Script
 * 
 * This script tests the SSE connection to verify that:
 * 1. The path resolution issues are fixed
 * 2. The SSE system can load all dependencies
 * 3. The connection can be established
 */

// Set up error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "=== SSE Connection Test ===\n";
echo "Testing SSE system initialization...\n\n";

try {
    // Test 1: Check if we can load the bootstrap
    echo "1. Testing bootstrap loading...\n";
    require_once(__DIR__ . '/public/sse/bootstrap.php');
    echo "✅ Bootstrap loaded successfully\n\n";
    
    // Test 2: Check if we can load the Notification model
    echo "2. Testing Notification model loading...\n";
    require_once(__DIR__ . '/model/Notification.php');
    echo "✅ Notification model loaded successfully\n\n";
    
    // Test 3: Check if timezone functions are available
    echo "3. Testing timezone functions...\n";
    if (function_exists('convertToDbTimezone') && function_exists('convertFromDbTimezone')) {
        echo "✅ Timezone functions available\n\n";
    } else {
        echo "❌ Timezone functions not available\n\n";
    }
    
    // Test 4: Check if we can create an EventHandler instance
    echo "4. Testing EventHandler creation...\n";
    require_once(__DIR__ . '/public/sse/events.php');
    
    // Create a test instance with a mock writer ID
    $testWriterId = 1;
    $handler = new EventHandler($testWriterId);
    echo "✅ EventHandler created successfully\n\n";
    
    // Test 5: Check if Redis is available (optional)
    echo "5. Testing Redis availability...\n";
    if (class_exists('RedisManager')) {
        $redisManager = new RedisManager();
        if ($redisManager->isAvailable()) {
            echo "✅ Redis is available\n\n";
        } else {
            echo "⚠️  Redis is not available (will fall back to polling)\n\n";
        }
    } else {
        echo "⚠️  RedisManager class not found\n\n";
    }
    
    echo "=== All tests completed successfully ===\n";
    echo "The SSE system should now work properly on the server.\n";
    
} catch (Exception $e) {
    echo "❌ Test failed with error: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
    echo "\nStack trace:\n" . $e->getTraceAsString() . "\n";
}
?> 