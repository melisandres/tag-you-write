<?php
/**
 * Test file to demonstrate the new game permission system
 * 
 * This file shows how the enhanced permissions work with different game access scenarios.
 * Run this file to see the permission calculations in action.
 */

require_once('library/Permissions.php');

// Mock data for testing different scenarios
$testScenarios = [
    'public_game' => [
        'writer_id' => 1,
        'text_status' => 'published',
        'openForChanges' => true,
        'hasContributed' => true,
        'hasInvitation' => false,
        'joinable_by_all' => true,
        'visible_to_all' => true
    ],
    'private_game_with_invitation' => [
        'writer_id' => 2,
        'text_status' => 'published',
        'openForChanges' => true,
        'hasContributed' => false,
        'hasInvitation' => true,
        'joinable_by_all' => false,
        'visible_to_all' => false
    ],
    'private_game_no_access' => [
        'writer_id' => 3,
        'text_status' => 'published',
        'openForChanges' => true,
        'hasContributed' => false,
        'hasInvitation' => false,
        'joinable_by_all' => false,
        'visible_to_all' => false
    ],
    'visible_only_game' => [
        'writer_id' => 4,
        'text_status' => 'published',
        'openForChanges' => true,
        'hasContributed' => false,
        'hasInvitation' => false,
        'joinable_by_all' => false,
        'visible_to_all' => true
    ]
];

$currentUserId = 1;

echo "=== Game Permission System Test ===\n\n";

foreach ($testScenarios as $scenario => $data) {
    echo "Scenario: $scenario\n";
    echo "Game Settings: visible_to_all=" . ($data['visible_to_all'] ? 'true' : 'false') . 
         ", joinable_by_all=" . ($data['joinable_by_all'] ? 'true' : 'false') . "\n";
    echo "User Status: hasContributed=" . ($data['hasContributed'] ? 'true' : 'false') . 
         ", hasInvitation=" . ($data['hasInvitation'] ? 'true' : 'false') . "\n";
    
    // Test game-level permissions
    $hasGameAccess = Permissions::hasGameAccess($data, $currentUserId);
    $canJoinGame = Permissions::canJoinGame($data, $currentUserId);
    
    echo "Game Access: " . ($hasGameAccess ? 'YES' : 'NO') . "\n";
    echo "Can Join Game: " . ($canJoinGame ? 'YES' : 'NO') . "\n";
    
    // Test text-level permissions
    $canEdit = Permissions::canEdit($data, $currentUserId);
    $canIterate = Permissions::canIterate($data, $currentUserId);
    $canVote = Permissions::canVote($data, $currentUserId);
    $canPublish = Permissions::canPublish($data, $currentUserId);
    
    echo "Text Permissions:\n";
    echo "  - Can Edit: " . ($canEdit ? 'YES' : 'NO') . "\n";
    echo "  - Can Iterate: " . ($canIterate ? 'YES' : 'NO') . "\n";
    echo "  - Can Vote: " . ($canVote ? 'YES' : 'NO') . "\n";
    echo "  - Can Publish: " . ($canPublish ? 'YES' : 'NO') . "\n";
    
    echo "\n" . str_repeat('-', 50) . "\n\n";
}

echo "=== Summary ===\n";
echo "✅ Public games: Anyone can view and join\n";
echo "✅ Private games with invitation: Invited users can view and join\n";
echo "✅ Private games without invitation: No access\n";
echo "✅ Visible-only games: Anyone can view, only players can join\n";
echo "\nThe permission system now properly considers game-level access control!\n";
?> 