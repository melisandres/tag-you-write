<?php
require_once('Crud.php');

class GameHasPlayer extends Crud{

    public $table = 'game_has_player';
    public $primaryKey = ['game_id', 'player_id'];
    public $secondaryKey = 'player_id';
    public $fillable = ['game_id',
                        'player_id',
                        'active' /* to manage instances where players are invited, but don't accept invitation */
                        ]; 

    public function selectPlayerCount($gameId) {
        $sql = "SELECT COUNT(*) FROM $this->table WHERE game_id = $gameId";
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':game_id', $gameId);
        $stmt->execute();
        return $stmt->fetch()['COUNT(*)'];
    }

    
}