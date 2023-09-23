<?php
require_once('Crud.php');

class Text extends Crud{

    public $table = 'text';
    public $primaryKey = 'id';
    public $fillable = ['id',
                        'date',
                        'writing',
                        'writer_id',
                        'parent_id',
                        'title'
                        ];
}


?>