<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

session_start();
define('PATH_DIR', __DIR__.'/');
require_once (__DIR__.'/config/load_env.php');
require_once (__DIR__.'/controller/Controller.php');
require_once (__DIR__.'/library/RequirePage.php');
require_once (__DIR__.'/vendor/autoload.php');
require_once (__DIR__.'/library/Twig.php');
require_once (__DIR__.'/library/CheckSession.php');
require_once (__DIR__.'/library/languages.php');

// Define supported languages
$supportedLanguages = ['en', 'fr']; // Add all languages you support
$defaultLanguage = 'en';

// Get URL from GET parameter as you currently do
$url = isset($_GET["url"]) ? explode('/', ltrim($_GET["url"], '/')) : '/';

// Check if the first segment is a language code
$currentLanguage = $defaultLanguage;

if($url !== '/' && !empty($url[0]) && in_array($url[0], $supportedLanguages)) {
    $currentLanguage = $url[0];
    // Remove language from URL segments for further routing
    array_shift($url);
    // If URL is now empty or contains only an empty string, treat it as home
    if(empty($url) || (count($url) === 1 && $url[0] === '')) {
        $url = '/';
    }
} else if($url !== '/' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
    // Only redirect for GET requests, not POST
    // No language in URL, redirect to add default language
    $currentUrl = $_SERVER['REQUEST_URI'];
    $baseUrl = str_replace('index.php', '', $_SERVER['SCRIPT_NAME']);
    
    // If we're at the root path
    if ($currentUrl == $baseUrl || $currentUrl == $baseUrl . 'index.php') {
        header('Location: ' . $baseUrl . $defaultLanguage);
        exit;
    } else {
        // For other paths, preserve the path but add language
        $path = substr($currentUrl, strlen($baseUrl));
        header('Location: ' . $baseUrl . $defaultLanguage . '/' . ltrim($path, '/'));
        exit;
    }
}

// Store current language in a constant or session for later use
define('CURRENT_LANGUAGE', $currentLanguage);
// Optionally store in session if you want it to persist
$_SESSION['language'] = $currentLanguage;

// Continue with your existing routing logic
if($url === '/'){
    // Home page route
    $controllerHome = __DIR__.'/controller/ControllerHome.php';
    require_once $controllerHome;
    $controller = new ControllerHome();
    echo $controller->index();
} else {
    // Make sure we're not trying to use an empty string as a controller name
    if (is_array($url) && (empty($url[0]) || $url[0] === '')) {
        // This is also a home page case
        $controllerHome = __DIR__.'/controller/ControllerHome.php';
        require_once $controllerHome;
        $controller = new ControllerHome();
        echo $controller->index();
    } else {
        $requestURL = $url[0];
        $requestURL = ucfirst($requestURL);
        $controllerPath = __DIR__.'/controller/Controller'.$requestURL.'.php';

        if(file_exists($controllerPath)){
            require_once($controllerPath);
            $controllerName = 'Controller'.$requestURL;
            $controller = new $controllerName();

            if(isset($url[1])){
                $method = $url[1]; 

                if(isset($url[3])){
                    $param = $url[3];
                    $id = $url[2];
                    echo $controller->$method($id, $param);
                }
                elseif(isset($url[2])){
                    $id = $url[2];
                    echo $controller->$method($id);
                }else{
                    echo $controller->$method();
                } 
            }else{
                echo $controller->index();
            }
        }else{
            $controllerHome = __DIR__.'/controller/ControllerHome.php';
            require_once $controllerHome;
            $controller = new ControllerHome();
            echo $controller->error();
        }
    }
}
?>

