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
        
        // Define ROOT_DIR if not already defined
        if (!defined('ROOT_DIR')) {
            define('ROOT_DIR', dirname(__DIR__));
        }
        
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
            $stmt = $this->pdo->prepare($sql);
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
        
        $stmt = $this->pdo->prepare($sql);
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
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        $maxId = $stmt->fetchColumn();
        
        // Return as integer or null if no events
        return $maxId ? intval($maxId) : null;
    }

}