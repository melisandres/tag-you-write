<?php
/**
 * DataFetchService.php
 * A centralized service that handles data fetching for both SSE and controller endpoints.
 * Used by both Redis subscribers and polling mechanisms to fetch game, text, and notification data.
 */

// Load models - handle both MVC and SSE contexts
if (class_exists('RequirePage')) {
    // MVC context - use RequirePage
    RequirePage::model('WriterActivity');
    RequirePage::model('Event');
    RequirePage::model('Game');
    RequirePage::model('Text');
    RequirePage::model('Notification');
    RequirePage::service('PermissionsService');
} else {
    // SSE context - use manual require_once
    if (!class_exists('WriterActivity')) {
        require_once __DIR__ . '/../model/WriterActivity.php';
    }
    if (!class_exists('Event')) {
        require_once __DIR__ . '/../model/Event.php';
    }
    if (!class_exists('Game')) {
        require_once __DIR__ . '/../model/Game.php';
    }
    if (!class_exists('Text')) {
        require_once __DIR__ . '/../model/Text.php';
    }
    if (!class_exists('Notification')) {
        require_once __DIR__ . '/../model/Notification.php';
    }
    if (!class_exists('PermissionsService')) {
        require_once __DIR__ . '/PermissionsService.php';
    }
}

class DataFetchService {
    private $eventModel;
    private $gameModel;
    private $textModel;
    private $notificationModel;
    private $writerActivityModel;
    private $preservedSessionData;
    private $originalSessionData;
    
    public function __construct($preservedSessionData = []) {
        $this->preservedSessionData = $preservedSessionData;
        $this->eventModel = new Event();
        $this->gameModel = new Game();
        $this->textModel = new Text();
        $this->notificationModel = new Notification();
        $this->writerActivityModel = new WriterActivity();
    }
    
    /**
     * Get updates based on event filtering
     * 
     * @param int|null $lastEventId Last processed event ID
     * @param int|null $writerId Current user's writer ID
     * @param int|null $rootStoryId Current story being viewed
     * @param array $filters Any active filters
     * @param string $search Search term if any
     * @param string|null $lastTreeCheck Last tree check timestamp
     * @param string|null $lastGameCheck Last game check timestamp
     * @return array Updates including modified games, nodes, and search results
     */
    public function getUpdates($lastEventId, $writerId, $rootStoryId, $filters = [], $search = '', $lastTreeCheck = null, $lastGameCheck = null) {
        error_log("DataFetchService: getUpdates called with lastEventId=$lastEventId, writerId=$writerId, rootStoryId=$rootStoryId");
        error_log("DataFetchService: Filters: " . json_encode($filters) . ", Search: $search");
        error_log("DataFetchService: lastTreeCheck: $lastTreeCheck, lastGameCheck: $lastGameCheck");
        
        // Initialize result structure
        $updates = [
            'modifiedGames' => [],
            'modifiedNodes' => [],
            'searchResults' => [],
            'gameIdsForRemoval' => [],
            'notifications' => [],
            'userActivity' => null, // User-centric activity data (primary source)
            'lastEventId' => $lastEventId,
            'debug' => [
                'lastEventId' => $lastEventId,
                'writerId' => $writerId,
                'rootStoryId' => $rootStoryId,
                'filters' => $filters,
                'search' => $search,
                'lastTreeCheck' => $lastTreeCheck,
                'lastGameCheck' => $lastGameCheck
            ]
        ];
        
        try {
            // Fetch user activity data for user-centric tracking (primary data source)
            $userActivity = $this->fetchUserActivityData();
            if ($userActivity) {
                $updates['userActivity'] = $userActivity;
            }
            
            // Get events since last event ID
            $events = $this->eventModel->getFilteredEvents($lastEventId, $writerId, $rootStoryId);
            error_log("DataFetchService: Found " . count($events) . " events since lastEventId=$lastEventId");
            
            if (empty($events)) {
                error_log("DataFetchService: No new events found");
                return $updates;
            }
            
            // Update lastEventId to the most recent event
            $lastEventId = end($events)['id'];
            $updates['lastEventId'] = $lastEventId;
            error_log("DataFetchService: Updated lastEventId to " . $lastEventId);
            
            // Process events to gather updates
            $this->processEvents($events, $updates, $writerId, $rootStoryId, $filters, $search, $lastTreeCheck, $lastGameCheck);
            
            // Log the results
            error_log("DataFetchService: Found " . count($updates['modifiedGames']) . " modified games");
            error_log("DataFetchService: Found " . count($updates['modifiedNodes']) . " modified nodes");
            error_log("DataFetchService: Found " . count($updates['notifications']) . " notifications");
            error_log("DataFetchService: Found " . count($updates['searchResults']) . " search results");
        } catch (Exception $e) {
            error_log("DataFetchService ERROR: " . $e->getMessage());
            $updates['error'] = $e->getMessage();
        }
        
        return $updates;
    }
    
    /**
     * Process events and fetch related data
     */
    private function processEvents($events, &$updates, $writerId, $rootStoryId, $filters, $search, $lastTreeCheck, $lastGameCheck) {
        // Pre-filter events to get unique IDs per table
        $uniqueEvents = [];
        foreach ($events as $event) {
            $table = $event['related_table'];
            $id = $event['related_id'];
            
            // For notifications, check writer_id
            if ($table === 'notification' && $event['writer_id'] !== $writerId) {
                continue;
            }
            
            // Keep only the latest event for each ID per table
            if (!isset($uniqueEvents[$table][$id])) {
                $uniqueEvents[$table][$id] = $event;
            }
        }
        
        // Process unique events
        foreach ($uniqueEvents as $table => $tableEvents) {
            foreach ($tableEvents as $id => $event) {
                try {
                    $this->processEventByTable($table, $id, $updates, $writerId, $rootStoryId, $filters, $search);
                } catch (Exception $e) {
                    error_log("DataFetchService ERROR processing $table/$id: " . $e->getMessage());
                }
            }
        }
        
        // Add search results if needed
        if ($search && $rootStoryId && (!empty($updates['modifiedNodes']))) {
            try {
                // Use the passed lastTreeCheck parameter to only get search results for modified texts
                error_log("DataFetchService: Fetching search results for modified texts using lastTreeCheck: " . ($lastTreeCheck ? $lastTreeCheck : 'null'));
                
                $updates['searchResults'] = $this->fetchSearchResults($search, $rootStoryId, $writerId, $lastTreeCheck);
                
                error_log("DataFetchService: Found " . count($updates['searchResults']) . " search results for modified texts");
            } catch (Exception $e) {
                error_log("DataFetchService ERROR processing search: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Process a single event based on its related table
     */
    private function processEventByTable($table, $id, &$updates, $writerId, $rootStoryId, $filters, $search) {
        switch ($table) {
            case 'game':
                // Fetch the specific game that changed
                $gameUpdates = $this->fetchGameData($id, $filters, $search);
                if (!empty($gameUpdates['modifiedGames'])) {
                    $updates['modifiedGames'] = array_merge($updates['modifiedGames'], $gameUpdates['modifiedGames']);
                }
                if (!empty($gameUpdates['gameIdsForRemoval'])) {
                    $updates['gameIdsForRemoval'] = array_merge($updates['gameIdsForRemoval'] ?? [], $gameUpdates['gameIdsForRemoval']);
                }
                error_log("DataFetchService: Fetched game ID $id");
                break;
                
            case 'text':
                if ($rootStoryId) {
                    $nodeData = $this->fetchTextData($id, $writerId);
                    if ($nodeData) {
                        $updates['modifiedNodes'][] = $nodeData;
                    }
                }
                break;
                
            case 'notification':
                if ($writerId) {
                    $notificationUpdates = $this->fetchNotificationData($writerId, $id);
                    
                    if (!empty($notificationUpdates)) {
                        error_log("DataFetchService: Found notification ID $id for writer $writerId");
                        // Ensure notifications is always an array
                        if (!isset($updates['notifications'])) {
                            $updates['notifications'] = [];
                        }
                        // fetchNotificationData returns an array, so merge it
                        $updates['notifications'] = array_merge($updates['notifications'], $notificationUpdates);
                    } else {
                        error_log("DataFetchService: No notification found for ID $id and writer $writerId");
                    }
                }
                break;
        }
    }

    public function fetchGameData($gameId, $filters, $search) {
        return $this->executeWithRetry(function() use ($gameId, $filters, $search) {
            // Temporarily restore session data for Game->getGames() calls
            $this->restoreSessionData();
            try {
                return $this->gameModel->getGames(null, $filters, $gameId, $search);
            } finally {
                // Clean up session data after the call
                $this->cleanupSessionData();
            }
        });
    }

    public function fetchTextData($textId, $writerId) {
        return $this->executeWithRetry(function() use ($textId, $writerId) {
            $nodeData = $this->textModel->selectTexts($writerId, $textId, false);
            if ($nodeData) {
                // Explicitly use PermissionsService to normalize boolean values
                PermissionsService::addPermissions($nodeData, $writerId);
            }
            return $nodeData;
        });
    }

    public function fetchNotificationData($writerId, $notificationId) {
        return $this->executeWithRetry(function() use ($writerId, $notificationId) {
            $notification = $this->notificationModel->getNotificationById($notificationId, $writerId);
            
            // Return as array for consistency with other fetch methods
            if ($notification) {
                return [$notification];
            }
            return [];
        });
    }

    public function fetchSearchResults($search, $rootStoryId, $writerId, $lastTreeCheck = null) {
        return $this->executeWithRetry(function() use ($search, $rootStoryId, $writerId, $lastTreeCheck) {
            if ($search && $rootStoryId) {
                $gameId = $this->gameModel->selectGameId($rootStoryId);
                return $this->textModel->searchNodesByTerm($search, $gameId, $writerId, $lastTreeCheck);
            }
            return [];
        });
    }



    /**
     * Fetch user activity data for user-centric tracking (consistent with SSE)
     * 
     * @return array|null User activity data or null on error
     */
    public function fetchUserActivityData() {
        return $this->executeWithRetry(function() {
            return $this->writerActivityModel->getAllActiveUsers();
        });
    }

    /**
     * Log database connection statistics for debugging
     */
    public function logConnectionStats() {
        if (class_exists('DatabaseConnection')) {
            $stats = DatabaseConnection::getStats();
            error_log("DataFetchService: Connection stats - " . json_encode($stats));
        }
    }

    /**
     * Execute a database operation with retry logic for connection recovery
     * 
     * @param callable $operation The database operation to execute
     * @param int $maxRetries Maximum number of retry attempts
     * @return mixed The result of the operation
     * @throws Exception If all retry attempts fail
     */
    private function executeWithRetry($operation, $maxRetries = 3) {
        $attempt = 0;
        
        while ($attempt < $maxRetries) {
            try {
                return $operation();
            } catch (Exception $e) {
                $attempt++;
                
                if ($this->isConnectionError($e)) {
                    error_log("DataFetchService: Connection error on attempt $attempt: " . $e->getMessage());
                    
                    if ($attempt < $maxRetries) {
                        // Force refresh database connections
                        if (class_exists('DatabaseConnection')) {
                            DatabaseConnection::refreshConnections();
                        }
                        
                        // Recreate model instances with fresh connections
                        $this->recreateModels();
                        
                        // Brief delay before retry
                        usleep(100000); // 100ms
                        continue;
                    }
                }
                
                // If not a connection error or max retries reached, rethrow
                throw $e;
            }
        }
        
        throw new Exception("Operation failed after $maxRetries attempts");
    }

    /**
     * Check if an exception is related to database connection issues
     * 
     * @param Exception $e The exception to check
     * @return bool True if it's a connection error
     */
    private function isConnectionError($e) {
        $message = $e->getMessage();
        $connectionErrors = [
            'MySQL server has gone away',
            'Lost connection to MySQL server',
            'Error while sending QUERY packet',
            'Connection timed out',
            'SQLSTATE[HY000]: General error: 2006'
        ];
        
        foreach ($connectionErrors as $error) {
            if (strpos($message, $error) !== false) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Recreate model instances to get fresh database connections
     */
    private function recreateModels() {
        error_log("DataFetchService: Recreating models with fresh connections");
        
        // The models extend Crud which automatically gets connections from DatabaseConnection
        // We just need to recreate the instances to get fresh connections from the pool
        $this->eventModel = new Event();
        $this->gameModel = new Game();
        $this->textModel = new Text();
        $this->notificationModel = new Notification();
        $this->writerActivityModel = new WriterActivity();
        
        error_log("DataFetchService: Models recreated with fresh connections from pool");
    }
    
    /**
     * Temporarily restore session data for model calls
     */
    private function restoreSessionData() {
        if (!empty($this->preservedSessionData)) {
            // Store original session data
            $this->originalSessionData = [
                'writer_id' => $_SESSION['writer_id'] ?? null,
                'game_invitation_access' => $_SESSION['game_invitation_access'] ?? []
            ];
            
            // Restore preserved session data
            $_SESSION['writer_id'] = $this->preservedSessionData['writer_id'] ?? null;
            $_SESSION['game_invitation_access'] = $this->preservedSessionData['game_invitation_access'] ?? [];
        }
    }
    
    /**
     * Clean up session data after model calls
     */
    private function cleanupSessionData() {
        if (isset($this->originalSessionData)) {
            // Restore original session data
            $_SESSION['writer_id'] = $this->originalSessionData['writer_id'];
            $_SESSION['game_invitation_access'] = $this->originalSessionData['game_invitation_access'];
            
            // Clear the backup
            unset($this->originalSessionData);
        }
    }
}
