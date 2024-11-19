<?php
RequirePage::model('Sse');

class ControllerSSE extends Controller {
    public function index(){

    }
    public function stream() {
        // 1. Close session to prevent blocking other requests
        session_write_close();
        
        // 2. Set headers for SSE
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');
        
        // 3. Get initial parameters
        $lastCheck = isset($_GET['lastCheck']) ? 
            date('Y-m-d H:i:s', intval($_GET['lastCheck']) / 1000) : 
            date('Y-m-d H:i:s');
            
        // 4. Optional: Get games to watch
        $watchedGameIds = isset($_GET['gameIds']) ? 
            explode(',', $_GET['gameIds']) : 
            [];
        
        // 5. Enter the event stream loop
        while (true) {
            try {
                $sse = new Sse();
                // Check for modified games
                $modifiedGames = $sse->getModifiedGameIds($lastCheck, $watchedGameIds);
                
                if (!empty($modifiedGames)) {
                    // Send update event
                    echo "event: gameUpdate\n";
                    echo "data: " . json_encode($modifiedGames) . "\n\n";
                    
                    // Update lastCheck
                    $lastCheck = date('Y-m-d H:i:s');
                } else {
                    // Send keepalive
                    echo ": keepalive " . date('H:i:s') . "\n\n";
                }
                
                // Force flush the output buffer
                ob_flush();
                flush();
                
                // Yes, sleep(2) pauses for 2 seconds
                // This prevents overwhelming the server
                sleep(2);
                
                // Check if client is still connected
                if (connection_aborted()) {
                    exit();
                }
                
            } catch (Exception $e) {
                // Log error and exit
                error_log("SSE Error: " . $e->getMessage());
                exit();
            }
        }
    }
}