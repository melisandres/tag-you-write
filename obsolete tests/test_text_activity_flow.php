<?php
// Test script for complete text activity flow
require_once 'public/sse/bootstrap.php';
require_once 'model/WriterActivity.php';

echo "=== Testing Complete Text Activity Flow ===\n\n";

$writerActivity = new WriterActivity();

// Test 1: Direct text activity fetch with our test game_id
echo "1. Testing individual text activities for game_id 42:\n";
$textActivity = $writerActivity->getIndividualTextActivities(42);
echo "Text activity result: " . json_encode($textActivity, JSON_PRETTY_PRINT) . "\n\n";

// Test 2: Test site-wide activity
echo "2. Testing site-wide activity:\n";
$siteActivity = $writerActivity->getSiteWideActivityCounts();
echo "Site activity result: " . json_encode($siteActivity, JSON_PRETTY_PRINT) . "\n\n";

// Test 3: Test game activity for specific game
echo "3. Testing game activity for game_id 42:\n";
$gameActivity = $writerActivity->getGameActivityCounts(42);
echo "Game activity result: " . json_encode($gameActivity, JSON_PRETTY_PRINT) . "\n\n";

// Test 4: Test all game activities
echo "4. Testing all game activities:\n";
$allGameActivity = $writerActivity->getGameActivityCounts();
echo "All game activity result: " . json_encode($allGameActivity, JSON_PRETTY_PRINT) . "\n\n";

// Test 5: Simulate the complete data structure that would be sent via polling
echo "5. Simulating complete polling response structure:\n";
$pollingResponse = [
    'siteWideActivity' => $siteActivity,
    'gameActivity' => $allGameActivity,
    'textActivity' => $textActivity,
    'timestamp' => time()
];
echo "Complete polling response: " . json_encode($pollingResponse, JSON_PRETTY_PRINT) . "\n\n";

echo "=== Test Complete ===\n";
?> 