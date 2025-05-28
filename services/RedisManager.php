<?php
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
} else if (file_exists(__DIR__ . '/../../vendor/autoload.php')) {
    require_once __DIR__ . '/../../vendor/autoload.php';
}

/**
 * Redis Manager Service
 * 
 * Handles Redis connections and pub/sub operations for real-time event broadcasting.
 * Uses Predis library for PHP Redis functionality.
 */
class RedisManager {
    /**
     * Static toggle to enable/disable Redis for testing
     * Set to false to force the polling mechanism instead of Redis
     */
    public static $USE_REDIS = true;
    
    /** @var \Predis\Client The Redis connection instance */
    private $redis;
    
    /** @var bool Whether Redis is available/connected */
    private $available = false;
    
    /** @var array Channel subscriptions for the current connection */
    private $activeSubscriptions = [];

    
    /**
     * Constructor - initialize Redis connection
     */
    public function __construct() {
        // Skip Redis connection entirely if disabled via static toggle
        if (!self::$USE_REDIS) {
            $this->available = false;
            return;
        }
        
        try {
            // Check if Predis is available
            if (!class_exists('Predis\\Client')) {
                error_log("Redis connection error: Predis not available");
                $this->available = false;
                return;
            }
            
            // Get connection parameters
            $host = getenv('REDIS_HOST') ?: '127.0.0.1';
            $port = getenv('REDIS_PORT') ?: 6379;
            $password = getenv('REDIS_PASSWORD') ?: null;
            
            // Connect with extended timeout and read_write_timeout
            $this->redis = new \Predis\Client([
                'scheme' => 'tcp',
                'host' => $host,
                'port' => $port,
                'password' => $password,
                'read_write_timeout' => 0, // Disable read timeout
                'timeout' => 5.0 // Connection timeout in seconds
            ]);
            
            // Test connection
            $this->redis->ping();
            $this->available = true;
        } catch (\Exception $e) {
            error_log("Redis connection error: " . $e->getMessage());
            $this->available = false;
        }
    }
    
    /**
     * Check if Redis is available
     * 
     * @return bool Whether Redis is connected and available
     */
    public function isAvailable() {
        // Always return false if Redis is disabled via the static toggle
        if (!self::$USE_REDIS) {
            return false;
        }
        
        return $this->available;
    }
    
    /**
     * Publish a message to a Redis channel
     * 
     * @param string $channel The channel to publish to
     * @param mixed $data The data to publish (will be JSON encoded)
     * @return int|bool Number of clients that received the message or false on failure
     */
    public function publish($channel, $data) {
        if (!$this->isAvailable()) {
            return false;
        }
        
        try {
            // Generate a unique message ID to prevent duplicates
            if (is_array($data) && !isset($data['id'])) {
                $data['id'] = uniqid('redis_', true);
            }
            
            error_log("Publishing to channel: " . $channel . " with data: " . substr(json_encode($data), 0, 100));
            
            return $this->redis->publish($channel, is_string($data) ? $data : json_encode($data));
        } catch (\Exception $e) {
            error_log("Redis publish error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Subscribe to one or more Redis channels
     * 
     * @param array $channels Array of channel names to subscribe to
     * @param callable $callback Function to call when messages are received
     * @return bool Whether subscription was successful
     */
    public function subscribe($channels, $callback) {
        if (!$this->isAvailable()) {
            return false;
        }
        
        try {
            // Use a custom loop pattern with heartbeats
            $pubsub = $this->redis->pubSubLoop();
            
            // Subscribe to all channels
            foreach ($channels as $channel) {
                $pubsub->subscribe($channel);
                error_log("Subscribed to channel: $channel");
            }
            
            // Set up a heartbeat interval
            $lastHeartbeat = time();
            $heartbeatInterval = 30; // 30 seconds
            
            foreach ($pubsub as $message) {
                // Check if we need to send a heartbeat
                $now = time();
                if ($now - $lastHeartbeat >= $heartbeatInterval) {
                    error_log("Redis heartbeat sent");
                    $pubsub->ping();
                    $lastHeartbeat = $now;
                }
                
                // Handle subscriptions/unsubscriptions
                if ($message->kind === 'subscribe' || $message->kind === 'unsubscribe') {
                    error_log("Redis {$message->kind} to {$message->channel}, now subscribed to {$message->payload} channels");
                    continue;
                }
                
                // Skip pong messages
                if ($message->kind === 'pong') {
                    error_log("Redis heartbeat received");
                    continue;
                }
                
                // Skip for other control messages
                if ($message->kind !== 'message') {
                    continue;
                }
                
                // Process the actual message
                try {
                    $continue = $callback($this->redis, $message->channel, $message->payload);
                    
                    // Break the loop if callback returns false
                    if ($continue === false) {
                        $pubsub->unsubscribe();
                        break;
                    }
                } catch (\Exception $e) {
                    error_log("Error in Redis subscription callback: " . $e->getMessage());
                }
            }
            
            // Ensure we unsubscribe
            $pubsub->unsubscribe();
            
            return true;
        } catch (\Exception $e) {
            error_log("Redis subscribe error: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Close Redis connection and clean up
     */
    public function close() {
        if ($this->redis) {
            try {
                $this->redis->disconnect();
            } catch (\Exception $e) {
                error_log('Redis close error: ' . $e->getMessage());
            }
        }
    }
    
    /**
     * Get the Redis client instance for advanced operations
     * 
     * @return \Predis\Client|null The Redis client or null if not available
     */
    public function getRedis() {
        if (!$this->isAvailable()) {
            return null;
        }
        
        return $this->redis;
    }
} 