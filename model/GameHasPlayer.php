<?php
require_once('Crud.php');

class TextHasKeyword extends Crud{

    public $table = 'text_has_keyword';
    public $primaryKey = ['game_id', 'player_id'];
    public $fillable = ['game_id',
                        'player_id',
                        'active' /* to manage instances where players are invited, but don't accept invitation */
                        ];

    
}