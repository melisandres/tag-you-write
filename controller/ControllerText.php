<?php

RequirePage::model('Text');
RequirePage::model('Writer');

class ControllerText extends Controller{

    public function index(){
       
        $text = new Text;
        $select = $text->selectTexts();
      
        Twig::render('text-index.php', ['texts'=>$select]);
    }

    public function create(){
        $writer = new Writer;
        $select = $writer->select();
      
        Twig::render('text-create.php', ['writers'=>$select]);
    }

    public function store(){
        $text = new Text;
        $insert = $text->insert($_POST);
        RequirePage::redirect('text');
    }

    public function show($id){
        $text = new Text;
        $selectId = $text->selectIdText($id);
        $keywords = $text->selectKeyword($id);
        Twig::render('text-show.php', ['text' => $selectId, 'keywords'=> $keywords]);
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