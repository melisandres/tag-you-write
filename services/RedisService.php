<?php
// services/RedisService.php

require_once(__DIR__ . '/../model/Game.php');
require_once(__DIR__ . '/../model/Text.php');
require_once(__DIR__ . '/../model/Notification.php');

class RedisService {
    private $redis;
    private $isAvailable = false;
    
    /**
     * Constructor - initialize Redis connection
     */
    public function __construct() {
        $this->initializeRedis();
    }
    
    /**
     * Initialize Redis connection
     */
    private function initializeRedis() {
        if (class_exists('RedisManager')) {
            try {
                $this->redis = new RedisManager();
                $this->isAvailable = $this->redis->isAvailable();
            } catch (\Exception $e) {
                error_log("Redis initialization error: " . $e->getMessage());
                $this->isAvailable = false;
            }
        }
    }
    
    /**
     * Check if Redis is available
     * 
     * @return bool True if Redis is available
     */
    public function isAvailable() {
        return $this->isAvailable;
    }
    
    /**
     * Publish event data to appropriate Redis channels
     * 
     * @param array $eventData Event data
     * @return bool Success status
     */
    public function publishEvent($eventData) {
        if (!$this->isAvailable) {
            error_log("Redis is not available for publishing");
            return false;
        }
        
        error_log("Redis publishEvent called with event type: " . ($eventData['event_type'] ?? 'unknown') . 
                  ", related_table: " . ($eventData['related_table'] ?? 'unknown'));
        
        try {
            // Determine the appropriate channel based on related table
            $channel = null;
            $publishData = null;
            
            switch ($eventData['related_table']) {
                case 'game':
                    $gameId = $eventData['related_id'];
                    error_log("Redis: Publishing game event for gameId: $gameId");
                    // Send minimal data - subscribers will fetch complete data
                    $publishData = [
                        'id' => $eventData['id'],  // Use event ID
                        'event_type' => $eventData['event_type'],
                        'related_table' => $eventData['related_table'],
                        'related_id' => $gameId
                    ];
                    $channel = 'games:updates';
                    break;
                    
                case 'text':
                    $textId = $eventData['related_id'];
                    error_log("Redis: Publishing text event for textId: $textId");
                    
                    $rootStoryId = $eventData['root_text_id'] ?? null;
                    $channel = 'texts:' . $rootStoryId;
                    
                    // Send minimal data - subscribers will fetch complete data
                    $publishData = [
                        'id' => $eventData['id'],  // Use event ID
                        'event_type' => $eventData['event_type'],
                        'related_table' => $eventData['related_table'],
                        'related_id' => $textId,
                        'root_text_id' => $rootStoryId
                    ];
                    break;
                    
                case 'notification':
                    $notificationId = $eventData['related_id'];
                    $recipientId = $eventData['writer_id'];
                    
                    if ($eventData && isset($recipientId)) {
                        $channel = 'notifications:' . $recipientId;
                        // Create minimal data object for publishing
                        $publishData = [
                            'id' => $eventData['id'],  // Use event ID
                            'related_id' => $notificationId,  // Notification ID for callback processing
                            'writer_id' => $recipientId
                        ];
                    } else {
                        if ($eventData) {
                            error_log("Redis: Missing recipient_id for notification: " . json_encode($eventData));
                        } else {
                            error_log("Redis: Failed to get notification data for notificationId: $notificationId");
                        }
                    }
                    break;
                    
                default:
                    error_log("Redis: Unknown related_table: " . $eventData['related_table']);
                    break;
            }
            
            // Publish to the determined channel if we have one
            if ($channel && $publishData) {
                error_log("Redis: Publishing to channel: $channel with event ID: " . $publishData['id']);
                $result = $this->publish($channel, $publishData);
                error_log("Redis: Published to $channel, received by $result clients");
                return $result > 0;
            }
            
            return false;
        } catch (\Exception $e) {
            error_log("Redis publish error: " . $e->getMessage() . " in " . $e->getFile() . " line " . $e->getLine());
            return false;
        }
    }
    
    /**
     * Publish CurrentActivities log data
     * TODO: this is for later--we need to build the system first 
     * 
     * @param string $activity Activity description
     * @param array $data Additional data
     * @return bool Success status
     */
    public function publishActivity($activity, $data = []) {
        if (!$this->isAvailable) {
            return false;
        }
        
        try {
            $publishData = [
                'activity' => $activity,
                'timestamp' => date('Y-m-d H:i:s'),
                'data' => $data
            ];
            
            $result = $this->publish('activity:logs', $publishData);
            return $result > 0;
        } catch (\Exception $e) {
            error_log("Redis activity publish error: " . $e->getMessage());
            return false;
        }
    }

    public function publish($channel, $data) {
        // Make sure we're sending JSON data
        $jsonData = is_string($data) ? $data : json_encode($data);
        return $this->redis->publish($channel, $jsonData);
    }
}
