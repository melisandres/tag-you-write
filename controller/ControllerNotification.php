<?php

RequirePage::model('Game');
RequirePage::model('Notification');

class ControllerNotification extends Controller {
    // Get all the notifications
    public function index(){

    }

    // Create a notification for a player
    public function create($playerId, $gameId, $notificationType, $message){
        $data =[
            'writer_id' => $playerId,
            'game_id' => $gameId,
            'notification_type' => $notificationType,
            'message' => $message
        ];

        $notification = new Notification;
        return $notification->insert($data);
    }

    // Check if a game has ended
    public function getGameEnd($gameId) {
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }
        
        $notification = new Notification;
        $writer_id = $_SESSION['writer_id'];
        $response = $notification->getUnseenNotifications($writer_id, $gameId);
        return json_encode($response);
    }

    // Get all notifications for the current user
    public function getNewNotifications($lastCheck = null) {
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }
        
        $notification = new Notification;
        
        // Get all unseen notifications for the user
        if ($lastCheck !== null && $lastCheck !== '') {
            // Convert milliseconds to seconds for date() function
            $timestamp = (int)($lastCheck / 1000);
            
            // Convert to server timezone format
            $formattedDate = date('Y-m-d H:i:s', $timestamp);
            
            $response = $notification->getNewNotifications($formattedDate);
        } else {
            $response = $notification->getNewNotifications(null);
        }
        
        return json_encode($response);
    }

    // Mark a notification as seen
    public function markAsSeen($notificationId) {
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }
        
        $data = [
            'id' => $notificationId,
            'seen_at' => date('Y-m-d H:i:s')
        ];
        
        $notification = new Notification;
        $result = $notification->update($data);
        
        return json_encode(['response' => 'ok']);
    }

    // Mark a notification as read
    public function markAsRead($notificationId) {
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }

        $data = [
            'id' => $notificationId,
            'read_at' => date('Y-m-d H:i:s')
        ];
        
        $notification = new Notification;
        $result = $notification->update($data);
        
        return json_encode(['response' => 'ok']);
    }

    // Mark a notification as deleted (soft delete)
    public function markAsDeleted($notificationId) {
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }

        $data = [
            'id' => $notificationId,
            'deleted_at' => date('Y-m-d H:i:s')
        ];
        
        $notification = new Notification;
        $result = $notification->update($data);
        
        return json_encode(['response' => 'ok']);
    }

    // It should be possible to delete a notification
    public function delete($notificationId){
        if(!isset($_SESSION['writer_id'])){
            return json_encode(['status' => 'notLoggedin']);
        }

        $data = [
            'id' => $notificationId,
            'deleted_at' => date('Y-m-d H:i:s')
        ];
        
        $notification = new Notification;
        $result = $notification->update($data);
        
        return json_encode(['response' => 'ok']);
    }

    // making as seen... is there another way to update a notification? seems unlikely... I guess maybe not. 
    public function update(){

    }
}
?>

