<?php
/**
 * Server-Sent Events (SSE) Implementation
 * 
 * This file handles real-time event streaming to clients using
 * the Server-Sent Events protocol. It bypasses the router to ensure
 * proper MIME type handling.
 */


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
    // Redis manager
    private $redisManager;
    private $useRedis = false;
    
    // Parameters
    private $writerId;
    private $lastEventId;
    private $rootStoryId;
    private $filters;
    private $search;
    private $lastTreeCheck;
    private $lastGameCheck;
    
    // Configuration
    private $maxExecutionTime = 300; // 5 minutes
    private $keepaliveInterval = 30;
    private $pollInterval = 2;
    
    // Tracking sent message IDs to prevent duplicates
    private $sentMessageIds = [];
    
    // Data fetch service - this handles all model interactions for both Redis and polling
    private $pollingService;
    
    // Connection refresh tracking
    private $lastConnectionRefresh;
    private $connectionRefreshInterval;
    
    // Unique connection ID
    private $connectionId;
    
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
        
        // Generate unique connection ID for this SSE connection
        $this->connectionId = uniqid('sse_', true);
        
        // Get request parameters
        $this->parseRequestParameters();
        
        // Load dependencies
        $this->loadDependencies();
        
        // Initialize Redis if available
        $this->initializeRedis();
        
        // Initialize connection refresh tracking
        $this->lastConnectionRefresh = time();
        $this->connectionRefreshInterval = 240; // Refresh every 4 minutes (before 5-minute timeout)
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
        $this->lastTreeCheck = isset($_GET['lastTreeCheck']) ? $_GET['lastTreeCheck'] : null;
        $this->lastGameCheck = isset($_GET['lastGameCheck']) ? $_GET['lastGameCheck'] : null;
    }
    
    /**
     * Destructor - clean up resources
     */
    public function __destruct() {
        error_log("SSE: Connection cleanup - ID: " . $this->connectionId . " | Writer: " . $this->writerId);
        
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
            
            // Load models - but don't instantiate them yet (lazy loading)
            require_once('../../model/Crud.php');
            require_once('../../model/Event.php');
            require_once('../../model/Game.php');
            require_once('../../model/Text.php');
            require_once('../../model/Notification.php');
            
            // Load services
            require_once('../../services/PermissionsService.php');
            require_once('../../services/DataFetchService.php');
            
            // Load Redis manager if it exists
            if (file_exists('../../services/RedisManager.php')) {
                require_once('../../services/RedisManager.php');
            }
            
            // Only initialize data fetch service immediately - models will be lazy loaded
            $this->pollingService = new DataFetchService();
            
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
                // Use DataFetchService to get initial state - it handles the max event ID internally
                // We can safely set this to 0 and let the data fetch service determine the right starting point
                $this->lastEventId = 0;
                error_log("SSE: Initialized lastEventId to 0, DataFetchService will handle event filtering");
            } catch (\Exception $e) {
                error_log("SSE: Error initializing event ID: " . $e->getMessage());
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
        // Use event ID for duplicate prevention if available
        $messageId = is_array($data) && isset($data['id']) ? $data['id'] : null;
        
        if ($messageId && in_array($messageId, $this->sentMessageIds)) {
            return;
        }
        
        // Add to sent messages if we have an ID
        if ($messageId) {
            $this->sentMessageIds[] = $messageId;
            
            // Limit array size to prevent memory issues
            if (count($this->sentMessageIds) > 1000) {
                array_splice($this->sentMessageIds, 0, 500);
            }
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
        
        // Subscribe to channels - this is blocking and will run until connection is closed
        try {
            $this->redisManager->subscribe($channels, function($redis, $channel, $message) {
                try {
                    // Check if client disconnected
                    if (connection_aborted()) {
                        error_log("SSE Redis: Client disconnected, exiting subscription");
                        return false; // This should stop the subscription
                    }
                    
                    // Process the received message
                    $data = json_decode($message, true);
                    if (!$data) {
                        return;
                    }
                    
                    // Create a simple local deduplication key
                    $messageKey = $channel . ':' . ($data['id'] ?? '') . ':' . $this->writerId . ':' . $this->connectionId;
                    
                    // Check if we've already processed this message locally
                    if (in_array($messageKey, $this->sentMessageIds)) {
                        return;
                    }
                    
                    // Add to local processed messages
                    $this->sentMessageIds[] = $messageKey;
                    
                    // Limit array size to prevent memory issues
                    if (count($this->sentMessageIds) > 1000) {
                        array_splice($this->sentMessageIds, 0, 500);
                    }

                    // Process based on channel
                    switch ($channel) {
                        case 'games:updates':
                            if (isset($data['related_id'])) {
                                $gameId = $data['related_id'];
                                
                                try {
                                    $gameUpdates = $this->pollingService->fetchGameData($gameId, $this->filters, $this->search);
                                    
                                    if (!empty($gameUpdates)) {
                                        $this->sendEvent('update', [
                                            'modifiedGames' => $gameUpdates, 
                                            'modifiedNodes' => [],
                                            'searchResults' => []
                                        ]);
                                    }
                                } catch (Exception $e) {
                                    error_log("SSE Redis: Error fetching game data for ID $gameId: " . $e->getMessage());
                                }
                            }
                            break;
                            
                        case 'texts:' . $this->rootStoryId:
                            if (isset($data['related_id'])) {
                                $textId = $data['related_id'];
                                
                                try {
                                    $nodeData = $this->pollingService->fetchTextData($textId, $this->writerId);
                                    
                                    if ($nodeData) {
                                        $searchResults = $this->search ? 
                                            $this->pollingService->fetchSearchResults($this->search, $this->rootStoryId, $this->writerId) : 
                                            [];
                                            
                                        $this->sendEvent('update', [
                                            'modifiedGames' => [], 
                                            'modifiedNodes' => [$nodeData],
                                            'searchResults' => $searchResults
                                        ]);
                                    }
                                } catch (Exception $e) {
                                    error_log("SSE Redis: Error fetching text data for ID $textId: " . $e->getMessage());
                                }
                            }
                            break;
                            
                        case 'notifications:' . $this->writerId:
                            if (isset($data['related_id'])) {
                                $notificationId = $data['related_id'];
                                
                                error_log("SSE Redis: Processing notification ID $notificationId for writer {$this->writerId}");
                                
                                try {
                                    $notificationUpdates = $this->pollingService->fetchNotificationData($this->writerId, $notificationId);
                                    
                                    if (!empty($notificationUpdates)) {
                                        error_log("SSE Redis: Sending notification update for ID $notificationId");
                                        $this->sendEvent('notificationUpdate', $notificationUpdates);
                                    } else {
                                        error_log("SSE Redis: No notification data found for ID $notificationId and writer {$this->writerId}");
                                    }
                                } catch (Exception $e) {
                                    error_log("SSE Redis: Error fetching notification data for ID $notificationId: " . $e->getMessage());
                                }
                            } else {
                                error_log("SSE Redis: Notification message missing related_id. Data: " . json_encode($data));
                            }
                            break;
                    }
                    
                    // Update last event ID if present in the message
                    if (isset($data['id'])) {
                        $this->lastEventId = $data['id'];
                    }
                    
                } catch (\Exception $e) {
                    error_log("SSE Redis: Error processing message: " . $e->getMessage());
                }
            });
        } catch (\Exception $e) {
            error_log("SSE: Redis subscription error: " . $e->getMessage());
            $this->useRedis = false;
            // Fall back to database polling with fresh timing variables
            $startTime = time();
            $lastKeepaliveTime = time();
            $this->runDatabasePolling($startTime, $lastKeepaliveTime);
        }
    }
    
    /**
     * Check for events that might have been missed while disconnected
     * This ensures we don't miss events even with Redis
     */
    private function checkMissedEvents() {
        try {
            // Get updates directly using the polling service
            $updates = $this->pollingService->getUpdates(
                $this->lastEventId,
                $this->writerId, 
                $this->rootStoryId,
                $this->filters,
                $this->search,
                $this->lastTreeCheck,
                $this->lastGameCheck
            );
            
            // Send notification updates if any
            if (!empty($updates['notifications'])) {
                $this->sendEvent('notificationUpdate', $updates['notifications']);
            }
            
            // Send other updates if any
            if (!empty($updates['modifiedGames']) || !empty($updates['modifiedNodes'])) {
                $this->sendEvent('update', [
                    'modifiedGames' => $updates['modifiedGames'],
                    'modifiedNodes' => $updates['modifiedNodes'],
                    'searchResults' => $updates['searchResults']
                ]);
            }
            
            // Update lastEventId
            if (isset($updates['lastEventId'])) {
                $this->lastEventId = $updates['lastEventId'];
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
                
                // Refresh database connections periodically to prevent timeouts
                if ((time() - $this->lastConnectionRefresh) >= $this->connectionRefreshInterval) {
                    DatabaseConnection::refreshConnections();
                    $this->lastConnectionRefresh = time();
                }
                
                // Send keepalive if needed
                if ((time() - $lastKeepaliveTime) >= $this->keepaliveInterval) {
                    $this->sendEvent('keepalive', [
                        'timestamp' => time()
                    ]);
                    $lastKeepaliveTime = time();
                }
                
                // Get updates directly using the polling service
                $updates = $this->pollingService->getUpdates(
                    $this->lastEventId,
                    $this->writerId, 
                    $this->rootStoryId,
                    $this->filters,
                    $this->search,
                    $this->lastTreeCheck,
                    $this->lastGameCheck
                );
                
                // Send notification updates if any
                if (!empty($updates['notifications'])) {
                    $this->sendEvent('notificationUpdate', $updates['notifications']);
                }
                
                // Send other updates if any
                if (!empty($updates['modifiedGames']) || !empty($updates['modifiedNodes'])) {
                    $this->sendEvent('update', [
                        'modifiedGames' => $updates['modifiedGames'],
                        'modifiedNodes' => $updates['modifiedNodes'],
                        'searchResults' => $updates['searchResults']
                    ]);
                }
                
                // Update lastEventId if present
                if (isset($updates['lastEventId'])) {
                    $this->lastEventId = $updates['lastEventId'];
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
        }
    }
    
    /**
     * Process events from the Event model
     * 
     * @param array $events Events to process
     */
/*     private function processEvents($events) {
        // We actually want to reuse the polling service with the lastEventId
        // rather than passing in events directly
        $updates = $this->pollingService->getUpdates(
            $this->lastEventId,
            $this->writerId, 
            $this->rootStoryId,
            $this->filters,
            $this->search
        );
        
        // Send notification updates if any
        if (!empty($updates['notifications'])) {
            $this->sendEvent('notificationUpdate', $updates['notifications']);
        }
        
        // Send other updates if any
        if (!empty($updates['modifiedGames']) || !empty($updates['modifiedNodes'])) {
            $this->sendEvent('update', [
                'modifiedGames' => $updates['modifiedGames'],
                'modifiedNodes' => $updates['modifiedNodes'],
                'searchResults' => $updates['searchResults']
            ]);
        }
        
        // Update lastEventId
        if (isset($updates['lastEventId'])) {
            $this->lastEventId = $updates['lastEventId'];
        }
    } */
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