<?php
RequirePage::model('Event');

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
}
?>