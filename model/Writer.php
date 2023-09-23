<?php
require_once('Crud.php');

class Writer extends Crud{

    public $table = 'writer';
    public $primaryKey = 'id';

    public $fillable = ['id',
                        'firstName',
                        'lastName',
                        'email',
                        'birthday',
                        'password',
                        ];

} 


?>