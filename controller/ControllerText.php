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
            //why is $testIds value zero? because you haven't always added keywords... or you haven't always added new keywords

            //we need that keyword's id: but we must remember that it comes as an array

            $keywordIdFromInsert = $keyWord->selectWordId($assArr);

            $textHasKeyword = new TextHasKeyword;
            //do I need to create a new one of these everytime we loop through? 

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






    //show and edit are almost exactly the same. 
    public function edit(){
        $text = new Text;
        $selectId = $text->selectIdText($_POST['id']);
        $keywords = $text->selectKeyword($_POST['id']);

        //prepare the keywords
        $keywordString = "";
        foreach ($keywords as $key => $value) {
            $keywordString .= $value.", ";
        }
        $cleanKeywordString= trim($keywordString, ", ");

        //send it to the form
        Twig::render('text-edit.php', ['text' => $selectId, 'keywords'=> $cleanKeywordString]);
    }






    public function update(){
        $text = new Text;
        $writer = new Writer;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;
        $prep = new Prep;

        //FROM TEXT STORE:
        //get the new keywords from POST, copy, and remove
        $keywords = $_POST['keywords'];
        unset($_POST['keywords']);

        //NEW FOR THIS PAGE:
        //get the previous keywords from POST, also remove
        $lastKeywords = $_POST['lastKeywords'];
        unset($_POST['lastKeywords']); 


        //SIMILAR TO TEXT STORE, BUT WITH UPDATE:
        //send what's left of the POST (text info) to CRUD
        $update = $text->update($_POST);


        //using class Prep to prepare keywords arrays... 
        //words come in as strings, come out a clean arrays
        $cleanedKeywords = $prep->keywords($keywords);
        $cleanedLastKeywords = $prep->keywords($lastKeywords);
        $wordsToCheck = array_diff($cleanedLastKeywords, $cleanedKeywords);
/* 
        echo "cleanedKeywords<br>"; 
        var_dump($cleanedKeywords);
        echo "<br>cleanedLastKeywords<br>"; 
        var_dump($cleanedLastKeywords);
        echo "<br>wordsToCheck<br>"; 
        var_dump($wordsToCheck);

        echo "<br> we will now loop through the cleanedKeywords, so we should see htem all printed beneath:<br>"; */



        //FROM TEXT STORE-- except, we already did the trim
        //each keyword needs to be treated:
        foreach ($cleanedKeywords as $word) {
            //cleaned of spaces (really shouldn't have to clean again?!)
            //$assArr = ['word' => trim($word)];
            $assArr = ['word' => $word];

            //inserted into the keywords table, (if it isn't already there)
            $keyword->insert($assArr, true);

            //we need that keyword's id: but we must remember that it comes as an array
            $keywordIdFromInsert = $keyword->selectWordId($assArr);

            //with that id, we can build an associative array to send to text_has_keyword
            $textHasKeywordArray = ['text_id' => $_POST['id'], 'keyword_id' => $keywordIdFromInsert['id']];

            //now we can insert this keyword into text_has_keyword
            echo "<br>textHasKeyword insert here... and loop again<br>";
            $textHasKeyword->insertTextHasKeyWord($textHasKeywordArray);
        }

        //earlier, you compared previous keywords to current keywords, and 
        //you placed the difference in $wordsToCheck
        if(isset($wordsToCheck) && !empty($wordsToCheck)){
            echo "<br>now we will enter into the words to check loop:<br>";
            var_dump($wordsToCheck);

            foreach($wordsToCheck as $word){
                echo "<br>we will delete textHasKeyWord for: ".$word."<br>";

                //delete text_has_id lines for keywords no longer used
                $textHasKeyword->deleteTextHasKeyword($word, $_POST['id']);

                //get an associative array with the whole keyword line
                $keywordInfos = $keyword->selectId($word, 'word');

                //with the id, check if the key is being used elsewhere, if not, delete from keywords
                $keyword->deleteUnusedKeywords($keywordInfos['id']);
            }
            RequirePage::redirect('text');
        }else{
            RequirePage::redirect('text');
        }

        //Twig::render('client-show.php', ['writer'=> $update]);
    }




    public function delete(){
        $id = $_POST['id']; 
        $text = new Text;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;

        //$keyWordIds is given an associative array where all keys are "keyword_id"
        //it is empty if there are no keywords in the given text.
        $keyWordIds = $keyword->selectKeywordIds($id);

        //check if there are any keywords... and if so
        if(isset($keyWordIds)){
            //delete ALL text_has_keyword entries
            $textHasKeyword->delete($id);

            //delete the keywords, if they aren't being used by other text_has_keyword
            foreach ($keyWordIds as $key => $value) {
                $keyword->deleteUnusedKeywords($value["keyword_id"]);
            }
        }
        //delete the text entry
        $response = $text->delete($id);
        if(!$response){
            RequirePage::redirect('home/error');
        }else{
            RequirePage::redirect('text');
        }
    }






    public function iterate(){
        $text = new Text;
        $writer = new Writer;
        $selectWriter = $writer->select();
        $selectId = $text->selectIdText($_POST['id']);
        $keywords = $text->selectKeyword($_POST['id']);

        //prepare the keywords
        $keywordString = "";
        foreach ($keywords as $key => $value) {
            $keywordString .= $value.", ";
        }
        $cleanKeywordString= trim($keywordString, ", ");

        //send it to the form
        Twig::render('text-iterate.php', ['text' => $selectId, 'keywords'=> $cleanKeywordString, 'writers' => $selectWriter]);

    }

}

?>