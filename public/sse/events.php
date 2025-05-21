<?php
/**
 * Server-Sent Events (SSE) Implementation
 * 
 * This file handles real-time event streaming to clients using
 * the Server-Sent Events protocol. It bypasses the router to ensure
 * proper MIME type handling.
 */

// TODO: Remove this once we have a proper debug system
// Include debug hooks (if debug mode is enabled)
if (isset($_GET['redis_debug']) && $_GET['redis_debug'] === '1') {
    require_once(__DIR__ . '/../debug/redis-hooks.php');
}

// Start session before any output - this is critical for session continuation
session_start();
$sessionWriterId = $_SESSION['writer_id'] ?? null;

// Save session values we need and close session to prevent blocking
session_write_close();

/**
 * SSE Event Handler Class
 * 
 * Manages the server-sent events connections, processing events,
 * and sending updates to clients.
 */
class EventHandler {
    // Models
    private $eventModel;
    private $gameModel;
    private $textModel;
    private $notificationModel;
    
    // Redis manager
    private $redisManager;
    private $useRedis = false;
    
    // Parameters
    private $writerId;
    private $lastEventId;
    private $rootStoryId;
    private $filters;
    private $search;
    
    // Configuration
    private $maxExecutionTime = 300; // 5 minutes
    private $keepaliveInterval = 30;
    private $pollInterval = 2;
    
    // Tracking sent message IDs to prevent duplicates
    private $sentMessageIds = [];
    
    // Redis message counters
    private $redisMessageCount = 0;
    private $databaseMessageCount = 0;
    
    /**
     * Constructor
     * 
     * @param int|null $writerId Current user's writer ID from session
     */
    public function __construct($writerId) {
        // Set headers immediately
        $this->setHeaders();
        
        // Store writer ID securely
        $this->writerId = $writerId;
        
        // Get request parameters
        $this->parseRequestParameters();
        
        // Load dependencies
        $this->loadDependencies();
        
        // Initialize Redis if available
        $this->initializeRedis();
    }
    
    /**
     * Set appropriate headers for SSE
     */
    private function setHeaders() {
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // Prevent nginx buffering
        
        // Turn off output buffering and set execution parameters
        @ini_set('output_buffering', 'off');
        @ini_set('zlib.output_compression', false);
        set_time_limit(0);
        ignore_user_abort(false);
        
        // Clear any output buffers
        while (ob_get_level()) ob_end_clean();
    }
    
    /**
     * Parse parameters from the request
     */
    private function parseRequestParameters() {
        $this->lastEventId = isset($_GET['lastEventId']) ? intval($_GET['lastEventId']) : null;
        $this->rootStoryId = isset($_GET['rootStoryId']) ? $_GET['rootStoryId'] : null;
        $this->filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
        $this->search = isset($_GET['search']) ? $_GET['search'] : '';
    }
    
    /**
     * Destructor - clean up resources
     */
    public function __destruct() {
        // Close all database connections
        if (class_exists('DatabaseConnection')) {
            DatabaseConnection::closeAllConnections();
        }
    }
    
    /**
     * Load required dependencies and initialize models
     */
    private function loadDependencies() {
        try {
            // Load bootstrap file for environment variables and configuration
            require_once('bootstrap.php');
            
            // Load models
            require_once('../../model/Crud.php');
            require_once('../../model/Event.php');
            require_once('../../model/Game.php');
            require_once('../../model/Text.php');
            require_once('../../model/Notification.php');
            
            // Load services
            require_once('../../services/PermissionsService.php');
            
            // Load Redis manager if it exists
            if (file_exists('../../services/RedisManager.php')) {
                require_once('../../services/RedisManager.php');
            }
            
            // Initialize models
            $this->eventModel = new Event();
            $this->gameModel = new Game();
            $this->textModel = new Text();
            $this->notificationModel = new Notification();
            
        } catch (\Exception $e) {
            $this->sendErrorEvent("Failed to load dependencies: " . $e->getMessage());
            exit;
        }
    }
    
    /**
     * Initialize Redis connection if available
     */
    private function initializeRedis() {
        if (class_exists('RedisManager')) {
            try {
                $this->redisManager = new RedisManager();
                $this->useRedis = $this->redisManager->isAvailable();
                
                if ($this->useRedis) {
                    error_log("SSE: Redis connection established, using pub/sub for real-time updates");
                } else {
                    error_log("SSE: Redis unavailable, falling back to database polling");
                }
            } catch (\Exception $e) {
                error_log("SSE: Redis initialization error: " . $e->getMessage());
                $this->useRedis = false;
            }
        } else {
            error_log("SSE: RedisManager class not found, using database polling only");
            $this->useRedis = false;
        }
    }
    
    /**
     * Initialize the event ID if needed
     * 
     * If lastEventId is 0 or null, get the current max event ID
     * to avoid processing historical events
     */
    private function initializeEventId() {
        if ($this->lastEventId === null || $this->lastEventId === 0) {
            try {
                $maxId = $this->eventModel->getMaxEventId();
                
                if ($maxId) {
                    $this->lastEventId = $maxId;
                } else {
                    // No events in database yet
                    $this->lastEventId = 0;
                }
            } catch (\Exception $e) {
                error_log("SSE: Error getting max event ID: " . $e->getMessage());
                // Keep lastEventId as is if there's an error
            }
        }
    }
    
    /**
     * Send an event to the client with duplicate checking
     * 
     * @param string $event Event name
     * @param mixed $data Event data (will be JSON encoded)
     */
    private function sendEvent($event, $data) {
        // Generate or extract message ID
        $messageId = null;
        
        // Extract message ID if it exists
        if (is_array($data) && isset($data['id'])) {
            $messageId = $data['id'];
        } else {
            // Generate an ID based on event type and related ID if available
            $relatedId = is_array($data) && isset($data['related_id']) ? $data['related_id'] : '';
            $messageId = $event . '_' . $relatedId . '_' . microtime(true);
        }
        
        // Check if we've already sent this message to this client
        if (in_array($messageId, $this->sentMessageIds)) {
            return; // Skip sending duplicate
        }
        
        // Add to sent messages
        $this->sentMessageIds[] = $messageId;
        
        // Limit array size to prevent memory issues
        if (count($this->sentMessageIds) > 1000) {
            array_splice($this->sentMessageIds, 0, 500);
        }
        
        echo "event: $event\n";
        echo "data: " . json_encode($data) . "\n\n";
        flush();
    }
    
    /**
     * Send an error event to the client
     * 
     * @param string $message Error message
     */
    private function sendErrorEvent($message) {
        $this->sendEvent('error', ['error' => $message]);
    }
    
    /**
     * Main event stream processing
     */
    public function run() {
        try {
            // Send initial comment to establish connection
            echo ": " . str_repeat(" ", 2048) . "\n"; // Padding for IE
            echo ": SSE connection established\n\n";
            flush();
            
            // Initialize event ID if needed
            $this->initializeEventId();
            
            // Track time for keepalive and max execution
            $startTime = time();
            $lastKeepaliveTime = time();
            $lastPollTime = 0;
            
            // If Redis is available, subscribe to relevant channels
            if ($this->useRedis) {
                $this->setupRedisSubscriptions();
            } else {
                // Start the database polling main loop if Redis isn't available
                $this->runDatabasePolling($startTime, $lastKeepaliveTime);
            }
        } catch (\Exception $e) {
            $this->sendErrorEvent('Server error: ' . $e->getMessage() . ' in ' . $e->getFile() . ' line ' . $e->getLine());
            exit;
        }
    }
    
    /**
     * Set up Redis channel subscriptions based on user context
     */
    private function setupRedisSubscriptions() {
        // Define channels based on user context
        $channels = ['games:updates']; // All clients get game updates
        
        // Add user-specific notification channel if authenticated
        if ($this->writerId) {
            $channels[] = 'notifications:' . $this->writerId;
        }
        
        // Add story-specific channel if viewing a story
        if ($this->rootStoryId) {
            $channels[] = 'texts:' . $this->rootStoryId;
        }
        
        // Before subscribing, check for any missed events via database
        $this->checkMissedEvents();
        
        // Log what we're subscribing to
        error_log("SSE: Subscribing to Redis channels: " . implode(', ', $channels));
        
        // Subscribe to channels - this is blocking and will run until connection is closed
        $this->redisManager->subscribe($channels, function($redis, $channel, $message) {
            try {
                // Process the received message
                $data = json_decode($message, true);
                if (!$data) {
                    error_log("Invalid JSON: " . $message);
                  }
                
                if (!$data) {
                    error_log("SSE Redis: Invalid JSON received: $message");
                    return;
                }

                $searchResults = [];
                if ($this->search && $this->rootStoryId) {
                    $searchResults = $this->getSearchResults();
                }
                
                // Process based on channel
                switch ($channel) {
                    case 'games:updates':
                        error_log("SSE Redis: Received game update on channel: $channel");
                        error_log("SSE Redis: Raw message data: " . json_encode($data));
                        // Fetch complete game data using the received game ID
                        if (isset($data['id'])) {
                            $gameId = $data['id'];
                            error_log("SSE Redis: Fetching game data for ID: $gameId");
                            $gameUpdates = $this->gameModel->getGames(
                                null, 
                                $this->filters, 
                                $gameId, 
                                $this->search
                            );
                            
                            if (!empty($gameUpdates)) {
                                error_log("SSE Redis: Found game data, sending update");
                                $this->sendEvent('update', [
                                    'modifiedGames' => $gameUpdates, 
                                    'modifiedNodes' => [],
                                    'searchResults' => []
                                ]);
                            } else {
                                error_log("SSE Redis: Could not find game data for ID: $gameId");
                            }
                        } else {
                            error_log("SSE Redis: Received game update without ID: " . json_encode($data));
                        }
                        break;
                        
                    case 'texts:' . $this->rootStoryId:
                        // Fetch complete text data using the received text ID
                        if (isset($data['id'])) {
                            $textId = $data['id'];
                            $nodeData = $this->textModel->selectTexts($this->writerId, $textId, false);
                            
                            if ($nodeData) {
                                // Apply permissions to the node
                                if (class_exists('PermissionsService')) {
                                    PermissionsService::addPermissions($nodeData, $this->writerId);
                                }
                                
                                $this->sendEvent('update', [
                                    'modifiedGames' => [], 
                                    'modifiedNodes' => [$nodeData],
                                    'searchResults' => $this->search ? $searchResults : []
                                ]);
                            } else {
                                error_log("SSE Redis: Could not find text data for ID: $textId");
                            }
                        } else {
                            error_log("SSE Redis: Received text update without ID: " . json_encode($data));
                        }
                        break;
                        
                    case 'notifications:' . $this->writerId:
                        // Notification for current user
                        // $data should contain at least the notification id
                        if (isset($data['id'])) {
                            $notificationId = $data['id'];
                            // Fetch the complete notification data with all joins
                            $notificationUpdates = $this->notificationModel->getNewNotifications(null, $notificationId);
                            
                            if (!empty($notificationUpdates)) {
                                $this->sendEvent('notificationUpdate', $notificationUpdates);
                            } else {
                                error_log("SSE Redis: Could not find notification data for ID: $notificationId");
                            }
                        } else {
                            error_log("SSE Redis: Received notification without ID: " . json_encode($data));
                            $this->sendEvent('notificationUpdate', [$data]); // Fallback to sending original data
                        }
                        break;
                        
                    default:
                        error_log("SSE Redis: Received message on unexpected channel: $channel");
                }
            } catch (\Exception $e) {
                error_log("SSE Redis: Error processing message: " . $e->getMessage());
            }
            
            // Update last event ID if present in the message
            if (isset($data['id'])) {
                $this->lastEventId = $data['id'];
            }
            
            // Redis message counter
            $this->redisMessageCount++;
            error_log("Redis messages received: " . $this->redisMessageCount);
        });
    }
    
    /**
     * Check for events that might have been missed while disconnected
     * This ensures we don't miss events even with Redis
     */
    private function checkMissedEvents() {
        try {
            // Get events since last event ID
            $events = $this->eventModel->getFilteredEvents(
                $this->lastEventId, 
                $this->writerId, 
                $this->rootStoryId
            );
            
            if (!empty($events)) {
                // Update lastEventId to the most recent event
                $this->lastEventId = end($events)['id'];
                
                // Process events
                $this->processEvents($events);
            }
        } catch (\Exception $e) {
            error_log("SSE: Error checking missed events: " . $e->getMessage());
        }
    }
    
    /**
     * Run the traditional database polling loop
     * Used as fallback when Redis is unavailable
     */
    private function runDatabasePolling($startTime, $lastKeepaliveTime) {
        // Main event loop
        while (true) {
            try {
                // Check if client disconnected
                if (connection_aborted()) {
                    exit();
                }
                
                // Check if we've exceeded max execution time
                if ((time() - $startTime) > $this->maxExecutionTime) {
                    $this->sendEvent('timeout', [
                        'message' => 'Maximum execution time reached'
                    ]);
                    exit();
                }
                
                // Send keepalive if needed
                if ((time() - $lastKeepaliveTime) >= $this->keepaliveInterval) {
                    $this->sendEvent('keepalive', [
                        'timestamp' => time()
                    ]);
                    $lastKeepaliveTime = time();
                }
                
                // Get new events using the Event model directly
                $events = $this->eventModel->getFilteredEvents(
                    $this->lastEventId, 
                    $this->writerId, 
                    $this->rootStoryId
                );
                
                if (!empty($events)) {
                    // Update lastEventId to the most recent event
                    $this->lastEventId = end($events)['id'];
                    
                    // Process events
                    $this->processEvents($events);
                }
                
                // Sleep for the poll interval
                sleep($this->pollInterval);
                
            } catch (\Exception $e) {
                // Log error and send error event
                error_log("SSE Error: " . $e->getMessage());
                $this->sendEvent('error', [
                    'message' => 'Server error occurred: ' . $e->getMessage()
                ]);
                sleep(5); // Wait before retrying
            }
            
            // Database message counter
            $this->databaseMessageCount++;
            error_log("Database (database polling) events received: " . $this->databaseMessageCount);
        }
    }
    
    /**
     * Process events from the Event model
     * 
     * @param array $events Events to process
     */
    private function processEvents($events) {
        // Initialize updates array
        $updates = [
            'modifiedGames' => [],
            'modifiedNodes' => [],
            'searchResults' => []
        ];
        
        // Process each event
        foreach ($events as $eventData) {
            // Process based on the event's related table
            switch ($eventData['related_table']) {
                case 'game':
                    // Get game data using Game model
                    $gameId = $eventData['related_id'];
                    
                    $gameUpdates = $this->gameModel->getGames(null, $this->filters, $gameId, $this->search);
                    if (!empty($gameUpdates)) {
                        $updates['modifiedGames'] = array_merge($updates['modifiedGames'], $gameUpdates);
                    }
                    break;
                    
                case 'text':
                    // Get text/node data using Text model
                    if ($this->rootStoryId) {
                        $textId = $eventData['related_id'];
                        
                        $nodeData = $this->textModel->selectTexts($this->writerId, $textId, false);
                        if ($nodeData) {
                            // Apply permissions to the node
                            PermissionsService::addPermissions($nodeData, $this->writerId);
                            $updates['modifiedNodes'][] = $nodeData;
                        }
                    }
                    break;
                    
                case 'notification':
                    // Skip notification processing entirely for anonymous users
                    if (!$this->writerId) {
                        break;
                    }
                    
                    // Get notification data directly from its ID
                    $notificationId = $eventData['related_id'];
                    $eventWriterId = $eventData['writer_id'];
                    
                    // SECURITY: Only process notifications meant for the authenticated user
                    // Always use the session user ID, never trust event writer_id alone
                    if ($eventWriterId == $this->writerId) {
                        // This should get the notification if it exists
                        $notificationUpdates = $this->notificationModel->getNewNotifications(null, $notificationId);
                        
                        if (!empty($notificationUpdates)) {
                            $this->sendEvent('notificationUpdate', $notificationUpdates);
                        }
                    }
                    break;
            }
        }
        
        // Add search results if there's an active search term and we have node updates
        if ($this->search && $this->rootStoryId && (!empty($updates['modifiedNodes']) || !empty($updates['modifiedGames']))) {
            $updates['searchResults'] = $this->getSearchResults();
        }
        
        // Send update event if we have any updates
        if (!empty($updates['modifiedGames']) || !empty($updates['modifiedNodes'])) {
            $this->sendEvent('update', $updates);
        }
    }

    /**
     * Get search results for the current search term and root story
     * 
     * @return array Search results
     */
    private function getSearchResults() {
        if (!$this->search || !$this->rootStoryId) {
            return [];
        }

        $gameId = $this->gameModel->selectGameId($this->rootStoryId);
        return $this->textModel->searchNodesByTerm($this->search, $gameId, $this->writerId);
    }
}

// Run the SSE handler if this file is accessed directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    try {
        $handler = new EventHandler($sessionWriterId);
        $handler->run();
    } catch (\Exception $e) {
        header('Content-Type: text/event-stream');
        echo "event: error\n";
        echo "data: " . json_encode(['error' => 'Server error: ' . $e->getMessage()]) . "\n\n";
        exit;
    }
} 