<?php

class DatabaseConnection {
    private static $instance = null;
    private static $connections = [];
    private static $maxConnections = 10;
    private static $connectionTimeout = 300; // 5 minutes
    
    private function __construct() {}
    
    /**
     * Get a database connection
     * 
     * @return PDO The database connection
     */
    public static function getConnection() {
        // Clean up old connections
        self::cleanupConnections();
        
        // If we have available connections, return one
        if (!empty(self::$connections)) {
            $connection = array_pop(self::$connections);
            if ($connection->getAttribute(PDO::ATTR_CONNECTION_STATUS) === 'Connected') {
                return $connection;
            }
        }
        
        // Create new connection if we haven't reached the limit
        if (count(self::$connections) < self::$maxConnections) {
            $host = getenv('DB_HOST') ?: 'localhost';
            $dbname = getenv('DB_NAME') ?: 'tag';
            $port = getenv('DB_PORT') ?: '8889';
            $charset = getenv('DB_CHARSET') ?: 'utf8';
            $user = getenv('DB_USER') ?: 'root';
            $password = getenv('DB_PASSWORD') ?: '';
            
            $dsn = "mysql:host={$host}; dbname={$dbname}; port={$port}; charset={$charset}";
            
            try {
                $connection = new PDO($dsn, $user, $password, [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_PERSISTENT => false // Don't use persistent connections
                ]);
                return $connection;
            } catch (PDOException $e) {
                error_log("Database connection error: " . $e->getMessage());
                throw $e;
            }
        }
        
        throw new Exception("Maximum number of database connections reached");
    }
    
    /**
     * Release a connection back to the pool
     * 
     * @param PDO $connection The connection to release
     */
    public static function releaseConnection($connection) {
        if ($connection instanceof PDO) {
            // Reset the connection state
            $connection->exec("SET SESSION wait_timeout = " . self::$connectionTimeout);
            self::$connections[] = $connection;
        }
    }
    
    /**
     * Clean up old connections
     */
    private static function cleanupConnections() {
        $now = time();
        foreach (self::$connections as $key => $connection) {
            try {
                // Test if connection is still alive
                $connection->query('SELECT 1');
            } catch (PDOException $e) {
                // Remove dead connection
                unset(self::$connections[$key]);
            }
        }
    }
    
    /**
     * Close all connections
     */
    public static function closeAllConnections() {
        foreach (self::$connections as $connection) {
            $connection = null;
        }
        self::$connections = [];
    }
} 