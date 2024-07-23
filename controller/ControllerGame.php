<?php
RequirePage::model('Text');
RequirePage::model('Game');

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

    public function closeGame($id){
        $text = new Text;
        $game = new Game;
        $gameId = $text->selectGameId($id);
        $gameData = [
                    'id' => $gameId,
                    'winner' => $id,
                    'open_for_changes' => 0
                    ];
        $game->update($gameData);
        return;
    }

    public function checkWin(){
        //for now we check for wins in the vote controller

    }

    public function validateNewGame(){

    }
    
}

?>