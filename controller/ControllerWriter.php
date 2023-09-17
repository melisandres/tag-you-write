<?php

RequirePage::model('Writer');

class ControllerWriter extends Controller{

    public function index(){
       
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
        //return $insert;
        RequirePage::redirect('writer');
    }

    public function show($id){
        $writer = new Writer;
        $selectId = $writer->selectId($id);
       //print_r($selectId);
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
        //Twig::render('client-show.php', ['writer'=> $update]);
        RequirePage::redirect('writer');
    }

}

?>