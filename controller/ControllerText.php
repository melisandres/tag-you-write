<?php

RequirePage::model('Text');
RequirePage::model('Writer');
RequirePage::model('Keyword');
RequirePage::model('TextHasKeyword');
RequirePage::model('Prep');

class ControllerText extends Controller{

    //show the page with all the texts
    public function index(){
        //TO-DO: available to all
        //TO-DO: show the texts writen by the person logged-in
        //differently--if a writer is logged in. 
        $text = new Text;
        $select = $text->selectTexts();
        Twig::render('text-index.php', ['texts'=>$select]);
    }


    //show the page from which someone can write a new text
    //it will be important to get the writer id here, so 
    //they do not have to select their name, but have it 
    //already entered.
    public function create(){
        //TO-DO: available only to writers
        //TO-DO: take away select, and replace it with 
        //the writer who is logged in
        $writer = new Writer;
        $select = $writer->select();
        Twig::render('text-create.php', ['writers'=>$select]);
    }


    //this is where we save the text entered, and its 
    //associated keywords, etc. 
    public function store(){
        $text = new Text;
        $keyWord = new Keyword;
        
        //validate the $_POST
        $this->validateText($_POST);

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
        $textHasKeyword = new TextHasKeyword;

        //each keyword needs to be treated:
        foreach ($keywords as $word) {
            //cleaned of spaces
            $assArr = ['word' => trim($word)];

            //inserted into the keywords table, (if it isn't already there)
            $testId = $keyWord->insert($assArr, true);

            //we need that keyword's id: but we must remember that it comes as an array
            $keywordIdFromInsert = $keyWord->selectWordId($assArr);

            //with that id, we can build an associative array to send to text_has_keyword
            $textHasKeywordArray = ['text_id' => $textIdFromInsert, 'keyword_id' => $keywordIdFromInsert['id']];

            //now we can insert this keyword into text_has_keyword
            $textHasKeyword->insert( $textHasKeywordArray);
        }

        RequirePage::redirect('text');
    }


    //this will show a specific text, based on the
    //text's id: options available from this page are
    //edit (if this is your text), iterate (if this is
    //another person's text OR if it has already been 
    //iterated on), and delete(if this is your text 
    //and it has never been iterated on)
    public function show($id){
        //TO-DO: This will also be altered by 
        //whether or not the user is logged in--buttons 
        //should not show if the user is not logged in
        $text = new Text;
        $selectId = $text->selectIdText($id);
        $keywords = $text->selectKeyword($id);
        $isParent = false;

        //first, lets check if the text to be updated
        //has any children... if it has children, it should
        //not be possible to update it. 
        $select = $text->selectId($id, 'parent_id');
        if($select){
            $isParent = true;
        }

        Twig::render('text-show.php', ['text' => $selectId, 'keywords'=> $keywords, 'isParent' => $isParent]);
    }



    //edit creates the page from which the writer can edit a text
    public function edit(){
        //TO-DO: this should not be available if the user is 
        //not logged in--AND, if the user is the author of 
        //the current text

        $text = new Text;
        $selectId = $text->selectIdText($_POST['id']);
        $keywords = $text->selectKeyword($_POST['id']);

        //first, lets check if the text to be updated
        //has any children... if it has children, it should
        //not be possible to update it. 
        $select = $text->selectId($_POST['id'], 'parent_id');
        if($select){
            Twig::render('home-error.php', ['message'=> "Another writer has iterated on this text, and therefore it can no longer be deleted. Sorry."]);
            return;
        }

        //prepare the keywords
        $keywordString = "";
        foreach ($keywords as $key => $value) {
            $keywordString .= $value.", ";
        }
        $cleanKeywordString= trim($keywordString, ", ");

        //create a data array that will send the values
        //to the page legibly...
        $data = $selectId;
        $data["keywords"] = $cleanKeywordString;
        $data["lastKeywords"] = $cleanKeywordString;

        //send it to the form
        Twig::render('text-edit.php', ['data' => $data]);
    }


    //update send an edited text to the database
    public function update(){
        $text = new Text;
        $writer = new Writer;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;
        $prep = new Prep;

/*         var_dump($_POST);
        die; */
        //validate the $_POST
        $this->validateText($_POST);

        //get the new keywords from POST, copy, and remove
        $keywords = $_POST['keywords'];
        unset($_POST['keywords']);

        //get the previous keywords from POST, also remove
        $lastKeywords = $_POST['lastKeywords'];
        unset($_POST['lastKeywords']); 

        //send what's left of the POST (text info) to CRUD
        $update = $text->update($_POST);

        //using class Prep to prepare keywords arrays... 
        //words come in as strings, come out a clean arrays
        $cleanedKeywords = $prep->keywords($keywords);
        $cleanedLastKeywords = $prep->keywords($lastKeywords);
        $wordsToCheck = array_diff($cleanedLastKeywords, $cleanedKeywords);

        //each keyword needs to be treated:
        foreach ($cleanedKeywords as $word) {
            //they have been cleaned of spaces in Prep
            //$assArr = ['word' => trim($word)];
            $assArr = ['word' => $word];

            //inserted into the keywords table, (if it isn't already there)
            $keyword->insert($assArr, true);

            //we need that keyword's id: but we must remember that it comes as an array
            $keywordIdFromInsert = $keyword->selectWordId($assArr);

            //with that id, we can build an associative array to send to text_has_keyword
            $textHasKeywordArray = ['text_id' => $_POST['id'], 'keyword_id' => $keywordIdFromInsert['id']];

            //now we can insert this keyword into text_has_keyword
            $textHasKeyword->insertTextHasKeyWord($textHasKeywordArray);
        }

        //earlier, previous keywords was compared to current keywords 
        //the difference was placed in $wordsToCheck
        if(isset($wordsToCheck) && !empty($wordsToCheck)){
            foreach($wordsToCheck as $word){
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
    }


    //deletes a text from the database
    public function delete(){
        $id = $_POST['id']; 
        $text = new Text;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;

        //first check to see if this text has any children. 
        //we should not be able to delete it if it has children
        $select = $text->selectId($id, 'parent_id');
        if($select){
            Twig::render('home-error.php', ['message'=> "Another writer has iterated on this text, and therefore it can no longer be deleted. Sorry."]);
            return;
        }

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
            Twig::render('home-error.php', ['message'=> "We were not able to delete. Sorry."]);
        }else{
            RequirePage::redirect('text');
        }   
    }



    //like show and edit, it presents a filled-out form
    //with the text to be iterated, but with a "writer select" field
    public function iterate(){
        //TO-DO: now that there is a log in, you may want to 
        //eliminate this. Just make sure there's nothing needed
        //here that isn't in what you would replace it with... edit?
        //and then... you'll compare writer-iterate with writer-edit. 
        //if you can combine them with a few variables... all the better.
        //they both send their $_POST to store...
        $text = new Text;
        $writer = new Writer;
        //first prepare the list of writers for the select field
        $selectWriter = $writer->select();
        //recuperate the text, and the keywords associated to it
        $selectId = $text->selectIdText($_POST['id']);
        $keywords = $text->selectKeyword($_POST['id']);

        //prepare the keywords string
        $keywordString = "";
        foreach ($keywords as $key => $value) {
            $keywordString .= $value.", ";
        }
        $cleanKeywordString= trim($keywordString, ", ");

        //create a data array that will send the values
        //to the page legibly...
        $data = $selectId;
        $data["keywords"] = $cleanKeywordString;

        //send it all to the form
        Twig::render('text-iterate.php', ['data' => $data]);
    }



    public function validateText($data){
        RequirePage::library('Validation');
        $val = new Validation;

        //$val->name('date')->value($data["date"])->pattern('date_ymd');
        $val->name('writing')->value($data["writing"])->pattern('words')->required()->max(65000);
        $val->name('title')->value($data["title"])->max(75);
        $val->name('keywords')->value($data["keywords"])->pattern('keywords')->max(75);


        if($val->isSuccess()){
            //if this is successful, I just want to continue the code
            //so... I need not do anything
        }else{
            $errors = $val->displayErrors();
            //send it to the form
            Twig::render($data["currentPage"], ['data' => $data, 'errors' => $errors]);
            exit();
        };
    }
}

?>