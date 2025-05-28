<?php

class ControllerHome extends Controller {

    public function index(){
        $notifications = $this->getNotifications();

        Twig::render('home-index.php', [
            'name' => 'greeting',
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
     }

    public function error(){
        $notifications = $this->getNotifications();
        Twig::render('home-error.php', [
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }
}

?>