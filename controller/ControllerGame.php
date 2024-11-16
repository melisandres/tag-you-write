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

    public function modifiedSince() {
        try {
            // Debug incoming request
            error_log('Received modifiedSince request');
            
            // Get JSON data from request body
            $jsonData = file_get_contents('php://input');
            error_log('Received JSON data: ' . $jsonData);
            
            $data = json_decode($jsonData, true);
            error_log('Decoded data: ' . print_r($data, true));
            
            if (!isset($data['lastCheck'])) {
                throw new Exception('Missing lastCheck parameter');
            }
    
            // Convert JavaScript timestamp to MySQL datetime
            $lastCheck = date('Y-m-d H:i:s', $data['lastCheck'] / 1000);
            error_log('Converted lastCheck to: ' . $lastCheck);
            
            $game = new Game();
            $modifiedGames = $game->getModifiedSince($lastCheck);
            
            // Debug response
            error_log('Sending response: ' . json_encode($modifiedGames));
            
            header('Content-Type: application/json');
            echo json_encode($modifiedGames);
        } catch (Exception $e) {
            error_log('Error in modifiedSince: ' . $e->getMessage());
            header('Content-Type: application/json');
            http_response_code(400);
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