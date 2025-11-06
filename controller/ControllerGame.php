<?php
RequirePage::model('Text');
RequirePage::model('Game');
RequirePage::controller('ControllerNotification');
RequirePage::controller('ControllerText');
RequirePage::model('Event');

class ControllerGame extends Controller {

    public function index(){
    }

    /**
     * Auto-set is_test for beta testers
     * TODO: Remove this method when beta testing ends
     * This automatically sets is_test = 'beta' for users with beta_tester privilege
     */
    private function autoSetBetaTestGame(&$data) {
        // Only auto-set if user is beta tester and is_test not already set
        if (!isset($data['is_test']) && isset($_SESSION['privilege']) && $_SESSION['privilege'] == 4) {
            $data['is_test'] = 'beta';
        }
    }

    public function createGame($data) {
        $game = new Game;
        
        // Set default values for access control if not provided
        $visibleToAll = isset($data['visible_to_all']) ? (int)$data['visible_to_all'] : 1; // Default: visible to all
        $joinableByAll = isset($data['joinable_by_all']) ? (int)$data['joinable_by_all'] : 1; // Default: joinable by all
        
        // Auto-set is_test for beta testers (if not already set by admin)
        $this->autoSetBetaTestGame($data);
        
        // Handle is_test parameter (NULL, 'dev', or 'beta')
        $isTest = null;
        if (isset($data['is_test'])) {
            $isTestValue = $data['is_test'];
            // Validate: must be NULL, 'dev', or 'beta'
            if ($isTestValue === 'dev' || $isTestValue === 'beta') {
                $isTest = $isTestValue;
            } elseif ($isTestValue === null || $isTestValue === '') {
                $isTest = null; // Production game
            } else {
                // Invalid value, log warning and default to NULL
                error_log("Invalid is_test value: " . $isTestValue . ". Defaulting to NULL (production game).");
                $isTest = null;
            }
        }
        // Default: NULL (production game) if not provided
        
        $gameData = [
            'prompt' => $data['prompt'],
            'visible_to_all' => $visibleToAll,
            'joinable_by_all' => $joinableByAll,
            'is_test' => $isTest
        ];

        $gameId = $game->insert($gameData);
        if (!$gameId || is_array($gameId)) {
            error_log("Game insert failed: " . print_r($gameId, true));
            return false;
        }
        return $gameId;
    }

    public function closeGame($textId){
        $text = new Text;
        $game = new Game;
        $event = new Event;
        $gameId = $text->selectGameId($textId);         
        $gameData = [
                    'id' => $gameId,
                    'winner' => $textId,
                    'open_for_changes' => 0,
                    'modified_at' => date('Y-m-d H:i:s')
                    ];

        $game->update($gameData);

        // Get the root_text_id
        $root_text_id = $game->getRootText($gameId);

        // Get text data for the event
        $textData = $text->selectTexts($_SESSION['writer_id'], $textId);
        $isRoot = empty($textData['parent_id']);
        $textTitle = $textData['title'] ?? 'Unknown Title';

        // Use the Controller's createEvents method for consistent event creation
        // Special GAME_CLOSED event type for game closures
        $this->createEvents('GAME_CLOSED', [
            'textId' => $textId,
            'gameId' => $gameId,
            'title' => $textTitle,
            'isRoot' => $isRoot
        ], 'game_closure');

        // Get all players -- to create notifications for each player
        $players = $game->getPlayers($gameId);
        $winning_player = $text->selectWriterId($textId, 'writer_id');
        
        // Create notifications for each player
        $notification = new ControllerNotification;
        foreach ($players as $player) {
            $notification_type = ($player['writer_id'] == $winning_player['writer_id']) 
                ? 'game_won' 
                : 'game_closed';

            $notification_id = $notification->create(
                $player['writer_id'], 
                $gameId, 
                $notification_type,
                null  // No message needed, will be constructed in template
            );

            // Create a notification event using the createEvents method
            $this->createEvents('NOTIFICATION_CREATED', [
                'notificationId' => $notification_id,
                'recipientId' => $player['writer_id'],
                'notificationType' => $notification_type,
                'textId' => $textId, // Include the winning text ID for context
                'gameId' => $gameId, // Include the game ID
                'rootTextId' => $root_text_id, // Add the root_text_id explicitly
                'info' => "notification for $notification_type"
            ], 'game_closure');
        }
        
        return;
    }

    public function getGames() {
        try {
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            $filters = $data['filters'] ?? [];
            $searchTerm = $data['search'] ?? null;
            $category = $data['category'] ?? null;
            
            // Get showcase parameters from POST data
            $showcaseRootStoryId = $data['rootStoryId'] ?? null; // This is the root text_id (rt.id in SQL)

            // Debug logging
            error_log("ControllerGame::getGames - Category: " . ($category ?? 'null'));
            error_log("ControllerGame::getGames - Filters: " . print_r($filters, true));
            error_log("ControllerGame::getGames - ShowcaseRootStoryId: " . ($showcaseRootStoryId ?? 'null'));

            $game = new Game();
            $games = $game->getGames(null, $filters, null, $searchTerm, $category, $showcaseRootStoryId);

            error_log("ControllerGame::getGames - Returned " . count($games) . " games");

            header('Content-Type: application/json');
            echo json_encode($games);
        } catch (Exception $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    /**
     * Detect games that should be removed from the current view
     * 
     * Uses a two-query approach:
     * 1. Query with filters → gets games that match AND were modified
     * 2. Query without filters → gets ALL modified games
     * 3. Compare to find games that were modified but no longer match filters
     * 
     * @param Game $gameModel Game model instance
     * @param string $lastGamesCheck Timestamp of last check
     * @param array $filters Current filters
     * @param string|null $searchTerm Current search term
     * @param string|null $category Current category
     * @param int|null $rootStoryId Current root story ID (for showcase)
     * @param array $modifiedGames Games that match filters (from first query)
     * @return array Array of game IDs that should be removed
     */
    private function detectGameRemovals($gameModel, $lastGamesCheck, $filters, $searchTerm, $category, $rootStoryId, $modifiedGames) {
        // If no filters/search/category are active, no removals needed
        // Check if filters array has any non-null values
        $hasActiveFilters = false;
        if (is_array($filters)) {
            foreach ($filters as $value) {
                if ($value !== null && $value !== '') {
                    $hasActiveFilters = true;
                    break;
                }
            }
        }
        $hasFilters = $hasActiveFilters || !empty($searchTerm) || !empty($category);
        if (!$hasFilters) {
            return [];
        }
        
        // Get all modified games (without filters) to compare
        $allModifiedGames = $gameModel->getModifiedSince($lastGamesCheck, [], null, null, $rootStoryId);
        
        // Extract game IDs from both lists
        $matchingGameIds = array_column($modifiedGames, 'game_id');
        $allModifiedGameIds = array_column($allModifiedGames, 'game_id');
        
        // Find games that were modified but don't match current filters
        $gameIdsForRemoval = array_diff($allModifiedGameIds, $matchingGameIds);
        
        return array_values($gameIdsForRemoval);
    }

    //TODO: this is where you are at: check for modified nodes also... if you are sent a rootStoryId, and a timestamp... no time stamp means all the tree... .
    public function modifiedSince() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $currentUserId = $_SESSION['writer_id'] ?? null;
            
            // Convert timestamp to datetime
            $lastTreeCheck = date('Y-m-d H:i:s', (int)($data['lastTreeCheck'] / 1000));
            $lastGamesCheck = date('Y-m-d H:i:s', (int)($data['lastGamesCheck'] / 1000));

            // Get the search term, filters, category and the rootStoryId
            $searchTerm = $data['search'] ?? null;
            $filters = $data['filters'] ?? [];
            $category = $data['category'] ?? null;
            $rootStoryId = $data['rootStoryId'] ?? null;
            // Note: rootStoryId is used for tree nodes, but should also be passed as showcaseRootStoryId
            // to getModifiedSince() in Step 2b to ensure showcase game is included even if it doesn't match filters
            
            $game = new Game();
            $text = new Text();
            
            // Get the modified games with search term and category
            // Pass rootStoryId as showcaseRootStoryId to ensure showcase game is included even if it doesn't match filters
            $modifiedGames = $game->getModifiedSince($lastGamesCheck, $filters, $searchTerm, $category, $rootStoryId);

            // Detect games that should be removed (modified but no longer match filters)
            $gameIdsForRemoval = $this->detectGameRemovals($game, $lastGamesCheck, $filters, $searchTerm, $category, $rootStoryId, $modifiedGames);

/*             // Process the modified games data to ensure boolean fields are properly formatted
            foreach ($modifiedGames as &$game) {
                $game['hasContributed'] = (bool)$game['hasContributed'];
                $game['hasJoined'] = (bool)$game['hasJoined'];
                $game['openForChanges'] = (bool)$game['openForChanges'];
            }
 */
            // Get the modified nodes
            $gameId = $game->selectGameId($rootStoryId);
            $modifiedNodes = $text->selectTexts($currentUserId, $gameId, true, $lastTreeCheck);

            // Search results
            $searchResults = $text->searchNodesByTerm($searchTerm, $gameId, $currentUserId, $lastTreeCheck);

            // Add permissions to the modified nodes
            if (!empty($modifiedNodes)) {
                foreach ($modifiedNodes as &$node) {
                    $this->addPermissions($node, $currentUserId, $modifiedNodes);
                }
            }

            // Ensure data is properly formatted
            $response = [
                'modifiedGames' => $modifiedGames,
                'modifiedNodes' => $modifiedNodes,
                'searchResults' => $searchResults,
                'gameIdsForRemoval' => $gameIdsForRemoval
            ];

            // Add logging after getting modified nodes
            //error_log("Modified nodes count: " . count($modifiedNodes));
            //error_log("Search results count: " . count($searchResults));

            header('Content-Type: application/json');
            echo json_encode($response, JSON_NUMERIC_CHECK);
        } catch (Exception $e) {
            error_log('Error in modifiedSince: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

/*     private function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        // Convert integer values to boolean
        $node['hasContributed'] = $node['hasContributed'] == 1;
        $node['isWinner'] = $node['isWinner'] == 1;
        $node['openForChanges'] = $node['openForChanges'] == 1;

        RequirePage::library('Permissions');
        $node = Permissions::aggregatePermissions($node, $currentUserId);
        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->addPermissions($child, $currentUserId, $hierarchy);
            }
        }
    } */

    // This works hand in hand with the library/permissions.php. It is a non recursive version of the addPermission in the controllerText class.
   /*  public function addPermissions ($nodes, $currentUserId) {
        // selectTexts adds hasContributed, isWinner, and openForChanges, but 
        // the front end works better if these are just true/false instead of 0/1
        RequirePage::library('Permissions');
        foreach ($nodes as $node) {
            $node = Permissions::aggregatePermissions($node, $currentUserId);
            $node['hasContributed'] = $node['hasContributed'] == 1 ? true : false;
            $node['isWinner'] = $node['isWinner'] == 1 ? true : false;
            $node['openForChanges'] = $node['openForChanges'] == 1 ? true : false;
            $this->addPermissions($node, $currentUserId, $node);
        }
    } */


    public function checkWin(){
        //for now we check for wins in the vote controller

    }

    public function validateNewGame(){

    }
}
?>