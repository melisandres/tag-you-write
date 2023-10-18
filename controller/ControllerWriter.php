<?php

RequirePage::model('Writer');
RequirePage::model('Privilege');

class ControllerWriter extends Controller{

    public function index(){
        //this is where you are blocking access... 
        CheckSession::sessionAuth();

        $writer = new Writer;
        $select = $writer->select();
        Twig::render('writer-index.php', ['writers'=>$select]);
    }

    public function create(){
        //this should not be available if you 
        //are logged in already
        if(isSet($_SESSION['fingerPrint'])){
            Twig::render('home-error.php', ['message'=> "You already seem to have an account ;P"]);
            return;
        }

        $privilege = new Privilege;
        $select = $privilege->select();
        Twig::render('writer-create.php', ['privilege' => $select]);
    }

    public function store(){
        //block access without a post... 
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('user/create');
            exit();
        }

        //this should not be available if you 
        //are logged in already
        if(isSet($_SESSION['fingerPrint'])){
            Twig::render('home-error.php', ['message'=> "You already have an account ;P"]);
            return;
        }

        $this->validateWriter($_POST);
        extract($_POST);
        unset($_POST['currentPage']);

        $writer = new Writer;
        $options =[
            'cost'=>10,
        ];

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, $options);
        $_POST['password']= $passwordHash;
        $insert = $writer->insert($_POST);
        RequirePage::redirect('writer');
    }

    public function show($id = null){
        $writer = new Writer;
        $selectId = $writer->selectId($id);

        //error page if id doesn't exist, or if it's null
        if($id == null || !$selectId){
            Twig::render('home-error.php', ['message'=> "Something went wrong. Sorry."]);
        }else{
            Twig::render('writer-show.php', ['writer' => $selectId]);
        }
    }

    public function edit(){
        //check if the writer is logged in
        CheckSession::sessionAuth();

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            //if logged in, direct to texts..
            RequirePage::redirect('writer');
            exit();
        }
        $privilege = new Privilege;
        $select = $privilege->select();
        $writer = new Writer;
        $selectId = $writer->selectId($_POST['id']);
        Twig::render('writer-edit.php', ['data' => $selectId, 'privilege' => $select]);
    }

    public function update(){
        //only available to admins 1
        //and to the person who's id matches the writer-id
        if($_SESSION['writer_id'] != $_POST['id'] && $_SESSION['privilege'] != 1 ){
            Twig::render('home-index.php');
            exit();
        }

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('writer');
            exit();
        }

        //validate
        $this->validateWriter($_POST);

        //clean the $_POST for the update
        unset($_POST['currentPage']);
        $writer = new Writer;
        $update = $writer->update($_POST);
        $id = $_POST['id'];
        RequirePage::redirect('writer/show/'.$id);
    }

    public function destroy(){
        //only available to admins 1
        //and to the person who's id matches the writer-id
        if($_SESSION['writer_id']  !== $_POST['id'] && $_SESSION['privilege'] !== 1 ){
            RequirePage::redirect('writer');
            exit();
        }

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('writer');
            exit();
        }
        
        $writer = new Writer;
        $delete = $writer->delete($_POST['id']);
        $id = $_SESSION['writer_id'];
        if($delete){
            if($_POST['id'] == $id){
                session_destroy();
                RequirePage::redirect('login');
                exit();
            }
            RequirePage::redirect('writer');
        }else{
            Twig::render('home-error.php', ['message'=> "To delete this writer, you must first delete all their texts--which will only be possible if no one has iterated on them. We would recommend you deactivate this account instead, but we have not yet implemented this functionality. Sorry."]);
        }
    }

    public function validateWriter($data, $password="default"){
        extract($data);

        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('firstName')->value($firstName)->required()->max(45)->pattern('words');
        $val->name('lastName')->value($lastName)->required()->max(45)->pattern('words');
        $val->name('email')->value($email)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->required()->min(6)->max(20);
        //TODO: put a db default value so that you don't need to put it required
        $val->name('birthday')->value($birthday)->required();

        if($val->isSuccess()){
            //continue
        }else{

            $errors = $val->displayErrors();
            $privilege = new Privilege;
            $privileges = $privilege->select();
            Twig::render($currentPage, ['privilege' => $privileges, 'errors' => $errors, 'data' => $_POST]);
            exit();
        };
    }

}

?>