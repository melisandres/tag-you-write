<?php
// Test file for notification timezone handling
// This will help us verify our approach before modifying the production code

// Simulate the notification creation process
function testNotificationCreation() {
    // Get current time in UTC
    $utcNow = new DateTime('now', new DateTimeZone('UTC'));
    echo "UTC time: " . $utcNow->format('Y-m-d H:i:s') . "\n";
    
    // Get current time in server timezone
    $serverNow = new DateTime('now', new DateTimeZone(date_default_timezone_get()));
    echo "Server timezone: " . date_default_timezone_get() . "\n";
    echo "Server time: " . $serverNow->format('Y-m-d H:i:s') . "\n";
    
    // Get current time in America/New_York (your hardcoded timezone)
    $nyNow = new DateTime('now', new DateTimeZone('America/New_York'));
    echo "America/New_York time: " . $nyNow->format('Y-m-d H:i:s') . "\n";
    
    // Calculate time differences
    $utcToServer = $utcNow->diff($serverNow);
    $utcToNy = $utcNow->diff($nyNow);
    
    echo "Difference between UTC and server time: " . $utcToServer->format('%H:%I:%S') . "\n";
    echo "Difference between UTC and NY time: " . $utcToNy->format('%H:%I:%S') . "\n";
    
    // Simulate the notification polling process
    echo "\n--- Simulating notification polling ---\n";
    
    // Simulate a notification created 5 minutes ago in UTC
    $notificationTime = clone $utcNow;
    $notificationTime->modify('-5 minutes');
    echo "Notification created at (UTC): " . $notificationTime->format('Y-m-d H:i:s') . "\n";
    
    // Simulate a last check 10 minutes ago in UTC
    $lastCheckTime = clone $utcNow;
    $lastCheckTime->modify('-10 minutes');
    echo "Last check time (UTC): " . $lastCheckTime->format('Y-m-d H:i:s') . "\n";
    
    // Convert last check to server timezone for database query
    $lastCheckServer = clone $lastCheckTime;
    $lastCheckServer->setTimezone(new DateTimeZone(date_default_timezone_get()));
    echo "Last check time (server): " . $lastCheckServer->format('Y-m-d H:i:s') . "\n";
    
    // Convert last check to NY timezone for comparison
    $lastCheckNy = clone $lastCheckTime;
    $lastCheckNy->setTimezone(new DateTimeZone('America/New_York'));
    echo "Last check time (NY): " . $lastCheckNy->format('Y-m-d H:i:s') . "\n";
    
    // Simulate database query with server timezone
    echo "\n--- Simulating database query with server timezone ---\n";
    $notificationServer = clone $notificationTime;
    $notificationServer->setTimezone(new DateTimeZone(date_default_timezone_get()));
    echo "Notification time in server timezone: " . $notificationServer->format('Y-m-d H:i:s') . "\n";
    
    // Check if notification should be returned (created_at >= lastCheck)
    $shouldReturn = $notificationServer >= $lastCheckServer;
    echo "Should return notification (server timezone): " . ($shouldReturn ? "Yes" : "No") . "\n";
    
    // Simulate database query with NY timezone
    echo "\n--- Simulating database query with NY timezone ---\n";
    $notificationNy = clone $notificationTime;
    $notificationNy->setTimezone(new DateTimeZone('America/New_York'));
    echo "Notification time in NY timezone: " . $notificationNy->format('Y-m-d H:i:s') . "\n";
    
    // Check if notification should be returned (created_at >= lastCheck)
    $shouldReturn = $notificationNy >= $lastCheckNy;
    echo "Should return notification (NY timezone): " . ($shouldReturn ? "Yes" : "No") . "\n";
    
    // Simulate database query with UTC timezone
    echo "\n--- Simulating database query with UTC timezone ---\n";
    echo "Notification time in UTC: " . $notificationTime->format('Y-m-d H:i:s') . "\n";
    
    // Check if notification should be returned (created_at >= lastCheck)
    $shouldReturn = $notificationTime >= $lastCheckTime;
    echo "Should return notification (UTC): " . ($shouldReturn ? "Yes" : "No") . "\n";
}

// Run the test
testNotificationCreation();
?> 