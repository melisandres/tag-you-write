<?php

class ControllerHome extends Controller {

    public function index(){
        Twig::render('home-index.php', ['name' => 'dear writer']);
     }

    public function error(){
       Twig::render('home-error.php');
    }
}

?>