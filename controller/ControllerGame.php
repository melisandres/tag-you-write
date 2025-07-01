<?php
RequirePage::model('Text');
RequirePage::model('Game');
RequirePage::controller('ControllerNotification');
RequirePage::controller('ControllerText');
RequirePage::model('Event');

class ControllerGame extends Controller {

    public function index(){
    }

    public function createGame($data) {
        $game = new Game;
        
        // Set default values for access control if not provided
        $visibleToAll = isset($data['visible_to_all']) ? (int)$data['visible_to_all'] : 1; // Default: visible to all
        $joinableByAll = isset($data['joinable_by_all']) ? (int)$data['joinable_by_all'] : 1; // Default: joinable by all
        
        $gameData = [
            'prompt' => $data['prompt'],
            'visible_to_all' => $visibleToAll,
            'joinable_by_all' => $joinableByAll
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

            $game = new Game();
            $games = $game->getGames(null, $filters, null, $searchTerm);  // Pass search term to model

            header('Content-Type: application/json');
            echo json_encode($games);
        } catch (Exception $e) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    //TODO: this is where you are at: check for modified nodes also... if you are sent a rootStoryId, and a timestamp... no time stamp means all the tree... .
    public function modifiedSince() {
        try {
            $data = json_decode(file_get_contents('php://input'), true);

            $currentUserId = $_SESSION['writer_id'] ?? null;
            
            // Convert timestamp to datetime
            $lastTreeCheck = date('Y-m-d H:i:s', (int)($data['lastTreeCheck'] / 1000));
            $lastGamesCheck = date('Y-m-d H:i:s', (int)($data['lastGamesCheck'] / 1000));

            // Get the search term, filters and the rootStoryId
            $searchTerm = $data['search'] ?? null;
            $filters = $data['filters'] ?? [];
            $rootStoryId = $data['rootStoryId'] ?? null;
            
            $game = new Game();
            $text = new Text();
            
            // Get the modified games with search term
            $modifiedGames = $game->getModifiedSince($lastGamesCheck, $filters, $searchTerm);

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
                'searchResults' => $searchResults
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