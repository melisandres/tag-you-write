<?php

RequirePage::model('Text');
RequirePage::model('Writer');
RequirePage::model('Keyword');
RequirePage::model('TextHasKeyword');
RequirePage::model('Prep');
RequirePage::model('Game');
RequirePage::model('GameHasPlayer');
RequirePage::model('TextStatus');
RequirePage::controller('ControllerGame');

class ControllerText extends Controller{

    //show the page with all the texts
    public function index(){
        // Getting the games
        $game = new Game;
        $allGames = $game->getGames();

        // Send the JSON data to the front end
        Twig::render('text-index.php', ['texts' => $allGames]);
    }

    private function getRootParent($textId){
        $text = new Text;
        $select = $text->selectTexts();
        $currentText = [];

        foreach ($select as $element){
            if ($element['id'] === $textId) {
              $currentText = $element;
            };
        }
    }

/*     private function hasContributed($textId, $hierarchy, $currentUserId) {
        // Helper function to recursively check contributions
         $stack = [$this->findTextById($textId, $hierarchy)];
        while (!empty($stack)) {
            $node = array_pop($stack);
            if ($node['writer_id'] == $currentUserId) {
                return true;
            }
            if (!empty($node['children'])) {
                foreach ($node['children'] as $child) {
                    $stack[] = $child;
                }
            }
        }
        return false; 
    } */

    private function findTextById($textId, $hierarchy) {
        foreach ($hierarchy as $node) {
            if ($node['id'] == $textId) {
                return $node;
            }
            if (!empty($node['children'])) {
                $result = $this->findTextById($textId, $node['children']);
                if ($result) {
                    return $result;
                }
            }
        }
        return null;
    }

    // If you want ALL the data in a hierarchy, $targettedIdType will be 'parent_id', no third arg.
    // If you want just one tree, $targettedIdType will be 'id', third arg will be the root id
    private function buildHierarchy($array, $targettedIdType, $targetId = null) {
        $hierarchy = [];
    
        foreach ($array as $element) {
            if ($element[$targettedIdType] == $targetId) {
                $element['children'] = $this->buildHierarchy($array, 'parent_id', $element['id']);
                $hierarchy[] = $element;
            }
        }
        return $hierarchy;
    }

    // An end point from which you can receive a single tree from the db
    public function getTree($rootId = null){
        $text = new Text;
        // Get the current user Id
        $currentUserId = $_SESSION['writer_id'] ?? null;
        $select = $text->selectTexts($currentUserId);

        // Get the requested tree
        $tree = $this->buildHierarchy($select, 'id', $rootId);

        // Add permissions to each node iteratively
        $this->addPermissions($tree[0], $currentUserId, $tree);

        // Convert the hierarchical array to JSON format
        $jsonData = json_encode($tree);

        return $jsonData;
    }

    // An end point from which to get the data for just one node
    public function getStoryNode($textId){
        // The model
        $text = new Text;
        // The user
        $currentUserId = $_SESSION['writer_id'] ?? null;
        // The query with an extra argument for the textId
        $select = $text->selectTexts($currentUserId, $textId);
        // Add permissions recursively, but for only one line... no not
        $this->addPermissions($select, $currentUserId, $select);
        // Encode it
        $jsonData = json_encode($select);
        // Send it
        return $jsonData;
    }

    // Recursive function to add permissions to each node
    private function addPermissions(&$node, $currentUserId, $hierarchy /*, $hasContributed */) {
        // Set 1s and 0s to trues and falses
        $node['hasContributed'] = $node['hasContributed'] == 1 ? true : false;
        $node['isWinner'] = $node['isWinner'] == 1 ? true : false;
        $node['openForChanges'] = $node['openForChanges'] == 1 ? true : false;

        // Create some vars to make the permissions clearer
        $isAParentText = !empty($node['children']);
        $gameOpen = $node['openForChanges'];
        $hasContributed = $node['hasContributed'];
        $isDraft = $node['text_status'] == "draft" ? true : false;
        $nodeWriter = $node['writer_id'];
        $isMyText = $currentUserId === $nodeWriter;
        $isLoggedIn = $currentUserId !== null;
        
        // TODO: You can reuse this logic in every method, to ensure that we enforce these permissions.

        //TODO: you might want to treat "can edit" differently than "can add note"

        $node['permissions'] = [
            'canEdit' => $isLoggedIn && $isMyText && $gameOpen,
            'canDelete' => !$isAParentText && $isMyText && $gameOpen && $isDraft,
            'canIterate' => $isLoggedIn && !$isMyText && $gameOpen && !$isDraft,
            'isMyText' => $isMyText,
            'canVote' => !$isMyText && $hasContributed && $gameOpen
        ];

        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->addPermissions($child, $currentUserId, $hierarchy, /* $hasContributed */);
            }
        }
    }

    //show the page from which someone can write a new text
    //it will be important to get the writer id here, so 
    //they do not have to select their name, but have it 
    //already entered.
    public function create(){
        //available only to those logged in (ie: writers)
        CheckSession::sessionAuth();

        // TODO: it is a good idea to have access to all the writers... for when writers can choose who to play with.
        // a select, however, may not always work. eventually, you'll want to combine with a search. 
        $writer = new Writer;
        $select = $writer->select();
        Twig::render('text-create.php', ['writers'=>$select]);
    }

    //this is where we save the text entered, and its 
    //associated keywords, etc. be it a new text or an iteration
    //IF its a new text, we create a new game.
    public function store(){
        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            // Just to make uniform, check if the writer is logged in
            CheckSession::sessionAuth();
            // TODO: this seems off. You can rework the logic later.
            // If logged in, direct to texts..
            RequirePage::redirect('text');
            exit();
        }

        $text = new Text;
        $keyWord = new Keyword;
        $textStatus = new TextStatus;

        // Check if this is a root text
        $isRootText = !isset($_POST['game_id']) && !isset($_POST['parent_id']);
        
        // Validate the $_POST 
        $this->validateText($_POST, $isRootText);

        //TODO: i wonder if this is the best way to check... as 
        //a person could toy with the hidden fields and mess with the 
        //database but if they add both a parent_id and a game_id... 
        //then they are NOT saving a new game...

        // Create a new game via the ControllerGame 
        // IF we receive neither a game_id NOR a parent_id
         if ($isRootText) {
            $gameController = new ControllerGame;
            $gameId = $gameController->createGame($_POST);

            if ($gameId === false) {
                Twig::render($_POST["currentPage"], ['data' => $_POST, 'errors' => 'Failed to create game']);
                exit();
            }

            $_POST['game_id'] = $gameId;
        } 

        //get the keywords from POST
        $keywords = $_POST['keywords'];

        //remove the keywords and redirectPage reference from POST
        unset($_POST['keywords']);
        unset($_POST['currentPage']);

        //remove the other extra values from POST so that you can send off your POST to insert
        unset($_POST['firstName']);
        unset($_POST['lastName']);
        unset($_POST['previous_title']);
        unset($_POST['prompt']);

        // you need the text-status-id in order to save the text
        $status = $_POST['text_status'];
        unset($_POST['text_status']);
        $_POST['status_id'] = $textStatus->selectStatus($status);

  

        // send what's left of the POST (text info) to CRUD
        $textIdFromInsert = $text->insert($_POST);

        //send the writer_id and the game_id to game_has_player
        $gameHasPlayer = new GameHasPlayer;
        $gameHasPlayerData = [
            'player_id' => $_POST['writer_id'],
            'game_id' => $_POST['game_id'],
            'active' => 1
        ];
        $gameHasPlayer->insert($gameHasPlayerData);

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
            $textHasKeyword->insert($textHasKeywordArray);
        }

        RequirePage::redirect('text');
    }


    //this will show a specific text, based on the
    //text's id: options available from this page are
    //edit (if this is your text), iterate (if this is
    //another person's text OR if it has already been 
    //iterated on), and delete(if this is your text 
    //and it has never been iterated on)
    public function show($id = null){
        //TODO: if id = null or if it doesn't exist
        //in the database, you need to... 
        $text = new Text;
        $selectId = $text->selectIdText($id);

        //here, you check if the id doesn't exist, or if it's null
        if($id == null || !$selectId){
            Twig::render('home-error.php', ['message'=> "Something went wrong. Sorry."]);
            exit;
        }

        $keywords = $text->selectKeyword($id);
        $isParent = false;

        //check if the text to be updated
        //has any children... if it has children, its buttons
        //should be displayed differently... because it can no 
        //longer be updated
        $select = $text->selectId($id, 'parent_id');
        if($select){
            $isParent = true;
        }

        Twig::render('text-show.php', ['text' => $selectId, 'keywords'=> $keywords, 'isParent' => $isParent]);
    }


    // edit creates the page from which the writer can edit a text
    // it checks if the text being edited is a draft or published
    public function edit(){
        //no access if you are not logged in
        CheckSession::sessionAuth();

        $text = new Text;
        $textStatus = new TextStatus;
        $selectId = $text->selectIdText($_POST['id']);
        $keywords = $text->selectKeyword($_POST['id']);


        //block the page if the writer logged in is not this text's writer
        if($selectId['writer_id'] != $_SESSION['writer_id']){
            Twig::render('home-error.php', ['message'=> "You can't edit another writer's text. Try iterating instead."]);
            return;
        }

        $statusId = $selectId['status_id'];
        $statusData = $textStatus->selectId($statusId);
        $status = $statusData['status'];
        //die(var_dump($selectId));

        //in prior logic, the user could not edit their text if it had children... but
        //I'm changing the logic of editing, for now... so that a user can ALWAYS edit--
        //but in editing, ALL a user can do is leave a note, or edit the note. 

/*         $select = $text->selectId($_POST['id'], 'parent_id');
        if($select){
            Twig::render('home-error.php', ['message'=> "Another writer has iterated on this text, and therefore it can no longer be deleted. Sorry."]);
            return;
        } */

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

        if ($status == 'published') {
            // Render the view for adding notes to published texts
            Twig::render('text-note-edit.php', ['data' => $selectId, 'keywords' => $keywords]);
        }else{
            //send it to the form
            Twig::render('text-draft-edit.php', ['data' => $data]);
        }
    }


    //update send an edited text to the database
    public function update(){
        //TODO: you need to check if this is an update on a published
        //or on a draft... and accept values accordingly. And redirect accordingly.

        //no access if you are not logged in
        CheckSession::sessionAuth();

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('text');
            exit();
        }

        //block the functionality if the writer 
        //logged in is not this text's writer
        if($_POST['writer_id'] != $_SESSION['writer_id']){
            Twig::render('home-error.php', ['message'=> "You can't edit another writer's text. Try iterating instead."]);
            return;
        }

        // I'm taking out the parent_id check... because I want "notes"
        // to be able to be published. 
         /*
        //check if the text is a parent, it should not be
        //able to be be updated
        $select = $text->selectId($_POST["id"], 'parent_id');
        if($select){
            RequirePage::redirect('text');
            exit();
        } */

        $text = new Text;
        $writer = new Writer;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;
        $prep = new Prep;

        //validate the $_POST
        $currentPage = $_POST['currentPage'];

        // you need the text-status-id in order to save the text
        $textStatus = new TextStatus;
        $status = $_POST['text_status'];
        unset($_POST['text_status']);
        $_POST['status_id'] = $textStatus->selectStatus($status);

        if($currentPage == "text-note-edit.php"){
            $this->validateNote($_POST);
            //but for now, you are only allowing a user to edit the NOTE:
            $updateNote['note'] = $_POST['note'];
            $updateNote['note_date'] = $_POST['note_date'];
            $updateNote['id'] = $_POST['id'];
            $update = $text->update($updateNote);

            RequirePage::redirect('text');
            exit;
        }


        //although I am not keeping the functionality of editing keywords,
        //I'm keeping the code here, because I remember it was a little 
        //complicated to work out, and ultimately, editing keywords is fine--
        //I could decide to make the functionality available again.

        //get the new keywords from POST, copy, and remove
        $keywords = $_POST['keywords'];
        unset($_POST['keywords']);
        unset($_POST['currentPage']);

        //get the previous keywords from POST, also remove
        $lastKeywords = $_POST['lastKeywords'];
        unset($_POST['lastKeywords']); 

        //send what's left of the POST (text info) to CRUD
        //if you want to allow a user to edit EVERYTHING:
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
        //no access if you are not logged in
        CheckSession::sessionAuth();

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

        //block the functionality if the writer 
        //logged in is not this text's writer
        if($_POST['writer_id'] != $_SESSION['writer_id']){

            Twig::render('home-error.php', ['message'=> "You can't delete another writer's text."]);
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
        //no access if you are not logged in
        CheckSession::sessionAuth();

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
        //to deal with the previous title and the title of the iteration separately
        $data["previous_title"] = $data["title"];
        $data["title"] = "";

        //send it all to the form
        Twig::render('text-iterate.php', ['data' => $data]);
    }


    public function validateText($data, $isRoot){
        RequirePage::library('Validation');
        $val = new Validation;

        $val->name('writing')->value($data["writing"])->required()->max(65000);
        $val->name('title')->value($data["title"])->required()->max(75);
        $val->name('keywords')->value($data["keywords"])->pattern('keywords')->max(75);
        // validate the prompt, but only if this is a root text
        if($isRoot){
            $val->name('prompt')->value($data["prompt"])->required()->max(200);
        }

        // Verify for prompt only if this is a 
        // TODO: eventually, add the logic of word-count... this will count
        //and store the previous word count (or start at zero), and send that amount to 
        //the front end. I don't want to prevent people from going OVER... but I'd 
        //want to have something happen front-end... I think its important to be 
        //as flexible as possible in terms of allowing rule-breaking... but perhaps in
        //reminding users of rules on the front end.  

        if($val->isSuccess()){
            //if this is successful, continue the code
            //so... do nothing
        }else{
            $errors = $val->displayErrors();
            //send it to the form
            Twig::render($data["currentPage"], ['data' => $data, 'errors' => $errors]);
            exit();
        };
    }

    public function validateNote($data){
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('note')->value($data["note"])->max(500);

        if($val->isSuccess()){
            //if this is successful, continue the code
            //so... do nothing
        }else{
            $errors = $val->displayErrors();
            //send it to the form
            Twig::render($data["currentPage"], ['data' => $data, 'errors' => $errors]);
            exit();
        };
    }
}

?>