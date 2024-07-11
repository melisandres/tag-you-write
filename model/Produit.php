<?php

require_once('Crud.php');

class Produit extends Crud{
    public $table = 'produit';
    public $primaryKey = 'id';

}