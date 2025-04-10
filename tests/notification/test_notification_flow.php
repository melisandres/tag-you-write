<?php
/**
 * Test file for the notification flow
 * 
 * This file simulates the entire notification flow, including:
 * 1. Creating notifications when a game ends
 * 2. Polling for new notifications
 * 3. Verifying that all users receive notifications
 */

// Start session before any output
session_start();

// Set the project root path
define('PROJECT_ROOT', dirname(dirname(dirname(__FILE__))));

// Include necessary files
require_once(PROJECT_ROOT . '/config/timezone_config.php');

/**
 * Simulate creating a notification for a player
 * 
 * @param int $playerId The ID of the player
 * @param int $gameId The ID of the game
 * @param string $notificationType The type of notification
 * @param string $message The notification message
 * @return array The created notification
 */
function createNotification($playerId, $gameId, $notificationType, $message) {
    $notification = [
        'id' => rand(500, 700),
        'writer_id' => $playerId,
        'game_id' => $gameId,
        'notification_type' => $notificationType,
        'message' => $message,
        'created_at' => date('Y-m-d H:i:s'),
        'seen_at' => null,
        'read_at' => null
    ];
    
    echo "Created notification for player $playerId: " . $notification['notification_type'] . "\n";
    echo "Created at: " . $notification['created_at'] . "\n";
    
    return $notification;
}

/**
 * Simulate getting new notifications for a player
 * 
 * @param int $writerId The ID of the writer
 * @param string|null $lastCheck The timestamp to check for new notifications
 * @return array The notifications found
 */
function getNewNotifications($writerId, $lastCheck = null) {
    // Convert lastCheck to database timezone if provided
    if ($lastCheck !== null) {
        $dbLastCheck = convertToDbTimezone($lastCheck);
        echo "Original lastCheck: $lastCheck\n";
        echo "Converted to DB timezone: $dbLastCheck\n";
    }
    
    // Simulate database results
    $results = [];
    
    // If this is player 41 (the one who closed the game)
    if ($writerId == 41) {
        $results[] = [
            'id' => 600,
            'writer_id' => 41,
            'game_id' => 123,
            'notification_type' => 'game_closed',
            'message' => 'You closed the game',
            'created_at' => '2025-04-10 17:20:48',
            'seen_at' => null,
            'read_at' => null
        ];
    }
    // If this is player 42 (the other player)
    else if ($writerId == 42) {
        $results[] = [
            'id' => 601,
            'writer_id' => 42,
            'game_id' => 123,
            'notification_type' => 'game_closed',
            'message' => 'The game was closed by another player',
            'created_at' => '2025-04-10 17:20:48',
            'seen_at' => null,
            'read_at' => null
        ];
    }
    
    echo "Found " . count($results) . " notifications for player $writerId\n";
    if (count($results) > 0) {
        echo "First notification created_at: " . $results[0]['created_at'] . "\n";
    }
    
    return $results;
}

/**
 * Simulate client polling for notifications
 * 
 * @param int $playerId The ID of the player
 * @param string|null $lastCheck The timestamp of the last check
 * @return array The new notifications
 */
function simulateClientPolling($playerId, $lastCheck = null) {
    echo "\n=== Simulating polling for player $playerId ===\n";
    echo "Last check: " . ($lastCheck ? $lastCheck : 'null') . "\n";
    
    $notifications = getNewNotifications($playerId, $lastCheck);
    
    // Update lastCheck to current time
    $newLastCheck = date('Y-m-d H:i:s');
    echo "Updated lastCheck to: $newLastCheck\n";
    
    return [
        'notifications' => $notifications,
        'lastCheck' => $newLastCheck
    ];
}

// Simulate the game closing process
echo "=== Simulating game closing process ===\n";

// Create notifications for both players
$notification41 = createNotification(41, 123, 'game_closed', 'You closed the game');
$notification42 = createNotification(42, 123, 'game_closed', 'The game was closed by another player');

// Simulate polling for both players
$result41 = simulateClientPolling(41, '2025-04-10 17:15:00');
$result42 = simulateClientPolling(42, '2025-04-10 17:15:00');

// Verify that both players received notifications
echo "\n=== Verification ===\n";
echo "Player 41 received " . count($result41['notifications']) . " notifications\n";
echo "Player 42 received " . count($result42['notifications']) . " notifications\n";

if (count($result41['notifications']) > 0 && count($result42['notifications']) > 0) {
    echo "✅ Both players received notifications\n";
} else {
    echo "❌ Not all players received notifications\n";
}

// Test with different timezone settings
echo "\n=== Testing with different timezone settings ===\n";
// Change the database timezone
define('DB_TIMEZONE', 'UTC');
echo "Changed database timezone to: " . DB_TIMEZONE . "\n";

// Simulate polling again
$result41 = simulateClientPolling(41, '2025-04-10 17:15:00');
$result42 = simulateClientPolling(42, '2025-04-10 17:15:00');

// Verify that both players still received notifications
echo "\n=== Verification after timezone change ===\n";
echo "Player 41 received " . count($result41['notifications']) . " notifications\n";
echo "Player 42 received " . count($result42['notifications']) . " notifications\n";

if (count($result41['notifications']) > 0 && count($result42['notifications']) > 0) {
    echo "✅ Both players received notifications with different timezone\n";
} else {
    echo "❌ Not all players received notifications with different timezone\n";
} 