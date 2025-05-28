<?php
RequirePage::model('Event');
RequirePage::model('Game');
RequirePage::model('Text');
RequirePage::model('Notification');
RequirePage::service('EventPollingService');

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
        
        // Log parameters for debugging
        error_log("ControllerEvent: getUpdates parameters - lastEventId=$lastEventId, currentUserId=$currentUserId, rootStoryId=$rootStoryId, search=$search");
        error_log("ControllerEvent: lastTreeCheck=$lastTreeCheck, lastGameCheck=$lastGameCheck");
        
        // Use the service to get updates
        $pollingService = new EventPollingService();
        $updates = $pollingService->getUpdates(
            $lastEventId,
            $currentUserId,
            $rootStoryId,
            $filters,
            $search,
            $lastTreeCheck,
            $lastGameCheck
        );
        
        // Return the updates as JSON
        header('Content-Type: application/json');
        echo json_encode($updates);
    }
}
?>