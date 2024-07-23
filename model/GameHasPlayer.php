<?php
require_once('Crud.php');

class GameHasPlayer extends Crud{

    public $table = 'game_has_player';
    public $primaryKey = 'game_id';
    public $secondaryKey = 'player_id';
    public $fillable = ['game_id',
                        'player_id',
                        'active' /* to manage instances where players are invited, but don't accept invitation */
                        ]; 
}