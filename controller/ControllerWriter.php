<?php

RequirePage::model('Writer');

class ControllerWriter extends Controller{

    public function index(){
        CheckSession::sessionAuth();
        $writer = new Writer;
        $select = $writer->select();
        Twig::render('writer-index.php', ['writers'=>$select]);
    }

    public function create(){
        Twig::render('writer-create.php');
    }

    public function store(){
        $writer = new Writer;
        $insert = $writer->insert($_POST);
        RequirePage::redirect('writer');
    }

    public function show($id){
        $writer = new Writer;
        $selectId = $writer->selectId($id);
        Twig::render('writer-show.php', ['writer' => $selectId]);
    }

    public function edit($id){
        $writer = new Writer;
        $selectId = $writer->selectId($id);
        Twig::render('writer-edit.php', ['writer' => $selectId]);
    }

    public function update(){
        $writer = new Writer;
        $update = $writer->update($_POST);
        $id = $_POST['id'];
        RequirePage::redirect('writer/show/'.$id);
    }

    public function destroy(){
        $writer = new Writer;
        $delete = $writer->delete($_POST['id']);
        if($delete){
            RequirePage::redirect('writer');
        }else{
            Twig::render('home-error.php', ['message'=> "To delete this writer, you must first delete all their texts--which will only be possible if no one has iterated on them. We would recommend you deactivate this account instead, but we have not yet implemented this functionality. Sorry."]);
        }
    }

}

?>