<?php

require_once('Crud.php');
require_once('Game.php');

class Event extends Crud {
    public $table = 'event';
    public $primaryKey = 'id';

    public $fillable = [
        'id',
        'event_type',
        'related_table',
        'related_id',
        'root_text_id',
        'writer_id',
        'payload',
        'created_at'
    ];

    /**
     * Constructor - initialize Redis connection if available
     */
    public function __construct() {
        parent::__construct();
        $this->table = 'event';
        
        // Try to load RedisManager if it exists
        if (file_exists('services/RedisManager.php')) {
            require_once('services/RedisManager.php');
        } else if (file_exists(ROOT_DIR . '/services/RedisManager.php')) {
            require_once(ROOT_DIR . '/services/RedisManager.php');
        }
    }

    /**
     * Create a new event with database insertion and Redis publishing
     * 
     * @param array $eventData Event data
     * @return int|bool The new event ID or false on failure
     */
    public function createEvent($eventData) {
        // Ensure payload is JSON encoded if it's an array
        if (isset($eventData['payload']) && is_array($eventData['payload'])) {
            $eventData['payload'] = json_encode($eventData['payload']);
        }
        
        // Add timestamp if not provided
        if (!isset($eventData['created_at'])) {
            $eventData['created_at'] = date('Y-m-d H:i:s');
        }
        
        // Insert into database
        return $this->insert($eventData);
    }

    public function getEvents($lastEventId = null) {
        $sql = "SELECT * FROM event";
        if ($lastEventId) {
            $sql .= " WHERE id > :lastEventId";
        }
        $sql .= " ORDER BY id ASC";
            $stmt = $this->prepare($sql);
        if ($lastEventId) {
            $stmt->bindParam(':lastEventId', $lastEventId);
        }
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Get events with filtering capabilities for SSE
     * 
     * @param int|null $lastEventId Last event ID processed
     * @param int|null $currentUserId Current user ID for filtering
     * @param int|null $rootStoryId Root story ID for filtering
     * @return array Array of filtered events
     */
    public function getFilteredEvents($lastEventId = null, $currentUserId = null, $rootStoryId = null) {

        // Get all events
        $sql = "SELECT * FROM event WHERE 1=1";
        $params = [];

        if ($lastEventId) {
            $sql .= " AND id > :lastEventId";
            $params[':lastEventId'] = $lastEventId;
        }

        // Filter notifications by user
        if ($currentUserId) {
            $sql .= " AND (related_table != 'notification' OR writer_id = :currentUserId)";
            $params[':currentUserId'] = $currentUserId;
        }

        // Filter texts by game
        if ($rootStoryId) {
            // Get the game ID for this root story
            $game = new Game();
            $gameId = $game->selectGameId($rootStoryId);
            
            if ($gameId) {
                $sql .= " AND (related_table != 'text' OR root_text_id = :rootStoryId)";
                $params[':rootStoryId'] = $rootStoryId;
            }
        }

        $sql .= " ORDER BY id ASC";
        
        $stmt = $this->prepare($sql);
        foreach ($params as $key => $value) {
            $stmt->bindValue($key, $value);
        }
        
        $stmt->execute();
        $results = $stmt->fetchAll();
        
        return $results;
    }

    /**
     * Get the maximum event ID from the database
     * 
     * @return int|null The maximum event ID, or null if no events exist
     */
    public function getMaxEventId() {
        $sql = "SELECT MAX(id) FROM $this->table";
        $stmt = $this->prepare($sql);
        $stmt->execute();
        $maxId = $stmt->fetchColumn();
        
        // Return as integer or null if no events
        return $maxId ? intval($maxId) : null;
    }

    /**
     * Publish event to appropriate Redis channels
     * 
     * @param array $data Event data
     */
    /* private function publishToRedis($data) {
        // Only attempt to publish if RedisManager exists
        if (!class_exists('RedisManager')) {
            return;
        }
        
        try {
            $redis = new RedisManager();
            
            if (!$redis->isAvailable()) {
                return;
            }
            
            // Determine the appropriate channel based on related table
            $channel = null;
            $publishData = $data;
            
            switch ($data['related_table']) {
                case 'game':
                    $channel = 'games:updates';
                    
                    // Load game data for the updates
                    $gameId = $data['related_id'];
                    $game = $this->getGameData($gameId);
                    if ($game) {
                        $publishData = $game;
                    }
                    break;
                    
                case 'text':
                    // For text updates, we need to get the root story ID and publish to that channel
                    $textId = $data['related_id'];
                    $textData = $this->getTextData($textId);
                    
                    if ($textData) {
                        $rootStoryId = $textData['root_story_id'] ?? $textData['game_id'];
                        $channel = 'texts:' . $rootStoryId;
                        $publishData = $textData;
                    }
                    break;
                    
                case 'notification':
                    // For notifications, publish to the recipient's channel
                    $notificationId = $data['related_id'];
                    $notification = $this->getNotificationData($notificationId);
                    
                    if ($notification && isset($notification['recipient_id'])) {
                        $channel = 'notifications:' . $notification['recipient_id'];
                        $publishData = $notification;
                    }
                    break;
            }
            
            // Publish to the determined channel if we have one
            if ($channel && $publishData) {
                $result = $redis->publish($channel, $publishData);
                if ($result) {
                    error_log("Redis: Published to $channel, received by $result clients");
                }
            }
        } catch (\Exception $e) {
            error_log("Redis publish error: " . $e->getMessage());
        }
    } */
    
    /**
     * Get game data for publishing
     * 
     * @param int $gameId Game ID
     * @return array|null Game data or null if not found
     */
   /*  private function getGameData($gameId) {
        try {
            require_once('Game.php');
            $gameModel = new Game();
            $games = $gameModel->getGames(null, [], $gameId, '');
            
            if (!empty($games) && isset($games[0])) {
                return $games[0];
            }
        } catch (\Exception $e) {
            error_log("Error getting game data for Redis: " . $e->getMessage());
        }
        
        return null;
    }
     */
    /**
     * Get text data for publishing
     * 
     * @param int $textId Text ID
     * @return array|null Text data or null if not found
     */
    /* private function getTextData($textId) {
        try {
            require_once('Text.php');
            $textModel = new Text();
            $text = $textModel->selectTexts(null, $textId, false);
            
            if ($text) {
                return $text;
            }
        } catch (\Exception $e) {
            error_log("Error getting text data for Redis: " . $e->getMessage());
        }
        
        return null;
    } */
    
    /**
     * Get notification data for publishing
     * 
     * @param int $notificationId Notification ID
     * @return array|null Notification data or null if not found
     */
    /* private function getNotificationData($notificationId) {
        try {
            require_once('Notification.php');
            $notificationModel = new Notification();
            $notifications = $notificationModel->getNewNotifications(null, $notificationId);
            
            if (!empty($notifications) && isset($notifications[0])) {
                return $notifications[0];
            }
        } catch (\Exception $e) {
            error_log("Error getting notification data for Redis: " . $e->getMessage());
        }
        
        return null;
    } */
}