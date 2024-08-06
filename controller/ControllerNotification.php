<?php

RequirePage::model('Game');
RequirePage::model('Notification');

class ControllerNotification extends Controller {
    // Get all the notifications
    public function index(){

    }

    // At the moment I am creating notifications from the game controler when a game ends. in the model notification->createNotification()
    public function create($playerId, $gameId, $notificationType){
        $data =[
            'writer_id' => $playerId,
            'game_id' => $gameId,
            'notification_type' => $notificationType
        ];

        $notification = new Notification;
        $notification->insert($data);
    }

    // This can be called with short polling while working on a text, to check if the game was won. Called by the notifications manager... I need to handle the user experience, so that writing for a now-closed game isn't too jolting an experience, and does not trigger any errors. 

    // TODO: we need this to check if the game curently worked on has ended.
    public function getGameEnd($gameId) {
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }
        $notification = new Notification;
        $writer_id = $_SESSION['writer_id'];
        $response = $notification->getUnseenNotifications($writer_id, $gameId);

        return json_encode($response);
    }

    // Mark a notification as seen
    // TODO: must be tested
    public function markAsSeen($notificationId) {
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }
        $data = [
                'id' => $notificationId,
                'is_seen' => TRUE
                ];
        $notification = new Notification;
        $notification->update($data);
        return json_encode(['response' => 'ok']);

    }

    // It should be possible to delete a notification
    public function delete($notificationId){

    }

    // making as seen... is there another way to update a notification? seems unlikely... I guess maybe not. 
    public function update(){

    }
}
?>

