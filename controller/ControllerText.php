<?php

RequirePage::model('Text');
RequirePage::model('Writer');
RequirePage::model('Keyword');
RequirePage::model('TextHasKeyword');
RequirePage::model('Prep');

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
        $keyWord = new Keyword;

        //get the keywords from POST
        $keywords = $_POST['keywords'];

        //remove the keywords from POST
        unset($_POST['keywords']);

        //send what's left of the POST (text info) to CRUD
        $textIdFromInsert = $text->insert($_POST);


        //prepare keywords array... to send to CRUD
        //$keywords = explode(',', $keywords);
        $prep = new Prep;
        $keywords= $prep->keywords($keywords);

        //each keyword needs to be treated:
        foreach ($keywords as $word) {
            //cleaned of spaces
            $assArr = ['word' => trim($word)];
            //inserted into the keywords table, (if it isn't already there)
            $testId = $keyWord->insert($assArr, true);
            //why is $testIds value zero?

            //we need that keyword's id: but we must remember that it comes as an array

            $keywordIdFromInsert = $keyWord->selectWordId($assArr);

            $textHasKeyword = new TextHasKeyword;
            //with that id, we can build an associative array to send to text_has_keyword
            $textHasKeywordArray = ['text_id' => $textIdFromInsert, 'keyword_id' => $keywordIdFromInsert['id']];
            //now we can insert this keyword into text_has_keyword
            $textHasKeyword->insert( $textHasKeywordArray);
        }

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