<?php
/**
 * EventPollingService.php
 * A service class that handles the event polling logic for both SSE and controller endpoints
 */

// Ensure RequirePage is available
if (!class_exists('RequirePage')) {
    require_once __DIR__ . '/../library/RequirePage.php';
}

// Ensure PermissionsService is available
if (!class_exists('PermissionsService')) {
    require_once __DIR__ . '/../services/PermissionsService.php';
}

class EventPollingService {
    private $eventModel;
    private $gameModel;
    private $textModel;
    private $notificationModel;
    
    public function __construct() {
        $this->eventModel = new Event();
        $this->gameModel = new Game();
        $this->textModel = new Text();
        $this->notificationModel = new Notification();
    }
    
    /**
     * Get updates based on event filtering
     * 
     * @param int|null $lastEventId Last processed event ID
     * @param int|null $writerId Current user's writer ID
     * @param int|null $rootStoryId Current story being viewed
     * @param array $filters Any active filters
     * @param string $search Search term if any
     * @return array Updates including modified games, nodes, and search results
     */
    public function getUpdates($lastEventId, $writerId, $rootStoryId, $filters = [], $search = '') {
        error_log("EventPollingService: getUpdates called with lastEventId=$lastEventId, writerId=$writerId, rootStoryId=$rootStoryId");
        error_log("EventPollingService: Filters: " . json_encode($filters) . ", Search: $search");
        
        // Initialize result structure
        $updates = [
            'modifiedGames' => [],
            'modifiedNodes' => [],
            'searchResults' => [],
            'notifications' => [],
            'debug' => [
                'lastEventId' => $lastEventId,
                'writerId' => $writerId,
                'rootStoryId' => $rootStoryId,
                'filters' => $filters,
                'search' => $search
            ]
        ];
        
        try {
            // Get events since last event ID
            $events = $this->eventModel->getFilteredEvents($lastEventId, $writerId, $rootStoryId);
            error_log("EventPollingService: Found " . count($events) . " events since lastEventId=$lastEventId");
            
            if (empty($events)) {
                error_log("EventPollingService: No new events found");
                return $updates;
            }
            
            // Update lastEventId to the most recent event
            $lastEventId = end($events)['id'];
            $updates['lastEventId'] = $lastEventId;
            error_log("EventPollingService: Updated lastEventId to " . $lastEventId);
            
            // Process events to gather updates
            $this->processEvents($events, $updates, $writerId, $rootStoryId, $filters, $search);
            
            // Log the results
            error_log("EventPollingService: Found " . count($updates['modifiedGames']) . " modified games");
            error_log("EventPollingService: Found " . count($updates['modifiedNodes']) . " modified nodes");
            error_log("EventPollingService: Found " . count($updates['notifications']) . " notifications");
            error_log("EventPollingService: Found " . count($updates['searchResults']) . " search results");
        } catch (Exception $e) {
            error_log("EventPollingService ERROR: " . $e->getMessage());
            $updates['error'] = $e->getMessage();
        }
        
        return $updates;
    }
    
    /**
     * Process events and fetch related data
     */
    private function processEvents($events, &$updates, $writerId, $rootStoryId, $filters, $search) {
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
                    error_log("EventPollingService ERROR processing $table/$id: " . $e->getMessage());
                }
            }
        }
        
        // Add search results if needed
        if ($search && $rootStoryId && (!empty($updates['modifiedNodes']) || !empty($updates['modifiedGames']))) {
            try {
                $gameId = $this->gameModel->selectGameId($rootStoryId);
                
                // Get the last tree check timestamp from the data manager parameters
                // This will limit search results to only recently modified nodes
                $lastTreeCheck = null;
                
                // Check if we have tree timestamps in the request
                if (isset($_GET['lastTreeCheck']) && $_GET['lastTreeCheck']) {
                    $lastTreeCheck = $_GET['lastTreeCheck'];
                    error_log("EventPollingService: Using lastTreeCheck from request: $lastTreeCheck");
                }
                
                $updates['searchResults'] = $this->textModel->searchNodesByTerm(
                    $search, 
                    $gameId, 
                    $writerId, 
                    $lastTreeCheck
                );
                
                error_log("EventPollingService: Found " . count($updates['searchResults']) . " search results using lastTreeCheck: " . ($lastTreeCheck ? $lastTreeCheck : 'null'));
            } catch (Exception $e) {
                error_log("EventPollingService ERROR processing search: " . $e->getMessage());
            }
        }
    }
    
    /**
     * Process a single event based on its related table
     */
    private function processEventByTable($table, $id, &$updates, $writerId, $rootStoryId, $filters, $search) {
        switch ($table) {
            case 'game':
                $gameUpdates = $this->gameModel->getGames(null, $filters, $id, $search);
                if (!empty($gameUpdates)) {
                    $updates['modifiedGames'] = array_merge($updates['modifiedGames'], $gameUpdates);
                }
                break;
                
            case 'text':
                if ($rootStoryId) {
                    $nodeData = $this->textModel->selectTexts($writerId, $id, false);
                    if ($nodeData) {
                        if (class_exists('PermissionsService')) {
                            PermissionsService::addPermissions($nodeData, $writerId);
                        }
                        $updates['modifiedNodes'][] = $nodeData;
                    }
                }
                break;
                
            case 'notification':
                if ($writerId) {
                    $notificationUpdates = $this->notificationModel->getNewNotifications(null, $id);
                    if (!empty($notificationUpdates)) {
                        $updates['notifications'] = array_merge(
                            $updates['notifications'] ?? [], 
                            $notificationUpdates
                        );
                    }
                }
                break;
        }
    }

    public function fetchGameData($gameId, $filters, $search) {
        return $this->gameModel->getGames(null, $filters, $gameId, $search);
    }

    public function fetchTextData($textId, $writerId) {
        $nodeData = $this->textModel->selectTexts($writerId, $textId, false);
        if ($nodeData) {
            // Explicitly use PermissionsService to normalize boolean values
            PermissionsService::addPermissions($nodeData, $writerId);
        }
        return $nodeData;
    }

    public function fetchNotificationData($notificationId) {
        return $this->notificationModel->getNewNotifications(null, $notificationId);
    }

    public function fetchSearchResults($search, $rootStoryId, $writerId) {
        if ($search && $rootStoryId) {
            $gameId = $this->gameModel->selectGameId($rootStoryId);
            return $this->textModel->searchNodesByTerm($search, $gameId, $writerId);
        }
        return [];
    }
}
