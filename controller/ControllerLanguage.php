<?php


class ControllerLanguage extends Controller {
    private $supportedLanguages = ['en', 'fr']; // Keep in sync with your main list
    private $translationsPath;
    
    public function __construct() {
        //parent::__construct();
        $this->translationsPath = PATH_DIR . 'translations/';
    }

    public function index() {
        // WE don't need an index page for this controller
    }

    //TODO: not sure if this is usefull
    public function getLanguage() {
        return $_SESSION['language'];
    }

    /**
     * Get translations for a specific language
     * Route: /language/translations/[lang]
     */
    public function translations($lang = null) {
        // If no language specified, use current language
        if (!$lang) {
            $lang = getCurrentLanguage();
        }
        
        // Validate language
        if (!in_array($lang, $this->supportedLanguages)) {
            header('HTTP/1.0 404 Not Found');
            echo json_encode(['error' => 'Language not supported']);
            return;
        }
        
        // Path to translation file
        $filePath = $this->translationsPath . $lang . '.json';
        
        // Check if file exists
        if (!file_exists($filePath)) {
            header('HTTP/1.0 404 Not Found');
            echo json_encode(['error' => 'Translation file not found']);
            return;
        }
        
        // Set content type
        header('Content-Type: application/json');
        
        // Read and return the file contents
        echo file_get_contents($filePath);
    }
    
    /**
     * Set the current language (optional - you might not need this)
     * Route: /language/set/[lang]
     * I think the idea is to only set it via the URL
     */
    public function set($lang) {
        if (!in_array($lang, $this->supportedLanguages)) {
            header('HTTP/1.0 400 Bad Request');
            echo json_encode(['error' => 'Language not supported']);
            return;
        }
        
        // Store in session
        $_SESSION['language'] = $lang;
        
        // Return success response
        echo json_encode(['success' => true, 'language' => $lang]);
    }
}