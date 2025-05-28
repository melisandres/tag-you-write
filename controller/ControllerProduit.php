<?php

RequirePage::model('Produit');

class ControllerProduit extends Controller {

    public function index(){
     }

    public function create(){
        if(isSet($_SESSION['fingerPrint'])){
            if($_SESSION['privilege'] == 1 || $_SESSION['privilege'] == 2){
                $notifications = $this->getNotifications();
                Twig::render('produit-create.php', [
                    'notifications' => $notifications,
                    'notificationsData' => json_encode($notifications)
                ]);
                return;
            }
        } else{
            $notifications = $this->getNotifications();
            Twig::render('login.php', [
                'message'=> "You must be logged in to access this area",
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
            return;
        }
    }
    public function store(){
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('produit/create');
            exit();
        }
        extract($_POST);
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('nom')->value($nom)->max(100)->required();
        $val->name('description')->value($description)->max(65535);
        $val->name('prix')->value($prix)->pattern('float')->required();

        if($val->isSuccess()){
            //insert
            $produit = new Produit;
            $insert = $produit->insert($_POST);
            RequirePage::redirect('produit/create');
        }else{
            $errors = $val->displayErrors();
            $notifications = $this->getNotifications();
            Twig::render('produit-create.php', [
                'errors' => $errors, 
                'data'=>$_POST,
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
        };

    }
}

?>