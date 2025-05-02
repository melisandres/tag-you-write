<?php
RequirePage::model('Game');
RequirePage::model('Text');
RequirePage::model('Notification');

class ControllerSSE extends Controller {
    public function index() {
        // No implementation needed
    }

    /**
     * Update the root story ID for the current SSE connection
     * 
     * @param string $rootStoryId The ID of the root story being viewed
     */
    public function updateRootStoryId($rootStoryId) {
        if (!isset($_SESSION['writer_id'])) {
            return json_encode(['status' => 'notLoggedin']);
        }
        
        // Store the root story ID in the session
        $_SESSION['current_viewed_root_story_id'] = $rootStoryId === 'null' ? null : $rootStoryId;
        
        return json_encode(['status' => 'ok']);
    }

    public function stream() {
        // Remove execution time limit for this endpoint
        set_time_limit(0);
        
        // 1. Close session to prevent blocking other requests
        session_write_close();
        
        // 2. Set headers for SSE
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        
        // 3. Get initial parameters
        $lastGamesCheck = isset($_GET['lastGamesCheck']) ? 
            date('Y-m-d H:i:s', intval($_GET['lastGamesCheck']) / 1000) : 
            date('Y-m-d H:i:s');
            
        // 4. Get additional parameters
        $filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $lastTreeCheck = isset($_GET['lastTreeCheck']) ? 
            date('Y-m-d H:i:s', intval($_GET['lastTreeCheck']) / 1000) : 
            null;
        $watchedGameIds = isset($_GET['gameIds']) ? 
            explode(',', $_GET['gameIds']) : 
            [];
        $rootStoryId = isset($_GET['rootStoryId']) ? $_GET['rootStoryId'] : null;
        
        // 5. Initialize models
        $game = new Game();
        $text = new Text();
        $notification = new Notification();
        $currentUserId = $_SESSION['writer_id'] ?? null;
        
        error_log("SSE: Stream started for user {$currentUserId} with lastGamesCheck: {$lastGamesCheck}");
        
        // 6. Enter the event stream loop
        while (true) {
            try {
                // Get modified games
                $modifiedGames = $game->getModifiedSince($lastGamesCheck, $filters, $search);
                if (!empty($modifiedGames)) {
                    error_log("SSE: Found modified games: " . json_encode($modifiedGames));
                    // Update lastGamesCheck to prevent duplicate game updates
                    $lastGamesCheck = date('Y-m-d H:i:s');
                    error_log("SSE: Updated lastGamesCheck to: {$lastGamesCheck}");
                }
                
                // Get modified nodes if rootStoryId is provided
                $modifiedNodes = [];
                error_log("SSE: Current rootStoryId: {$rootStoryId}, LastTreeCheck: {$lastTreeCheck}");
                
                if ($rootStoryId && $lastTreeCheck) {
                    $gameId = $game->selectGameId($rootStoryId);
                    error_log("SSE: Fetching nodes for gameId: {$gameId}");
                    $modifiedNodes = $text->selectTexts($currentUserId, $gameId, true, $lastTreeCheck);
                    if (!empty($modifiedNodes)) {
                        error_log("SSE: Found modified nodes for rootStoryId {$rootStoryId}: " . json_encode($modifiedNodes));
                        // Update lastTreeCheck to prevent duplicate node updates
                        $lastTreeCheck = date('Y-m-d H:i:s');
                        error_log("SSE: Updated lastTreeCheck to: {$lastTreeCheck}");
                    } else {
                        error_log("SSE: No modified nodes found for rootStoryId {$rootStoryId} with lastTreeCheck {$lastTreeCheck}");
                    }
                    
                    // Add permissions to the modified nodes
                    if (!empty($modifiedNodes)) {
                        foreach ($modifiedNodes as &$node) {
                            $this->addPermissions($node, $currentUserId, $modifiedNodes);
                        }
                    }
                } else {
                    error_log("SSE: Skipping node check - rootStoryId: {$rootStoryId}, lastTreeCheck: {$lastTreeCheck}");
                }
                
                // Get search results if search term is provided and we have a root story ID
                $searchResults = [];
                if ($search && $rootStoryId) {
                    $gameId = $game->selectGameId($rootStoryId);
                    $searchResults = $text->searchNodesByTerm($search, $gameId, $currentUserId, $lastTreeCheck);
                    if (!empty($searchResults)) {
                        error_log("SSE: Found search results for term '{$search}': " . json_encode($searchResults));
                        // Update lastTreeCheck for search results as well
                        $lastTreeCheck = date('Y-m-d H:i:s');
                        error_log("SSE: Updated lastTreeCheck for search results to: {$lastTreeCheck}");
                    }
                }
                
                // Get new notifications
                $newNotifications = $notification->getNewNotifications($lastGamesCheck);
                if (!empty($newNotifications)) {
                    error_log("SSE: Found new notifications: " . json_encode($newNotifications));
                    // Update lastGamesCheck for notifications
                    $lastGamesCheck = date('Y-m-d H:i:s');
                    error_log("SSE: Updated lastGamesCheck for notifications to: {$lastGamesCheck}");
                }
                
                // Send game updates if any
                if (!empty($modifiedGames) || !empty($modifiedNodes) || !empty($searchResults)) {
                    $updateData = [
                        'modifiedGames' => $modifiedGames,
                        'modifiedNodes' => $modifiedNodes,
                        'searchResults' => $searchResults
                    ];
                    error_log("SSE: Sending update event with data: " . json_encode($updateData));
                    echo "event: update\n";
                    echo "data: " . json_encode($updateData) . "\n\n";
                }
                
                // Keep notifications separate
                if (!empty($newNotifications)) {
                    error_log("SSE: Sending notification update event");
                    echo "event: notificationUpdate\n";
                    echo "data: " . json_encode($newNotifications) . "\n\n";
                }
                
                // Send keepalive if no updates
                if (empty($modifiedGames) && 
                    empty($modifiedNodes) && 
                    empty($searchResults) && 
                    empty($newNotifications)) {
                    echo ": keepalive " . date('H:i:s') . "\n\n";
                }
                
                // Force flush the output buffer
                ob_flush();
                flush();
                
                // Sleep to prevent overwhelming the server
                sleep(2);
                
                // Check if client is still connected
                if (connection_aborted()) {
                    error_log("SSE: Client connection aborted");
                    exit();
                }
            } catch (Exception $e) {
                // Log error and send error event
                error_log("SSE Error: " . $e->getMessage());
                echo "event: error\n";
                echo "data: " . json_encode(['message' => 'Server error occurred']) . "\n\n";
                ob_flush();
                flush();
                sleep(5); // Wait before retrying
            }
        }
    }
}