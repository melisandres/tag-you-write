<?php

require_once('Crud.php');

class Privilege extends Crud{
    public $table = 'privilege';
    public $primaryKey = 'id';

    public $fillable =[
        'id',
        'privilege',
    ];
}