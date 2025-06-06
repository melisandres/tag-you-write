<?php
// Debug script to test text activity queries
require_once 'public/sse/bootstrap.php';
require_once 'model/WriterActivity.php';

echo "=== Text Activity Debug ===\n\n";

// 1. Check if we have any activities in the database at all
$writerActivity = new WriterActivity();

echo "1. Checking site-wide activity counts:\n";
$siteActivity = $writerActivity->getSiteWideActivityCounts();
print_r($siteActivity);
echo "\n";

// 2. Let's test with a known game_id (let's try 1, 2, 3)
$testGameIds = [1, 2, 3, 42];

foreach ($testGameIds as $gameId) {
    echo "2. Testing text activities for game_id $gameId:\n";
    $textActivities = $writerActivity->getIndividualTextActivities($gameId);
    echo "Individual text activities: " . count($textActivities) . "\n";
    if (!empty($textActivities)) {
        print_r($textActivities);
    }
    echo "\n";
    
    echo "3. Game activity counts for game_id $gameId:\n";
    $gameActivity = $writerActivity->getGameActivityCounts($gameId);
    print_r($gameActivity);
    echo "\n";
}

// 4. Check all game activities
echo "4. All game activities:\n";
$allGameActivities = $writerActivity->getGameActivityCounts();
print_r($allGameActivities);
echo "\n";

// 5. Let's simulate some activity by inserting a test record
echo "5. Simulating activity by inserting test data:\n";
$testData = [
    'writer_id' => 1,
    'activity_type' => 'editing',  // Valid: 'browsing', 'editing', 'starting_game'
    'activity_level' => 'active',
    'page_type' => 'text_form',    // Valid: 'game_list', 'text_form', 'collab_page', 'home', 'other'
    'game_id' => 42,
    'text_id' => 123,
    'parent_id' => 122,
    'session_id' => 'test_session_' . time()
];

$result = $writerActivity->storeOrUpdate($testData);
echo "Insert result: " . ($result ? 'SUCCESS' : 'FAILED') . "\n\n";

if ($result) {
    echo "6. Re-checking text activities after insert:\n";
    $textActivities = $writerActivity->getIndividualTextActivities(42);
    echo "Individual text activities for game 42: " . count($textActivities) . "\n";
    print_r($textActivities);
    echo "\n";
    
    echo "7. Re-checking game activity counts:\n";
    $gameActivity = $writerActivity->getGameActivityCounts(42);
    print_r($gameActivity);
    echo "\n";
}

echo "\n=== Debug Complete ===\n";
?> 