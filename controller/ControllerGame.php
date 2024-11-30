<?php
RequirePage::model('Text');
RequirePage::model('Game');
RequirePage::controller('ControllerNotification');
RequirePage::controller('ControllerText');

class ControllerGame extends Controller {

    public function index(){
    }

    public function createGame($data) {
        $game = new Game;
        $gameData = ['prompt' => $data['prompt']];

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
        $gameId = $text->selectGameId($textId);         
        $gameData = [
                    'id' => $gameId,
                    'winner' => $textId,
                    'open_for_changes' => 0,
                    'modified_at' => date('Y-m-d H:i:s')
                    ];
        $game->update($gameData);

        $players = $game->getPlayers($gameId);
        

        // Create notifications for each player
        $notification = new ControllerNotification;
        foreach ($players as $player) {
            $notification->create($player['writer_id'], $gameId, 'game_won');
        }
        
        return;
    }

    public function getGames() {
        try {
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            $filters = $data['filters'] ?? [];

            $game = new Game();
            $games = $game->getGames(null, $filters);  // Pass filters to model

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
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (!isset($data['lastGamesCheck'])) {
                throw new Exception('Missing lastGamesCheck parameter');
            }

            // Our user is logged in? 
            $currentUserId = $_SESSION['writer_id'] ?? null;
            
            // Convert timestamp to datetime
            $lastTreeCheck =  date('Y-m-d H:i:s', $data['lastTreeCheck'] / 1000);
            $lastGamesCheck = date('Y-m-d H:i:s', $data['lastGamesCheck'] / 1000);
            
            // Get the filters and the rootStoryId
            $filters = $data['filters'] ?? [];
            $rootStoryId = $data['rootStoryId'] ?? null;
            
            $game = new Game();
            $text = new Text();
            // Get the modified games
            $modifiedGames = $game->getModifiedSince($lastGamesCheck, $filters);

            // Get the modified nodes
            $gameId = $game->selectGameId($rootStoryId); 
            $modifiedNodes = $text->selectTexts($currentUserId, $gameId, true, $lastTreeCheck);

            // Add permissions to the modified nodes
            if (!empty($modifiedNodes)) {
                $this->addPermissions($modifiedNodes[0], $currentUserId, $modifiedNodes);
            }

            // Ensure data is properly formatted
            $response = [
                'modifiedGames' => array_values($modifiedGames), // Convert to indexed array
                'modifiedNodes' => array_values($modifiedNodes)  // Convert to indexed array
            ];
            
            header('Content-Type: application/json');
            echo json_encode($response, JSON_NUMERIC_CHECK); // Add JSON_NUMERIC_CHECK
        } catch (Exception $e) {
            error_log('Error in modifiedSince: ' . $e->getMessage());
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    private function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        // selectTexts adds hasContributed, isWinner, and openForChanges, but 
        // the front end works better if these are just true/false instead of 0/1
        $node['hasContributed'] = $node['hasContributed'] == 1 ? true : false;
        $node['isWinner'] = $node['isWinner'] == 1 ? true : false;
        $node['openForChanges'] = $node['openForChanges'] == 1 ? true : false;

        RequirePage::library('Permissions');
        $node = Permissions::aggregatePermissions($node, $currentUserId);
        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->addPermissions($child, $currentUserId, $hierarchy);
            }
        }
    }

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