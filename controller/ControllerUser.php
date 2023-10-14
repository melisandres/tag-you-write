<?php

RequirePage::model('Privilege');
RequirePage::model('User');

class ControllerUser extends Controller {

    public function index(){
     }

    public function create(){
        $privilege = new Privilege;
        $select = $privilege->select();

        Twig::render('user-create.php', ['privilege' => $select]);
    }
    public function store(){
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('user/create');
            exit();
        }

        extract($_POST);
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('name')->value($name)->max(45)->min(1)->pattern('words');
        $val->name('username')->value($username)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->min(6)->max(20);
        $val->name('privilege_id')->value($privilege_id)->required();


        if($val->isSuccess()){
            //insert
            $user = new User;
            $options =[
                'cost'=>10,
            ];
            $passwordHash = password_hash($password, PASSWORD_BCRYPT, $options);
            $_POST['password']= $passwordHash;
            $insert = $user->insert($_POST);
            Twig::render('writer-index.php');
        }else{
            $errors = $val->displayErrors();
            $privilege = new Privilege;
            $select = $privilege->$select();
            Twig::render('user-create.php', ['privileges'=>$select, 'errors' => $errors, 'data'=>$_POST]);
        };

    }
}

?>