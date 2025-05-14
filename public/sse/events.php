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
            // PermissionsService ensures consistent permission handling between
            // controller and non-controller contexts like this SSE implementation
            require_once('../../services/PermissionsService.php');
            
            // Initialize models
            $this->eventModel = new Event();
            $this->gameModel = new Game();
            $this->textModel = new Text();
            $this->notificationModel = new Notification();
            
        } catch (Exception $e) {
            $this->sendErrorEvent("Failed to load dependencies: " . $e->getMessage());
            exit;
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
            } catch (Exception $e) {
                error_log("SSE: Error getting max event ID: " . $e->getMessage());
                // Keep lastEventId as is if there's an error
            }
        }
    }
    
    /**
     * Send an event to the client
     * 
     * @param string $event Event name
     * @param mixed $data Event data (will be JSON encoded)
     */
    private function sendEvent($event, $data) {
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
                    
                } catch (Exception $e) {
                    // Log error and send error event
                    error_log("SSE Error: " . $e->getMessage());
                    $this->sendEvent('error', [
                        'message' => 'Server error occurred: ' . $e->getMessage()
                    ]);
                    sleep(5); // Wait before retrying
                }
            }
        } catch (Exception $e) {
            $this->sendErrorEvent('Server error: ' . $e->getMessage() . ' in ' . $e->getFile() . ' line ' . $e->getLine());
            exit;
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
                        continue;
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
        
        // Send update event if we have any updates
        if (!empty($updates['modifiedGames']) || !empty($updates['modifiedNodes'])) {
            $this->sendEvent('update', $updates);
        }
    }
}

// Run the SSE handler if this file is accessed directly
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    try {
        $handler = new EventHandler($sessionWriterId);
        $handler->run();
    } catch (Exception $e) {
        header('Content-Type: text/event-stream');
        echo "event: error\n";
        echo "data: " . json_encode(['error' => 'Server error: ' . $e->getMessage()]) . "\n\n";
        exit;
    }
} 