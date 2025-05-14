<?php
/**
 * Bootstrap Class for SSE Implementation
 * 
 * Handles loading of environment variables, configuration files,
 * and database connection parameters.
 */
class Bootstrap {
    // Root directory path
    private $rootDir;
    
    // Database configuration
    private $dbHost;
    private $dbName;
    private $dbUser;
    private $dbPassword;
    private $dbCharset;
    
    /**
     * Constructor - initialize and load everything
     */
    public function __construct() {
        // Set root directory
        $this->rootDir = realpath(__DIR__ . '/../../');
        
        // Load configuration in the correct order
        $this->loadEnvironmentVariables();
        $this->loadTimezoneConfig();
        $this->verifyDatabaseCredentials();
        $this->setGlobalVariables();
    }
    
    /**
     * Load environment variables from .env file
     * 
     * @throws Exception If the .env file cannot be loaded
     */
    private function loadEnvironmentVariables() {
        $envPath = $this->rootDir . '/config/load_env.php';
        
        if (!file_exists($envPath)) {
            throw new Exception("Environment loader not found at $envPath");
        }
        
        require_once($envPath);
    }
    
    /**
     * Load timezone configuration
     * 
     * @throws Exception If the timezone configuration file cannot be loaded
     */
    private function loadTimezoneConfig() {
        $timezonePath = $this->rootDir . '/config/timezone_config.php';
        
        if (!file_exists($timezonePath)) {
            throw new Exception("Timezone configuration not found at $timezonePath");
        }
        
        require_once($timezonePath);
    }
    
    /**
     * Verify that database credentials are available
     * 
     * @throws Exception If required database credentials are missing
     */
    private function verifyDatabaseCredentials() {
        if (!getenv('DB_HOST') || !getenv('DB_USER') || !getenv('DB_NAME')) {
            throw new Exception("Database configuration missing. Please check .env file.");
        }
        
        // Store database configuration
        $this->dbHost = getenv('DB_HOST');
        $this->dbName = getenv('DB_NAME');
        $this->dbUser = getenv('DB_USER');
        $this->dbPassword = getenv('DB_PASSWORD') !== false ? getenv('DB_PASSWORD') : '';
        $this->dbCharset = getenv('DB_CHARSET') ?: 'utf8mb4';
    }
    
    /**
     * Set global variables for legacy compatibility
     */
    private function setGlobalVariables() {
        // Database configuration - expose as globals for legacy compatibility
        $GLOBALS['DB_HOST'] = $this->dbHost;
        $GLOBALS['DB_NAME'] = $this->dbName;
        $GLOBALS['DB_USER'] = $this->dbUser;
        $GLOBALS['DB_PASSWORD'] = $this->dbPassword;
        $GLOBALS['DB_CHARSET'] = $this->dbCharset;
    }
    
    /**
     * Get the application's root directory
     * 
     * @return string The absolute path to the application root
     */
    public function getRootDir() {
        return $this->rootDir;
    }
}

// Initialize the bootstrap when this file is included
$bootstrap = new Bootstrap();

// Define ROOT_DIR constant for backward compatibility
if (!defined('ROOT_DIR')) {
    define('ROOT_DIR', $bootstrap->getRootDir());
} 