<?php
require_once('Crud.php');

class Seen extends Crud{

    public $table = 'seen';
    public $primaryKey = ['writer_id', 'text_id'];
    public $fillable = ['text_id',
                        'writer_id',
                        'read_at'
                        ];
 
}