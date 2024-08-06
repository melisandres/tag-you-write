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
        $gameId = $text->selectGameId($textId);         $gameData = [
                    'id' => $gameId,
                    'winner' => $textId,
                    'open_for_changes' => 0
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

    public function checkWin(){
        //for now we check for wins in the vote controller

    }

    public function validateNewGame(){

    }
    
}
?>