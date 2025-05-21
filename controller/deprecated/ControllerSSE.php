<?php
RequirePage::model('Game');
RequirePage::model('Text');
RequirePage::model('Notification');
RequirePage::model('Event');

class ControllerSSE extends Controller {
    private $game;
    private $text;
    private $notification;
    private $event;
    private $currentUserId;
    private $filters;
    private $search;
    private $rootStoryId;
    private $lastEventId;

    public function index() {
        // No implementation needed
    }

    /**
     * Simple debug endpoint to test SSE functionality
     */
    public function debug() {
        // Disable error output
        ini_set('display_errors', 'off');
        error_reporting(0);
        
        // Clear output buffers
        if (ob_get_level()) ob_end_clean();
        
        // Set headers
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no');
        
        // Send initial comment
        echo ": SSE debug connection established\n\n";
        flush();
        
        // Send 10 test events and exit
        for ($i = 0; $i < 10; $i++) {
            // Send event
            echo "event: debug\n";
            echo "data: " . json_encode(['iteration' => $i, 'time' => time()]) . "\n\n";
            flush();
            
            // Wait 1 second between events
            sleep(1);
        }
        
        // Send completed event
        echo "event: complete\n";
        echo "data: " . json_encode(['message' => 'Debug complete']) . "\n\n";
        flush();
        exit();
    }

    public function stream() {
        // Disable error output to prevent breaking SSE format
        ini_set('display_errors', 'off');
        error_reporting(0);
        
        // Remove execution time limit for this endpoint
        set_time_limit(0);
        
        // Make sure we have no previous output
        if (ob_get_level()) ob_end_clean();
        
        // 1. Close session to prevent blocking other requests
        session_write_close();
        
        // 2. Set headers for SSE
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        header('X-Accel-Buffering: no'); // Disable Nginx buffering
        
        // Send a comment to start the connection and test headers
        echo ": SSE connection established\n\n";
        flush();
        
        // 3. Initialize properties
        try {
            $this->initializeProperties();
        } catch (Exception $e) {
            echo "event: error\n";
            echo "data: " . json_encode(['message' => 'Failed to initialize: ' . $e->getMessage()]) . "\n\n";
            flush();
            exit();
        }
        
        // 4. Enter the event stream loop
        while (true) {
            try {
                $this->processEvents();
                
                // Sleep to prevent overwhelming the server
                sleep(2);
                
                // Check if client is still connected
                if (connection_aborted()) {
                    exit();
                }
            } catch (Exception $e) {
                // Log error and send error event
                error_log("SSE Error: " . $e->getMessage());
                echo "event: error\n";
                echo "data: " . json_encode(['message' => 'Server error occurred']) . "\n\n";
                flush();
                sleep(5); // Wait before retrying
            }
        }
    }

    private function initializeProperties() {
        // Initialize models
        $this->game = new Game();
        $this->text = new Text();
        $this->notification = new Notification();
        $this->event = new Event();
        
        // Get parameters
        $this->currentUserId = $_SESSION['writer_id'] ?? null;
        $this->filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
        $this->search = isset($_GET['search']) ? $_GET['search'] : '';
        $this->rootStoryId = isset($_GET['rootStoryId']) ? $_GET['rootStoryId'] : null;
        $this->lastEventId = isset($_GET['lastEventId']) ? intval($_GET['lastEventId']) : null;
    }

    private function processEvents() {        
        // Get new events
        $events = $this->event->getFilteredEvents(
            $this->lastEventId,
            $this->currentUserId,
            $this->rootStoryId
        );

        if (empty($events)) {
            // Send keepalive if no updates
            echo "event: keepalive\n";
            echo "data: " . json_encode(['timestamp' => time()]) . "\n\n";
            flush();
            return;
        }
        
        // Update lastEventId
        $this->lastEventId = end($events)['id'];

        // Process events and collect updates
        $updates = $this->collectUpdates($events);

        // Send updates if any
        if (!empty($updates)) {
            echo "event: update\n";
            echo "data: " . json_encode($updates) . "\n\n";
            flush();
        }
    }

    private function collectUpdates($events) {
        // Initialize the updates array
        $updates = [
            'modifiedGames' => [],
            'modifiedNodes' => [],
            'searchResults' => []
        ];

        // Process each event
        foreach ($events as $event) {            
            switch ($event['related_table']) {
                case 'game':
                    $gameUpdates = $this->getGameUpdates($event);
                    if (!empty($gameUpdates)) {
                        $updates['modifiedGames'] = array_merge($updates['modifiedGames'], $gameUpdates);
                    }
                    break;

                case 'text':
                    $nodeUpdates = $this->getNodeUpdates($event);
                    if (!empty($nodeUpdates)) {
                        $updates['modifiedNodes'] = array_merge($updates['modifiedNodes'], $nodeUpdates);
                    }
                    break;

                case 'notification':
                    $notificationUpdates = $this->getNotificationUpdates($event);
                    if (!empty($notificationUpdates)) {
                        // Send notifications as a separate event
                        echo "event: notificationUpdate\n";
                        echo "data: " . json_encode($notificationUpdates) . "\n\n";
                        flush();
                    }
                    break;
            }
        }

        // Add search results if needed
        if ($this->search && $this->rootStoryId && !empty($updates['modifiedNodes'])) {
            $updates['searchResults'] = $this->getSearchResults();
        }

        return $updates;
    }

    // Get game updates
    private function getGameUpdates($event) {
        $gameId = $event['related_id'];
        return $this->game->getGames(null, $this->filters, $gameId, $this->search);
    }

    // Get node updates
    private function getNodeUpdates($event) {
        if (!$this->rootStoryId) {
            return [];
        }

        // Get the game ID from the root story ID
        $gameId = $this->game->selectGameId($this->rootStoryId);

        // Get the specific text by ID (idIsGameId = false)
        $nodes = $this->text->selectTexts($this->currentUserId, $event['related_id'], false);
        
        // Add permissions to the node
        if ($nodes) {
            $this->addPermissions($nodes, $this->currentUserId, [$nodes]);
            return [$nodes]; // Return as array since that's what the rest of the code expects
        }

        return [];
    }

    // Get notification updates
    private function getNotificationUpdates($event) {
        // Get the specific notification by ID
        $notificationId = $event['related_id'];
        
        error_log("SSE: Getting notification with ID: $notificationId for user: {$this->currentUserId}");
        
        // Get the notification directly - the Event filtering already ensured it's for this user
        $sql = "SELECT n.*, g.root_text_id, t.title as game_title, 
                wt.title as winning_title 
                FROM notification n
                JOIN game g ON n.game_id = g.id
                JOIN text t ON g.root_text_id = t.id
                LEFT JOIN text wt ON g.winner = wt.id
                WHERE n.id = :id
                AND n.deleted_at IS NULL";
        
        $stmt = $this->notification->prepare($sql);
        $stmt->bindValue(':id', $notificationId);
        $stmt->execute();
        $notification = $stmt->fetch();
        
        // Check if notification was found
        if ($notification) {
            error_log("SSE: Found notification with ID: $notificationId, type: {$notification['notification_type']}");
            return [$notification]; // Return as array for consistency
        } else {
            error_log("SSE: No notification found with ID: $notificationId");
            return [];
        }
    }

    // Get search results
    private function getSearchResults() {
        if (!$this->search || !$this->rootStoryId) {
            return [];
        }

        $gameId = $this->game->selectGameId($this->rootStoryId);
        return $this->text->searchNodesByTerm($this->search, $gameId, $this->currentUserId);
    }
}