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
    
    // New polling service
    private $pollingService;
    
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
            require_once('../../services/EventPollingService.php');
            
            // Load Redis manager if it exists
            if (file_exists('../../services/RedisManager.php')) {
                require_once('../../services/RedisManager.php');
            }
            
            // Initialize models
            $this->eventModel = new Event();
            $this->gameModel = new Game();
            $this->textModel = new Text();
            $this->notificationModel = new Notification();
            
            // Initialize polling service
            $this->pollingService = new EventPollingService();
            
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
        // Use event ID for duplicate prevention if available
        $messageId = is_array($data) && isset($data['id']) ? $data['id'] : null;
        
        if ($messageId && in_array($messageId, $this->sentMessageIds)) {
            error_log("SSE: Skipping duplicate event ID: " . $messageId);
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
        
        // Log what we're subscribing to
        error_log("SSE: Subscribing to Redis channels: " . implode(', ', $channels));
        
        // Subscribe to channels - this is blocking and will run until connection is closed
        $this->redisManager->subscribe($channels, function($redis, $channel, $message) {
            try {
                error_log("SSE Redis: Received message on channel: $channel with message: " . substr($message, 0, 100));
                
                // Process the received message
                $data = json_decode($message, true);
                if (!$data) {
                    error_log("SSE Redis: Invalid JSON received: $message");
                    return;
                }
                
                error_log("SSE Redis: Decoded message data: " . json_encode($data));
                error_log("SSE Redis: IMPORTANT - Message contains id: " . ($data['id'] ?? 'none') . ", related_id: " . ($data['related_id'] ?? 'none'));
                
                // Use the event ID for duplicate prevention
                $messageId = $data['id'];
                
                // Check if we've already processed this message
                if (in_array($messageId, $this->sentMessageIds)) {
                    error_log("SSE Redis: SKIPPING duplicate message ID: $messageId");
                    return;
                }
                
                // Add to processed messages
                $this->sentMessageIds[] = $messageId;
                if (count($this->sentMessageIds) > 1000) {
                    array_splice($this->sentMessageIds, 0, 500);
                }

                $searchResults = [];
                if ($this->search && $this->rootStoryId) {
                    $searchResults = $this->getSearchResults();
                }
                
                // Process based on channel
                switch ($channel) {
                    case 'games:updates':
                        if (isset($data['related_id'])) {
                            $gameId = $data['related_id'];
                            $gameUpdates = $this->pollingService->fetchGameData($gameId, $this->filters, $this->search);
                            
                            if (!empty($gameUpdates)) {
                                $this->sendEvent('update', [
                                    'modifiedGames' => $gameUpdates, 
                                    'modifiedNodes' => [],
                                    'searchResults' => []
                                ]);
                            }
                        }
                        break;
                        
                    case 'texts:' . $this->rootStoryId:
                        if (isset($data['related_id'])) {
                            $textId = $data['related_id'];
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
                        }
                        break;
                        
                    case 'notifications:' . $this->writerId:
                        if (isset($data['related_id'])) {
                            $notificationId = $data['related_id'];
                            $notificationUpdates = $this->pollingService->fetchNotificationData($notificationId);
                            
                            if (!empty($notificationUpdates)) {
                                $this->sendEvent('notificationUpdate', $notificationUpdates);
                            }
                        }
                        break;
                }
                
                // Update last event ID if present in the message
                if (isset($data['id'])) {
                    $this->lastEventId = $data['id'];
                    error_log("SSE Redis: Updated lastEventId to: " . $this->lastEventId);
                }
                
                // Redis message counter
                $this->redisMessageCount++;
                error_log("SSE Redis: Total messages received: " . $this->redisMessageCount);
                
            } catch (\Exception $e) {
                error_log("SSE Redis: Error processing message: " . $e->getMessage());
                error_log("SSE Redis: Error trace: " . $e->getTraceAsString());
            }
        });
    }
    
    /**
     * Check for events that might have been missed while disconnected
     * This ensures we don't miss events even with Redis
     */
    private function checkMissedEvents() {
        try {
            error_log("SSE: Checking for missed events since lastEventId=" . $this->lastEventId);
            
            // Get updates directly using the polling service
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
                
                // Get updates directly using the polling service
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
            
            // Database message counter
            $this->databaseMessageCount++;
            error_log("SSE: Database polling events received: " . $this->databaseMessageCount);
        }
    }
    
    /**
     * Process events from the Event model
     * 
     * @param array $events Events to process
     */
    private function processEvents($events) {
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