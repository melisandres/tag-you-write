<?php
 require_once('Crud.php');

 class Game extends Crud{
    public $table = 'game';
    public $primaryKey = 'id';
    public $fillable = ['cadaver_id',
                        'root_text_id',
                        'prompt',
                        'phase',
                        'open_for_changes',
                        'open_for_writers',
                        'winner',
                        'mvp',
                        'public'
                        ];

    //this is to check if the win state has been reached
    public function checkWin() {

    }

 }