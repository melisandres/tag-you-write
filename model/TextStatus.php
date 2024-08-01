<?php
require_once('Crud.php');

class TextStatus extends Crud{

    public $table = 'text_status';
    public $primaryKey = 'id';
    public $fillable = ['status'];
 
}