<?php


class Twig{
    static  public function render($template, $data=array()){
        $loader = new \Twig\Loader\FilesystemLoader('view');
        $twig = new \Twig\Environment($loader, array('auto_reload' => true)); 

        // Store the path in a variable that will be accessible in the closure
        $basePath = 'http://localhost:8888/tag-you-write-repo/tag-you-write/';
        
        $twig->addGlobal('path', $basePath);
        
        $twig->addGlobal('current_language', getCurrentLanguage());

        if(isset($_SESSION['fingerPrint']) && $_SESSION['fingerPrint'] == md5($_SERVER['HTTP_USER_AGENT'].$_SERVER['REMOTE_ADDR'])){
            $guest = false;
        }else{
            $guest = true;
        }

        $twig->addGlobal('session', $_SESSION);

        $twig->addGLobal('guest', $guest);

        // a function to "translate" a url (insert the current language)
        $twig->addFunction(new \Twig\TwigFunction('langUrl', function($path, $lang = null) use ($basePath) {
            // Use provided language or current language
            $lang = $lang ?: getCurrentLanguage();
            
            // If path already starts with a slash, remove it
            $path = ltrim($path, '/');
            
            // Construct the full URL with base path and language
            return $basePath . $lang . '/' . $path;
        }));

        // a function to translate a text
        $twig->addFunction(new \Twig\TwigFunction('translate', function($key, $replacements = [], $raw = false) {
            $lang = getCurrentLanguage();
            $translations = json_decode(file_get_contents("translations/{$lang}.json"), true);
            
            if (!isset($translations[$key])) {
                return $key;
            }
            
            $text = $translations[$key];
            foreach ($replacements as $placeholder => $value) {
                $text = str_replace("{{$placeholder}}", $value, $text);
            }
            
            return $raw ? new \Twig\Markup($text, 'UTF-8') : $text;
        }));

        echo $twig->render($template, $data);
    }

}


?>