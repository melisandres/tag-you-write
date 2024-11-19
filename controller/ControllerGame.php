<?php
RequirePage::model('Text');
RequirePage::model('Game');
RequirePage::controller('ControllerNotification');

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

    public function modifiedSince() {
        try {
            $jsonData = file_get_contents('php://input');
            $data = json_decode($jsonData, true);
            
            if (!isset($data['lastCheck'])) {
                throw new Exception('Missing lastCheck parameter');
            }

            $lastCheck = date('Y-m-d H:i:s', $data['lastCheck'] / 1000);
            $filters = $data['filters'] ?? [];  // Get filters instead of gameIds
            
            $game = new Game();
            $modifiedGames = $game->getModifiedSince($lastCheck, $filters);
            
            header('Content-Type: application/json');
            echo json_encode($modifiedGames);
        } catch (Exception $e) {
            error_log('Error in modifiedSince: ' . $e->getMessage());
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    public function checkWin(){
        //for now we check for wins in the vote controller

    }

    public function validateNewGame(){

    }
    
}
?>