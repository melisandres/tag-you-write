<?php
RequirePage::model('Event');
RequirePage::model('Game');
RequirePage::model('Text');
RequirePage::model('Notification');
RequirePage::model('WriterActivity'); // Ensure WriterActivity model is available from the DataFetchService... 
RequirePage::service('DataFetchService');

class ControllerEvent extends Controller {

    public function index(){
    }

    public function getEvents($lastEventId = null) {
        $eventModel = new Event();
        $newEvents = $eventModel->getEvents($lastEventId);
        //var_dump($newEvents);
        return $newEvents;
    }  
    
    public function getFilteredEvents() {
        $lastEventId = isset($_GET['lastEventId']) ? intval($_GET['lastEventId']) : null;
        $currentUserId = $_SESSION['writer_id'] ?? null;
        $rootStoryId = isset($_GET['rootStoryId']) ? $_GET['rootStoryId'] : null;
        
        $eventModel = new Event();
        $events = $eventModel->getFilteredEvents($lastEventId, $currentUserId, $rootStoryId);
        
        // Return the events as JSON
        header('Content-Type: application/json');
        echo json_encode($events);
    }

    public function getUpdates() {
        // Get parameters from request
        $lastEventId = isset($_GET['lastEventId']) ? intval($_GET['lastEventId']) : null;
        $currentUserId = $_SESSION['writer_id'] ?? null;
        $rootStoryId = isset($_GET['rootStoryId']) ? $_GET['rootStoryId'] : null;
        $filters = isset($_GET['filters']) ? json_decode($_GET['filters'], true) : [];
        $search = isset($_GET['search']) ? $_GET['search'] : '';
        $lastTreeCheck = isset($_GET['lastTreeCheck']) ? $_GET['lastTreeCheck'] : null;
        $lastGameCheck = isset($_GET['lastGameCheck']) ? $_GET['lastGameCheck'] : null;
        
        // NEW: Game subscription type (simple approach)
        $gameSubscriptionType = isset($_GET['gameSubscriptionType']) ? $_GET['gameSubscriptionType'] : 'all_games';
        
        // Log parameters for debugging
        error_log("ControllerEvent: getUpdates parameters - lastEventId=$lastEventId, currentUserId=$currentUserId, rootStoryId=$rootStoryId, search=$search");
        error_log("ControllerEvent: lastTreeCheck=$lastTreeCheck, lastGameCheck=$lastGameCheck");
        error_log("ControllerEvent: gameSubscriptionType=$gameSubscriptionType");
        
        // Use the service to get updates
        $pollingService = new DataFetchService();
        $updates = $pollingService->getUpdates(
            $lastEventId,
            $currentUserId,
            $rootStoryId,
            $filters,
            $search,
            $lastTreeCheck,
            $lastGameCheck
        );
        
        // Apply simple game filtering post-query if needed
        if ($gameSubscriptionType !== 'all_games' && !empty($updates['modifiedGames'])) {
            $updates['modifiedGames'] = $this->filterGameUpdates($updates['modifiedGames'], $gameSubscriptionType, $rootStoryId);
        }
        
        // Return the updates as JSON
        header('Content-Type: application/json');
        echo json_encode($updates);
    }
    
    /**
     * Simple post-query filtering for game updates
     */
    private function filterGameUpdates($gameUpdates, $subscriptionType, $rootStoryId) {
        switch ($subscriptionType) {
            case 'single_game':
                // Only include games that match the current rootStoryId
                return array_filter($gameUpdates, function($game) use ($rootStoryId) {
                    return isset($game['text_id']) && $game['text_id'] == $rootStoryId;
                });
            case 'none':
                return []; // No game updates
            default:
                return $gameUpdates; // 'all_games' or unknown - return all
        }
    }
}
?>