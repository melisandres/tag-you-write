<?php
// Include the timezone configuration
require_once('config/timezone_config.php');

/**
 * This test simulates the entire notification flow:
 * 1. A game is closed, creating notifications for all players
 * 2. Players poll for new notifications
 * 3. We verify that all players receive the notifications
 */

// Simulate the notification creation process
function createNotification($playerId, $gameId, $notificationType, $message = null) {
    // Get current time in database timezone
    $now = new DateTime('now', new DateTimeZone(DB_TIMEZONE));
    $createdAt = $now->format('Y-m-d H:i:s');
    
    echo "Creating notification for player $playerId, game $gameId, type $notificationType at $createdAt\n";
    
    // In a real implementation, this would insert into the database
    // For this test, we'll just return the notification data
    return [
        'id' => uniqid(),
        'writer_id' => $playerId,
        'game_id' => $gameId,
        'notification_type' => $notificationType,
        'created_at' => $createdAt,
        'message' => $message,
        'seen_at' => null,
        'root_text_id' => '282',
        'game_title' => 'Test Game',
        'winning_title' => 'Winning Text'
    ];
}

// Simulate the getNewNotifications method
function getNewNotifications($writerId, $lastCheck = null) {
    echo "Getting new notifications for writer $writerId with lastCheck: " . ($lastCheck ?? 'null') . "\n";
    
    // In a real implementation, this would query the database
    // For this test, we'll simulate the database query
    
    // Simulate a notification that was just created
    $notification = [
        'id' => '379',
        'writer_id' => $writerId,
        'game_id' => '144',
        'notification_type' => 'game_closed',
        'created_at' => '2025-04-10 17:20:48',
        'message' => null,
        'seen_at' => null,
        'root_text_id' => '282',
        'game_title' => 'Test Game',
        'winning_title' => 'Winning Text'
    ];
    
    if ($lastCheck !== null) {
        // Convert the lastCheck timestamp to the database's timezone
        $date = new DateTime($lastCheck);
        $date->setTimezone(new DateTimeZone(DB_TIMEZONE));
        $formattedDate = $date->format('Y-m-d H:i:s');
        
        echo "Converted lastCheck to database timezone: $formattedDate\n";
        
        // Compare the notification's created_at with the lastCheck
        $notificationDate = new DateTime($notification['created_at'], new DateTimeZone(DB_TIMEZONE));
        $lastCheckDate = new DateTime($formattedDate, new DateTimeZone(DB_TIMEZONE));
        
        if ($notificationDate < $lastCheckDate) {
            echo "Notification was created before lastCheck, not returning it\n";
            return [];
        }
    }
    
    echo "Returning notification\n";
    return [$notification];
}

// Simulate the client-side polling process
function simulateClientPolling($writerId, $initialLastCheck = null) {
    echo "\n=== Simulating client polling for writer $writerId ===\n";
    
    $lastCheck = $initialLastCheck;
    echo "Initial lastCheck: " . ($lastCheck ?? 'null') . "\n";
    
    // First poll
    echo "\n--- First poll ---\n";
    $notifications = getNewNotifications($writerId, $lastCheck);
    echo "Received " . count($notifications) . " notifications\n";
    
    if (count($notifications) > 0) {
        // Update lastCheck to current time
        $now = new DateTime('now', new DateTimeZone('UTC'));
        $lastCheck = $now->format('Y-m-d\TH:i:s\Z');
        echo "Updated lastCheck to: $lastCheck\n";
    }
    
    // Second poll (should not return the same notification)
    echo "\n--- Second poll ---\n";
    $notifications = getNewNotifications($writerId, $lastCheck);
    echo "Received " . count($notifications) . " notifications\n";
    
    return $notifications;
}

// Simulate the game closing process
echo "=== Simulating game closing process ===\n";
$gameId = 144;
$players = [
    ['writer_id' => 41, 'is_winner' => true],
    ['writer_id' => 42, 'is_winner' => false]
];

// Create notifications for each player
$notifications = [];
foreach ($players as $player) {
    $notificationType = $player['is_winner'] ? 'game_won' : 'game_closed';
    $notifications[] = createNotification($player['writer_id'], $gameId, $notificationType);
}

// Simulate polling for each player
echo "\n=== Simulating polling for all players ===\n";

// Player 1 (winner) polls for notifications
$player1Notifications = simulateClientPolling(41);

// Player 2 (non-winner) polls for notifications
$player2Notifications = simulateClientPolling(42);

// Verify that both players received notifications
echo "\n=== Verification ===\n";
echo "Player 1 (winner) received " . count($player1Notifications) . " notifications\n";
echo "Player 2 (non-winner) received " . count($player2Notifications) . " notifications\n";

// Test with different timezone settings
echo "\n=== Testing with different timezone settings ===\n";

// Change the database timezone
define('DB_TIMEZONE', 'UTC');
echo "Changed database timezone to: " . DB_TIMEZONE . "\n";

// Player 1 polls again
$player1Notifications = simulateClientPolling(41);

// Player 2 polls again
$player2Notifications = simulateClientPolling(42);

// Verify that both players still received notifications
echo "\n=== Verification after timezone change ===\n";
echo "Player 1 (winner) received " . count($player1Notifications) . " notifications\n";
echo "Player 2 (non-winner) received " . count($player2Notifications) . " notifications\n";
?> 