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
        if($_SESSION['fingerPrint']){
            Twig::render('home-error.php', ['message'=> "You already seem to have an account ;P"]);
            return;
        }
        Twig::render('writer-create.php');
    }

    public function store(){
        //block access without a post... 
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('user/create');
            exit();
        }

        //this should not be available if you 
        //are logged in already
        if($_SESSION['fingerPrint']){
            Twig::render('home-error.php', ['message'=> "You already have an account ;P"]);
            return;
        }

        $this->validateWriter($_POST);
        extract($_POST);

        $writer = new Writer;
        $options =[
            'cost'=>10,
        ];

        $passwordHash = password_hash($password, PASSWORD_BCRYPT, $options);
        $_POST['password']= $passwordHash;
        $insert = $writer->insert($_POST);
        //Twig::render('writer-index.php');
        RequirePage::redirect('writer');
    }

    public function show($id = null){
        //TO-DO: you want all the information available
        //to admins. writers should only have access to bios...
        //and eventually to associated texts. 

        $writer = new Writer;
        $selectId = $writer->selectId($id);

        //here, you check if the id doesn't exist, or if it's null
        if($id == null || !$selectId){
            Twig::render('home-error.php', ['message'=> "Something went wrong. Sorry."]);
        }else{
            Twig::render('writer-show.php', ['writer' => $selectId]);
        }
    }

    public function edit($id){
        //TO-DO: you want this only available to admins
        //and to the person who's id matches the writer-id
        //I don't think I should be sending the id to be edited
        //as a get...

        $writer = new Writer;
        $selectId = $writer->selectId($id);
        Twig::render('writer-edit.php', ['writer' => $selectId]);
    }

    public function update(){
        //TO-DO: you want this only available to admins
        //and to the person who's id matches the writer-id

        $writer = new Writer;
        $update = $writer->update($_POST);
        $id = $_POST['id'];
        RequirePage::redirect('writer/show/'.$id);
    }

    public function destroy(){
        //TO-DO: you want this only available to admins
        //and to the person who's id matches the writer-id
        
        $writer = new Writer;
        $delete = $writer->delete($_POST['id']);
        if($delete){
            RequirePage::redirect('writer');
        }else{
            Twig::render('home-error.php', ['message'=> "To delete this writer, you must first delete all their texts--which will only be possible if no one has iterated on them. We would recommend you deactivate this account instead, but we have not yet implemented this functionality. Sorry."]);
        }
    }

    public function validateWriter($data){
        extract($data);
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('firstName')->value($firstName)->required()->max(45)->pattern('words');
        $val->name('lastName')->value($lastName)->required()->max(45)->pattern('words');
        $val->name('username')->value($email)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->required()->min(6)->max(20);

        if($val->isSuccess()){
            //continue
        }else{
            $errors = $val->displayErrors();
            $privilege = new Privilege;
            $select = $privilege->select();
            Twig::render('writer-create.php', ['privileges' => $select, 'errors' => $errors, 'data' => $_POST]);
        };
    }

}

?>