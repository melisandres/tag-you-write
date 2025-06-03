<?php

class DatabaseConnection {
    private static $instance = null;
    private static $connections = [];
    private static $maxConnections = 10;
    private static $connectionTimeout = 300; // 5 minutes
    private static $lastCleanup = 0;
    private static $cleanupInterval = 60; // Clean up every minute
    
    // Enhanced debugging - track connection usage
    private static $connectionStats = [
        'total_created' => 0,
        'total_released' => 0,
        'total_failed_tests' => 0,
        'current_active' => 0,
        'peak_usage' => 0
    ];
    
    private function __construct() {}
    
    /**
     * Get a database connection
     * 
     * @return PDO The database connection
     */
    public static function getConnection() {
        // Periodic cleanup of old connections
        self::periodicCleanup();
        
        // If we have available connections, test and return one
        if (!empty(self::$connections)) {
            foreach (self::$connections as $key => $connection) {
                try {
                    // Test pooled connections before reusing
                    if (self::testConnection($connection)) {
                        unset(self::$connections[$key]);
                        error_log("DatabaseConnection: Reusing pooled connection");
                        return $connection;
                    } else {
                        // Remove dead connection
                        error_log("DatabaseConnection: Removing dead pooled connection");
                        unset(self::$connections[$key]);
                        $connection = null;
                        continue;
                    }
                } catch (PDOException $e) {
                    // Remove dead connection
                    error_log("DatabaseConnection: Exception testing pooled connection: " . $e->getMessage());
                    unset(self::$connections[$key]);
                    $connection = null;
                    continue;
                }
            }
        }
        
        // Create new connection if we haven't reached the limit
        if (count(self::$connections) < self::$maxConnections) {
            // Fresh connections don't need testing - return immediately
            return self::createNewConnection();
        }
        
        throw new Exception("Maximum number of database connections reached");
    }
    
    /**
     * Test if a connection is still alive and responsive
     * 
     * @param PDO $connection The connection to test
     * @return bool True if connection is alive
     */
    private static function testConnection($connection) {
        try {
            // Simple test with just a basic query
            $stmt = $connection->query('SELECT 1');
            $result = $stmt->fetchColumn();
            
            // Return true if we got the expected result
            $isValid = ($result == 1); // Use == instead of === for type flexibility
            
            if (!$isValid) {
                error_log("Connection test failed: Expected 1, got " . var_export($result, true));
            }
            
            return $isValid;
        } catch (PDOException $e) {
            error_log("Connection test failed with exception: " . $e->getMessage());
            return false;
        } catch (Exception $e) {
            error_log("Connection test failed with general exception: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Create a new database connection
     * 
     * @return PDO The new connection
     */
    private static function createNewConnection() {
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
                PDO::ATTR_EMULATE_PREPARES => true,
                PDO::MYSQL_ATTR_INIT_COMMAND => "SET SESSION wait_timeout=" . self::$connectionTimeout,
                PDO::ATTR_PERSISTENT => false // Don't use persistent connections
            ]);
            
            // Set session variables
            $connection->exec("SET SESSION wait_timeout=" . self::$connectionTimeout);
            $connection->exec("SET SESSION interactive_timeout=" . self::$connectionTimeout);
            
            // Update statistics
            self::$connectionStats['total_created']++;
            self::$connectionStats['current_active']++;
            self::$connectionStats['peak_usage'] = max(self::$connectionStats['peak_usage'], self::$connectionStats['current_active']);
            
            error_log("DatabaseConnection: Created new connection (Total: " . self::$connectionStats['total_created'] . 
                     ", Active: " . self::$connectionStats['current_active'] . 
                     ", Peak: " . self::$connectionStats['peak_usage'] . ")");
            return $connection;
        } catch (PDOException $e) {
            error_log("Database connection error: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Release a connection back to the pool
     * 
     * @param PDO $connection The connection to release
     */
    public static function releaseConnection($connection) {
        if ($connection instanceof PDO) {
            try {
                // Test if connection is still alive before returning to pool
                if (self::testConnection($connection)) {
                    // Reset the connection state
                    $connection->exec("SET SESSION wait_timeout = " . self::$connectionTimeout);
                    $connection->exec("SET SESSION interactive_timeout = " . self::$connectionTimeout);
                    
                    // Add to pool
                    self::$connections[] = $connection;
                    
                    // Update statistics
                    self::$connectionStats['total_released']++;
                    self::$connectionStats['current_active']--;
                    
                    error_log("DatabaseConnection: Released connection back to pool (Active: " . 
                             self::$connectionStats['current_active'] . 
                             ", Pool size: " . count(self::$connections) . ")");
                } else {
                    // Update statistics for failed test
                    self::$connectionStats['total_failed_tests']++;
                    self::$connectionStats['current_active']--;
                    
                    error_log("DatabaseConnection: Connection failed test, not returning to pool (Active: " . 
                             self::$connectionStats['current_active'] . 
                             ", Failed tests: " . self::$connectionStats['total_failed_tests'] . ")");
                    $connection = null; // Ensure connection is closed
                }
            } catch (PDOException $e) {
                // Update statistics for release failure
                self::$connectionStats['current_active']--;
                
                error_log("Failed to release connection: " . $e->getMessage() . 
                         " (Active: " . self::$connectionStats['current_active'] . ")");
                $connection = null; // Ensure connection is closed
            }
        }
    }
    
    /**
     * Periodic cleanup of old connections
     */
    private static function periodicCleanup() {
        $now = time();
        if (($now - self::$lastCleanup) >= self::$cleanupInterval) {
            self::cleanupConnections();
            self::$lastCleanup = $now;
        }
    }
    
    /**
     * Clean up old connections
     */
    private static function cleanupConnections() {
        foreach (self::$connections as $key => $connection) {
            try {
                // Test if connection is still alive
                $connection->query('SELECT 1');
            } catch (PDOException $e) {
                // Remove dead connection
                unset(self::$connections[$key]);
                $connection = null;
            }
        }
    }
    
    /**
     * Close all connections
     */
    public static function closeAllConnections() {
        foreach (self::$connections as $key => $connection) {
            try {
                $connection = null;
            } catch (Exception $e) {
                error_log("Error closing connection: " . $e->getMessage());
            }
        }
        self::$connections = [];
    }
    
    /**
     * Force refresh all connections in the pool (useful for long-running processes)
     */
    public static function refreshConnections() {
        error_log("DatabaseConnection: Forcing connection refresh");
        
        // Close all existing connections
        foreach (self::$connections as $connection) {
            $connection = null;
        }
        self::$connections = [];
        
        // Clear any cached connection state
        gc_collect_cycles();
    }
    
    /**
     * Get connection statistics for debugging
     */
    public static function getStats() {
        return [
            'active_connections' => count(self::$connections),
            'max_connections' => self::$maxConnections,
            'connection_timeout' => self::$connectionTimeout,
            'total_created' => self::$connectionStats['total_created'],
            'total_released' => self::$connectionStats['total_released'],
            'total_failed_tests' => self::$connectionStats['total_failed_tests'],
            'current_active' => self::$connectionStats['current_active'],
            'peak_usage' => self::$connectionStats['peak_usage']
        ];
    }

    /**
     * Log current connection statistics
     */
    public static function logStats() {
        $stats = self::getStats();
        error_log("DatabaseConnection Stats: " . json_encode($stats));
    }
} 