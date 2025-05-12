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
}
?>