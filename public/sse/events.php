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

    // Get the game_id from the rootStoryId
    private $gameId;
    
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
    
    // NEW: Game subscription type for simple filtering
    private $gameSubscriptionType;
    
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

        // Set the game_id from the rootStoryId
        $this->setGameIdFromRootStoryId();
        
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
        // Remove lastEventId from URL parameters - we'll use session tracking
        // $this->lastEventId = isset($_GET['lastEventId']) ? intval($_GET['lastEventId']) : null;
        $this->rootStoryId = isset($_GET['rootStoryId']) ? $_GET['rootStoryId'] : null;
        $this->filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
        $this->search = isset($_GET['search']) ? $_GET['search'] : '';
        $this->lastTreeCheck = isset($_GET['lastTreeCheck']) ? $_GET['lastTreeCheck'] : null;
        $this->lastGameCheck = isset($_GET['lastGameCheck']) ? $_GET['lastGameCheck'] : null;
        
        // NEW: Game subscription type for simple filtering
        $this->gameSubscriptionType = isset($_GET['gameSubscriptionType']) ? $_GET['gameSubscriptionType'] : 'all_games';
        
        // Initialize session-based lastEventId
        $this->initializeSessionEventId();
    }
    
    /**
     * Initialize session-based event ID tracking
     */
    private function initializeSessionEventId() {
        $sessionKey = 'lastEventId_' . ($this->writerId ?? 'guest');
        $this->lastEventId = $_SESSION[$sessionKey] ?? null;
        
        if ($this->lastEventId === null) {
            try {
                // Get the actual maximum event ID to avoid processing historical events
                require_once(__DIR__ . '/../../model/Event.php');
                $eventModel = new Event();
                $maxEventId = $eventModel->getMaxEventId();
                
                if ($maxEventId !== null) {
                    $this->lastEventId = $maxEventId;
                    $_SESSION[$sessionKey] = $maxEventId;
                    error_log("SSE: Initialized session lastEventId to current maximum: $maxEventId for user {$this->writerId}");
                } else {
                    $this->lastEventId = 0;
                    $_SESSION[$sessionKey] = 0;
                    error_log("SSE: No events found, initialized session lastEventId to 0 for user {$this->writerId}");
                }
            } catch (\Exception $e) {
                error_log("SSE: Error initializing session event ID: " . $e->getMessage());
                $this->lastEventId = 0;
                $_SESSION[$sessionKey] = 0;
            }
        } else {
            error_log("SSE: Using existing session lastEventId: {$this->lastEventId} for user {$this->writerId}");
        }
    }
    
    /**
     * Update session-based lastEventId
     */
    private function updateSessionEventId($newEventId) {
        $sessionKey = 'lastEventId_' . ($this->writerId ?? 'guest');
        $this->lastEventId = $newEventId;
        $_SESSION[$sessionKey] = $newEventId;
        error_log("SSE: Updated session lastEventId to $newEventId for user {$this->writerId}");
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
            require_once('../../model/WriterActivity.php');
            
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

    private function setGameIdFromRootStoryId() {
        if (!$this->rootStoryId) {
            $this->gameId = null;
            return;
        }
        
        $gameModel = new Game();
        $this->gameId = $gameModel->selectGameId($this->rootStoryId);
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
        // Define base channels that all clients get
        $channels = [
            'activities:site',     // All clients get site-wide activity counts
            'activities:games',    // All clients get game-specific activity counts
            'users:activity',      // NEW: All clients get individual user activity updates
        ];
        
        // Add context-aware game subscription based on gameSubscriptionType
        switch ($this->gameSubscriptionType) {
            case 'all_games':
                // Subscribe to all game updates (game list page)
                $channels[] = 'games:updates';
                error_log("SSE: Subscribed to ALL game updates (game list context)");
                break;
                
            case 'single_game':
                // Subscribe to specific game updates using rootStoryId
                if ($this->rootStoryId) {
                    $channels[] = 'games:' . $this->rootStoryId;
                    error_log("SSE: Subscribed to SINGLE game updates for rootStoryId: {$this->rootStoryId}");
                } else {
                    error_log("SSE: single_game subscription requested but no rootStoryId available");
                }
                break;
                
            case 'none':
                // No game subscription (text form context - SIMPLIFIED)
                // 
                // FUTURE ENHANCEMENT: If you want users to receive updates on form pages:
                // - Modify GameSubscriptionManager.js text_form case to return 'single_game' or 'all_games'
                // - Then adjust the subscription logic here accordingly
                error_log("SSE: NO game subscription (text form - simplified, no updates)");
                break;
                
            default:
                // Fallback to all games for unknown subscription types
                $channels[] = 'games:updates';
                error_log("SSE: Unknown gameSubscriptionType '{$this->gameSubscriptionType}', falling back to all games");
        }
        
        // Add user-specific notification channel if authenticated
        if ($this->writerId) {
            $channels[] = 'notifications:' . $this->writerId;
        }
        
        // Add story-specific channels if viewing a story
        // BUT only if gameSubscriptionType is not 'none' (simplified logic for forms)
        if ($this->rootStoryId && $this->gameSubscriptionType !== 'none') {
            $channels[] = 'texts:' . $this->rootStoryId;        // Text updates
            
            // Add text activity subscriptions    
            if ($this->gameId) {
                $channels[] = 'activities:texts:' . $this->gameId; // Text-level activities (use game_id for consistency)
                error_log("SSE: Subscribed to text activities for game_id: $this->gameId (from rootStoryId: {$this->rootStoryId})");
            } else {
                error_log("SSE: Could not find game_id for rootStoryId: {$this->rootStoryId}");
            }
        } else if ($this->rootStoryId && $this->gameSubscriptionType === 'none') {
            error_log("SSE: Skipping text subscriptions (gameSubscriptionType is 'none' - text form context)");
        }
        
        // Before subscribing, check for any missed events via database
        $this->checkMissedEvents();
        
        // Subscribe to channels with enhanced connection monitoring
        try {
            error_log("SSE: Starting Redis subscription for connection ID: " . $this->connectionId . " | Writer: " . $this->writerId);
            
            $this->redisManager->subscribe($channels, function($redis, $channel, $message) {
                try {
                    // Check if client disconnected before processing
                    if (connection_aborted()) {
                        error_log("SSE Redis: Client disconnected (connection_aborted), exiting subscription - ID: " . $this->connectionId);
                        return false; // This should stop the subscription
                    }
                    
                    // Test if we can still write to the client
                    if (!$this->testConnection()) {
                        error_log("SSE Redis: Connection test failed, exiting subscription - ID: " . $this->connectionId);
                        return false;
                    }
                    
                    error_log("SSE Redis: Received message on channel '$channel' for connection " . $this->connectionId);
                    
                    // Process the received message
                    $data = json_decode($message, true);
                    if (!$data) {
                        error_log("SSE Redis: Invalid JSON in message: " . $message);
                        return;
                    }
                    
                    // Create appropriate deduplication key based on message type
                    $messageKey = '';
                    if ($channel === 'activities:site' || $channel === 'activities:games') {
                        // For activity messages, use source and timestamp for uniqueness
                        $timestamp = $data['timestamp'] ?? time();
                        $source = $data['source'] ?? 'unknown';
                        $messageKey = $channel . ':' . $source . ':' . $timestamp . ':' . $this->connectionId;
                    } else if (strpos($channel, 'activities:texts:') === 0) {
                        // For text activity messages, use writer_id and timestamp for uniqueness
                        $timestamp = $data['timestamp'] ?? time();
                        $writerId = $data['writer_id'] ?? 'unknown';
                        $messageKey = $channel . ':activity:' . $writerId . ':' . $timestamp . ':' . $this->connectionId;
                    } else {
                        // For other events (votes, texts, etc.), use the event ID
                        $eventId = $data['id'] ?? uniqid();
                        $messageKey = $channel . ':' . $eventId . ':' . $this->writerId . ':' . $this->connectionId;
                    }
                    
                    // Check if we've already processed this message locally
                    if (in_array($messageKey, $this->sentMessageIds)) {
                        error_log("SSE Redis: Duplicate message detected for connection " . $this->connectionId . ", skipping");
                        return;
                    }
                    
                    // Add to local processed messages
                    $this->sentMessageIds[] = $messageKey;
                    
                    // Limit array size to prevent memory issues
                    if (count($this->sentMessageIds) > 1000) {
                        array_splice($this->sentMessageIds, 0, 500);
                    }

                    // Process based on channel
                    switch (true) {
                        case $channel === 'games:updates':
                            // Handle all games subscription (game list page)
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
                            
                        case strpos($channel, 'games:') === 0 && $channel !== 'games:updates':
                            // Handle specific game subscription (single game context)
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
                                    error_log("SSE Redis: Error fetching specific game data for ID $gameId: " . $e->getMessage());
                                }
                            }
                            break;
                            
                        case $channel === 'texts:' . $this->rootStoryId:
                            if (isset($data['related_id'])) {
                                // Traditional text update
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
                            
                        case $channel === 'notifications:' . $this->writerId:
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
                            
                        case $channel === 'activities:site':
                            // Site-wide activity counts - handle both old and new formats
                            if (isset($data['data'])) {
                                $activityData = $data['data'];
                                $source = $data['source'] ?? 'unknown';
                                
                                try {
                                    $this->sendEvent('siteActivityUpdate', $activityData);
                                } catch (Exception $e) {
                                    error_log("SSE Redis: ❌ Error sending site activity update to connection " . $this->connectionId . ": " . $e->getMessage());
                                    return false; // Exit subscription on send error
                                }
                            } else {
                                error_log("SSE Redis: Site activity message missing data. Full message: " . json_encode($data));
                            }
                            break;
                            
                        case $channel === 'activities:games':
                            // Game-specific activity counts (global channel - all users)
                            if (isset($data['data'])) {
                                $gameActivityData = $data['data'];
                                $source = $data['source'] ?? 'unknown';
                                
                                try {
                                    $this->sendEvent('gameActivityUpdate', $gameActivityData);
                                } catch (Exception $e) {
                                    error_log("SSE Redis: ❌ Error sending game activity update to connection " . $this->connectionId . ": " . $e->getMessage());
                                    return false; // Exit subscription on send error
                                }
                            } else {
                                error_log("SSE Redis: Game activity message missing data. Full message: " . json_encode($data));
                            }
                            break;
                            
                        case strpos($channel, 'activities:texts:') === 0:
                            // Text-level activity updates (individual user activities for current game viewers)
                            if (isset($data['data'])) {
                                $textActivityData = $data['data'];
                                $source = $data['source'] ?? 'unknown';
                                
                                // Extract game_id from channel for logging
                                $gameIdFromChannel = str_replace('activities:texts:', '', $channel);
                                
                                error_log("SSE Redis: Received text activity update on channel '$channel' for game_id: $gameIdFromChannel (connection: " . $this->connectionId . ")");
                                error_log("SSE Redis: Text activity data: " . json_encode($textActivityData));
                                
                                try {
                                    $this->sendEvent('textActivityUpdate', $textActivityData);
                                    error_log("SSE Redis: ✅ Successfully sent textActivityUpdate event to client " . $this->connectionId . " (source: $source)");
                                } catch (Exception $e) {
                                    error_log("SSE Redis: ❌ Error sending text activity update to connection " . $this->connectionId . ": " . $e->getMessage());
                                    return false; // Exit subscription on send error
                                }
                            } else {
                                error_log("SSE Redis: Text activity message missing data. Full message: " . json_encode($data));
                            }
                            break;
                            
                        case $channel === 'users:activity':
                            // NEW: Individual user activity updates (user-centric tracking)
                            if (isset($data['data'])) {
                                $userActivityData = $data['data'];
                                $source = $data['source'] ?? 'unknown';
                                
                                error_log("SSE Redis: Received user activity update for writer_id: " . $userActivityData['writer_id'] . " (connection: " . $this->connectionId . ")");
                                
                                try {
                                    $this->sendEvent('userActivityUpdate', $userActivityData);
                                    error_log("SSE Redis: ✅ Successfully sent userActivityUpdate event to client " . $this->connectionId . " (source: $source)");
                                } catch (Exception $e) {
                                    error_log("SSE Redis: ❌ Error sending user activity update to connection " . $this->connectionId . ": " . $e->getMessage());
                                    return false; // Exit subscription on send error
                                }
                            } else {
                                error_log("SSE Redis: User activity message missing data. Full message: " . json_encode($data));
                            }
                            break;
                    }
                    
                    // Update last event ID if present in the message
                    if (isset($data['id'])) {
                        $this->updateSessionEventId($data['id']);
                    }
                    
                } catch (\Exception $e) {
                    error_log("SSE Redis: Error processing message for connection " . $this->connectionId . ": " . $e->getMessage());
                    return false; // Exit subscription on processing error
                }
            });
        } catch (\Exception $e) {
            error_log("SSE: Redis subscription error for connection " . $this->connectionId . ": " . $e->getMessage());
            $this->useRedis = false;
            // Fall back to database polling with fresh timing variables
            $startTime = time();
            $lastKeepaliveTime = time();
            $this->runDatabasePolling($startTime, $lastKeepaliveTime);
        }
    }
    
    /**
     * Test if the SSE connection is still alive by attempting to send a comment
     * @return bool True if connection is alive, false otherwise
     */
    private function testConnection() {
        try {
            // Send a comment line to test the connection without affecting the event stream
            echo ": connection-test\n";
            flush();
            
            // If flush doesn't throw an exception and we can detect broken pipes, check them
            if (connection_status() !== CONNECTION_NORMAL) {
                return false;
            }
            
            return true;
        } catch (\Exception $e) {
            return false;
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
            
            // Apply game filtering if needed
            if ($this->gameSubscriptionType !== 'all_games' && !empty($updates['modifiedGames'])) {
                $updates['modifiedGames'] = $this->filterGameUpdates($updates['modifiedGames']);
            }
            
            // Send other updates if any
            if (!empty($updates['modifiedGames']) || !empty($updates['modifiedNodes'])) {
                $this->sendEvent('update', [
                    'modifiedGames' => $updates['modifiedGames'],
                    'modifiedNodes' => $updates['modifiedNodes'],
                    'searchResults' => $updates['searchResults']
                ]);
            }
            
            // Send text activity updates if any
/*             if (!empty($updates['textActivity'])) {
                $this->sendEvent('textActivityUpdate', $updates['textActivity']);
            }
             */
            // Send user activity updates if any (user-centric tracking)
            if (!empty($updates['userActivity'])) {
                $this->sendEvent('userActivityUpdate', $updates['userActivity']);
            }
            
            // Fetch and send current site-wide activity data for initialization
            // try {
            //     $siteActivityData = $this->pollingService->fetchSiteWideActivityData();
            //     if ($siteActivityData) {
            //         $this->sendEvent('siteActivityUpdate', $siteActivityData);
            //     }
            // } catch (Exception $e) {
            //     error_log("SSE: Error fetching site activity data: " . $e->getMessage());
            // }

            // Fetch and send game activity data for initialization  
            // try {
            //     $gameActivityData = $this->pollingService->fetchGameActivityData();
            //     if ($gameActivityData) {
            //         $this->sendEvent('gameActivityUpdate', $gameActivityData);
            //     }
            // } catch (Exception $e) {
            //     error_log("SSE: Error fetching game activity data: " . $e->getMessage());
            // }

            // Also fetch and send initial text activity data if viewing a story
            // if ($this->rootStoryId) {
            //     try {
            //         require_once('../../model/Game.php');
            //         $gameModel = new Game();
            //         $gameId = $gameModel->selectGameId($this->rootStoryId);
                    
            //         if ($gameId) {
            //             $textActivityData = $this->pollingService->fetchTextActivityData($gameId);
            //             if ($textActivityData) {
            //                 $this->sendEvent('textActivityUpdate', $textActivityData);
            //             }
            //         }
            //     } catch (Exception $e) {
            //         error_log("SSE: Error fetching initial text activity data: " . $e->getMessage());
            //     }
            // }
            
            // Fetch and send initial user activity data for user-centric tracking
            // try {
            //     $userActivityData = $this->pollingService->fetchUserActivityData();
            //     if ($userActivityData) {
            //         $this->sendEvent('userActivityUpdate', $userActivityData);
            //     }
            // } catch (Exception $e) {
            //     error_log("SSE: Error fetching initial user activity data: " . $e->getMessage());
            // }
            
            // Update lastEventId
            if (isset($updates['lastEventId'])) {
                $this->updateSessionEventId($updates['lastEventId']);
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
                
                // Apply game filtering if needed
                if ($this->gameSubscriptionType !== 'all_games' && !empty($updates['modifiedGames'])) {
                    $updates['modifiedGames'] = $this->filterGameUpdates($updates['modifiedGames']);
                }
                
                // Send other updates if any
                if (!empty($updates['modifiedGames']) || !empty($updates['modifiedNodes'])) {
                    $this->sendEvent('update', [
                        'modifiedGames' => $updates['modifiedGames'],
                        'modifiedNodes' => $updates['modifiedNodes'],
                        'searchResults' => $updates['searchResults']
                    ]);
                }
                
                // Send text activity updates if any
                if (!empty($updates['textActivity'])) {
                    $this->sendEvent('textActivityUpdate', $updates['textActivity']);
                }
                
                // Send user activity updates if any (user-centric tracking)
                if (!empty($updates['userActivity'])) {
                    $this->sendEvent('userActivityUpdate', $updates['userActivity']);
                }
                
                // DEPRECATED: Legacy activity-centric data fetching - Frontend now uses user-centric tracking only
                // The UserActivityDataManager derives all activity counts from userActivityUpdate events automatically
                // Commenting out to reduce database queries and simplify data flow
                
                // Periodically fetch and send user activity data for user-centric tracking (every 30 seconds)
                static $lastActivityCheck = 0;
                if ((time() - $lastActivityCheck) >= 30) {
                    try {
                        // DEPRECATED: Legacy activity-centric events
                        // $siteActivityData = $this->pollingService->fetchSiteWideActivityData();
                        // if ($siteActivityData) {
                        //     $this->sendEvent('siteActivityUpdate', $siteActivityData);
                        // }
                        
                        // $gameActivityData = $this->pollingService->fetchGameActivityData();
                        // if ($gameActivityData) {
                        //     $this->sendEvent('gameActivityUpdate', $gameActivityData);
                        // }
                        
                        // if ($this->rootStoryId) {
                        //     try {
                        //         require_once('../../model/Game.php');
                        //         $gameModel = new Game();
                        //         $gameId = $gameModel->selectGameId($this->rootStoryId);
                        //         
                        //         if ($gameId) {
                        //             $textActivityData = $this->pollingService->fetchTextActivityData($gameId);
                        //             if ($textActivityData) {
                        //                 $this->sendEvent('textActivityUpdate', $textActivityData);
                        //             }
                        //         }
                        //     } catch (Exception $e) {
                        //         error_log("SSE: Error fetching text activity data during polling: " . $e->getMessage());
                        //     }
                        // }
                        
                        // User-centric tracking (ACTIVE) - This is the only activity data the frontend needs
                        try {
                            $userActivityData = $this->pollingService->fetchUserActivityData();
                            if ($userActivityData) {
                                $this->sendEvent('userActivityUpdate', $userActivityData);
                            }
                        } catch (Exception $e) {
                            error_log("SSE: Error fetching user activity data during polling: " . $e->getMessage());
                        }
                        
                        $lastActivityCheck = time();
                    } catch (Exception $e) {
                        error_log("SSE: Error fetching user activity data during polling: " . $e->getMessage());
                    }
                }

                // Update lastEventId if present
                if (isset($updates['lastEventId'])) {
                    $this->updateSessionEventId($updates['lastEventId']);
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
    
    /**
     * Simple post-query filtering for game updates
     */
    private function filterGameUpdates($gameUpdates) {
        switch ($this->gameSubscriptionType) {
            case 'single_game':
                // Only include games that match the current rootStoryId
                return array_filter($gameUpdates, function($game) {
                    return isset($game['text_id']) && $game['text_id'] == $this->rootStoryId;
                });
            case 'none':
                return []; // No game updates
            default:
                return $gameUpdates; // 'all_games' or unknown - return all
        }
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