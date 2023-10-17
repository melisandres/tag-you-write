<?php
RequirePage::model('Writer');

class ControllerLogin extends Controller {

    public function index(){
        Twig::render('login.php');
     }

    public function auth(){
        //this is to make sure there's a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('writer/create');
            exit();
        }


        extract($_POST);
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('email')->value($email)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->min(6)->max(20);



        if($val->isSuccess()){
            $writer = new Writer;
            if($writer->checkWriter($email, $password)){
                RequirePage::redirect('text');
            }else{
                Twig::render('login.php', ["errors"=>"username and/or password don't match", "data"=>$_POST]);
            }

            //RequirePage::redirect('user/create');
        }else{
            $errors = $val->displayErrors();
            Twig::render('login.php', ['errors' => $errors, 'data'=>$_POST]);
        };
    }

    public function logout(){
        session_destroy();
        RequirePage::redirect('login');
    }
}

?>