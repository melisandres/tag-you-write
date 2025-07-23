<?php

if (!defined('ROOT_DIR')) {
    define('ROOT_DIR', dirname(__DIR__));
}

class ControllerTest extends Controller{

    public function index(){
        
/*         echo "Current directory: " . __DIR__ . "\n";
        echo "Document root: " . $_SERVER['DOCUMENT_ROOT'] . "\n";
        echo "Script path: " . $_SERVER['SCRIPT_FILENAME'] . "\n"; */

    }

    public function activityMonitoring() {
        require_once(ROOT_DIR . '/view/test_activity_monitoring.php');
        // The script will output directly
    }
    
    public function activityBrowser() {
        require_once(ROOT_DIR . '/view/test_activity_browser.php');
    }
}