<?php
RequirePage::model('Sse');

class ControllerSSE extends Controller {
    public function index(){

    }
    public function stream() {
        header('Content-Type: text/event-stream');
        header('Cache-Control: no-cache');
        header('Connection: keep-alive');

        $lastId = isset($_GET['lastId']) ? intval($_GET['lastId']) : 0;
        $sse = new Sse();

        $newGames = $sse->checkForNewStories($lastId);
        
        if (!empty($newGames)) {
            foreach ($newGames as $game) {
                echo "event: newGame\n";
                echo "data: " . json_encode($game) . "\n\n";
                $lastId = max($lastId, $game['id']);
            }
        } else {
            // Send a comment to keep the connection alive
            echo ": heartbeat\n\n";
        }

        echo "id: $lastId\n\n";

        ob_flush();
        flush();
        exit(); // Make sure to exit after sending the response
    }
}