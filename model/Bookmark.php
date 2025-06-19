<?php
require_once('Crud.php');

class Bookmark extends Crud{

    public $table = 'bookmark';
    public $primaryKey = ['writer_id', 'text_id'];
    public $fillable = ['text_id',
                        'writer_id',
                        'bookmarked_at'
                        ];
 
} 