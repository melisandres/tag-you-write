<?php
/**
 * Test Runner
 * 
 * This file runs all the tests in the tests directory.
 * It provides a simple way to execute all tests at once.
 */

// Set error reporting for testing
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Function to run a test file
function runTest($testFile) {
    echo "\n\n==========================================\n";
    echo "Running test: $testFile\n";
    echo "==========================================\n\n";
    
    // Execute the test file
    include($testFile);
    
    echo "\n==========================================\n";
    echo "Completed test: $testFile\n";
    echo "==========================================\n";
}

// Run all tests
$tests = [
    'notification/test_notification_model.php',
    'notification/test_notification_flow.php'
];

foreach ($tests as $test) {
    runTest(__DIR__ . '/' . $test);
}

echo "\n\nAll tests completed!\n"; 