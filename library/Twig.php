<?php


class Twig{
    static  public function render($template, $data=array()){
        $loader = new \Twig\Loader\FilesystemLoader('view');
        $twig = new \Twig\Environment($loader, array('auto_reload' => true)); 

        $twig->addGlobal('path', 'http://localhost:8888/tag-you-write-repo/tag-you-write/');

        if(isset($_SESSION['fingerPrint']) && $_SESSION['fingerPrint'] == md5($_SERVER['HTTP_USER_AGENT'].$_SERVER['REMOTE_ADDR'])){
            $guest = false;
        }else{
            $guest = true;
        }

        $twig->addGlobal('session', $_SESSION);

        $twig->addGLobal('guest', $guest);


        echo $twig->render($template, $data);
    }

}


?>