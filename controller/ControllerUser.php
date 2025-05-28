<?php

RequirePage::model('Privilege');
RequirePage::model('User');

class ControllerUser extends Controller {

    public function index(){
     }


    public function create(){
        $privilege = new Privilege;
        $select = $privilege->select();
        $notifications = $this->getNotifications();

        Twig::render('user-create.php', [
            'privilege' => $select,
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }


    public function store(){
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('user/create');
            exit();
        }
        $this->validateUser($_POST);

        //create an array for the user
        //insert, and keep the id created

        //create an array for the writer
        //send it your user-id
        //and the bio
    
        //send to the login page
        //or log in for them, and send elsewhere


        extract($_POST);



        $user = new User;
        $options =[
            'cost'=>10,
        ];

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, $options);
        $_POST['password']= $passwordHash;
        $insert = $user->insert($_POST);
        $notifications = $this->getNotifications();
        Twig::render('writer-index.php', [
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }

    public function validateUser($data){
        extract($data);
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('firstName')->value($firstName)->required()->max(45)->pattern('words');
        $val->name('lastName')->value($lastName)->required()->max(45)->pattern('words');
        $val->name('username')->value($username)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->required()->min(6)->max(20);
        $val->name('privilege_id')->value($privilege_id)->required();

        if($val->isSuccess()){
            //continue
        }else{
            $errors = $val->displayErrors();
            $privilege = new Privilege;
            $select = $privilege->select();
            $notifications = $this->getNotifications();
            Twig::render('user-create.php', [
                'privileges' => $select, 
                'errors' => $errors, 
                'data' => $_POST,
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
        };
    }
}

?>