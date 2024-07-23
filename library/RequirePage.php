<?php

class RequirePage{
    static public function model($page){
        return require_once('model/'.$page.'.php');
    }

    static public function controller($page){
        return require_once('controller/'.$page.'.php');
    }
    
    static public function library($page){
        return require_once('library/'.$page.'.php');
    }

    static public function redirect($page){
        header('location:http://localhost:8888/tag-you-write-repo/tag-you-write/'.$page);

    }
}


?>