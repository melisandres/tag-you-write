<?php


class Twig{
    static  public function render($template, $data=array()){
        $loader = new \Twig\Loader\FilesystemLoader('view');
        $twig = new \Twig\Environment($loader, array('auto_reload' => true)); 

        $twig->addGlobal('path', 'http://localhost:8888/tag-you-write-repo/tag-you-write/');

        echo $twig->render($template, $data);
    }

}


?>