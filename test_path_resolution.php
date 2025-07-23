<?php
/**
 * Simple test to check path resolution
 */

echo "=== Testing Path Resolution ===\n";

// Test 1: Check if ROOT_DIR is defined
echo "1. ROOT_DIR defined: " . (defined('ROOT_DIR') ? 'YES' : 'NO') . "\n";

// Test 2: Try to load Notification.php
echo "2. Testing Notification.php load...\n";
try {
    require_once(__DIR__ . '/model/Notification.php');
    echo "   ✅ Notification.php loaded successfully\n";
} catch (Exception $e) {
    echo "   ❌ Error loading Notification.php: " . $e->getMessage() . "\n";
}

// Test 3: Check if timezone functions are available
echo "3. Timezone functions available: " . (function_exists('convertToDbTimezone') ? 'YES' : 'NO') . "\n";

echo "\n=== Test Complete ===\n";
?> 