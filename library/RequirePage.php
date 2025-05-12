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

    static public function service($page) {
        return require_once('services/' . $page . '.php');
    }

    static public function redirect($page){
        $lang = defined('CURRENT_LANGUAGE') ? CURRENT_LANGUAGE : 'en';
        
        $baseUrl = self::getBaseUrl();
        
        // If page already includes language, don't add it again
        if (strpos($page, $lang . '/') === 0) {
            header('location:' . $baseUrl . $page);
        } else {
            header('location:' . $baseUrl . $lang . '/' . ltrim($page, '/'));
        }
    }

    static public function getBaseUrl(){
        return $_ENV['BASE_URL'];
    }
}


?>