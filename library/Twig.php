<?php


class Twig{
    static  public function render($template, $data=array()){
        $loader = new \Twig\Loader\FilesystemLoader('view');
        $twig = new \Twig\Environment($loader, array('auto_reload' => true)); 

        // Store the path in a variable that will be accessible in the closure
        $basePath =  $_ENV['BASE_URL'];
        
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

        // a function to build query string with filters/search
        $twig->addFunction(new \Twig\TwigFunction('buildQueryString', function($filters = [], $search = null, $category = null) {
            $params = [];
            
            // Add category if provided
            if ($category) {
                $params['category'] = $category;
            }
            
            // Add filters if provided
            if (isset($filters['hasContributed']) && $filters['hasContributed'] !== null) {
                $params['hasContributed'] = $filters['hasContributed'] === true ? 'contributor' : 
                                           ($filters['hasContributed'] === 'mine' ? 'mine' : 'all');
            }
            
            if (isset($filters['gameState']) && $filters['gameState'] !== 'all') {
                $params['gameState'] = $filters['gameState'];
            }
            
            if (isset($filters['bookmarked']) && $filters['bookmarked'] !== null) {
                $params['bookmarked'] = $filters['bookmarked'] === true ? 'bookmarked' : 'not_bookmarked';
            }
            
            // Add search if provided
            if ($search) {
                $params['search'] = $search;
            }
            
            return http_build_query($params);
        }));
        
        // a function to translate a text
        $twig->addFunction(new \Twig\TwigFunction('translate', function($key, $replacements = [], $raw = false) {
            $lang = getCurrentLanguage();
            $translations = json_decode(file_get_contents("translations/{$lang}.json"), true);
            
            // Handle nested keys like "header.home"
            if (strpos($key, '.') !== false) {
                $parts = explode('.', $key);
                $current = $translations;
                
                // Navigate through the nested structure
                foreach ($parts as $part) {
                    if (isset($current[$part])) {
                        $current = $current[$part];
                    } else {
                        // If any part of the path doesn't exist, return the key
                        return $key;
                    }
                }
                
                $text = $current;
            } else {
                // Handle flat keys for backward compatibility
                $text = isset($translations[$key]) ? $translations[$key] : $key;
            }
            
            foreach ($replacements as $placeholder => $value) {
                $text = str_replace("{{$placeholder}}", $value, $text);
            }
            
            return $raw ? new \Twig\Markup($text, 'UTF-8') : $text;
        }));

        echo $twig->render($template, $data);
    }

}


?>