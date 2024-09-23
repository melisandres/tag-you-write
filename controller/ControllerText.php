<?php

RequirePage::model('Text');
RequirePage::model('Writer');
RequirePage::model('Keyword');
RequirePage::model('TextHasKeyword');
RequirePage::model('Prep');
RequirePage::model('Game');
RequirePage::model('GameHasPlayer');
RequirePage::model('TextStatus');
RequirePage::model('Seen');
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
    /* private function addPermissions(&$node, $currentUserId, $hierarchy) {
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
                $this->addPermissions($child, $currentUserId, $hierarchy);
            }
        }
    } */

    private function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        // selectTexts adds hasContributed, isWinner, and openForChanges, but 
        // the front end works better if these are just true/false instead of 0/1
        $node['hasContributed'] = $node['hasContributed'] == 1 ? true : false;
        $node['isWinner'] = $node['isWinner'] == 1 ? true : false;
        $node['openForChanges'] = $node['openForChanges'] == 1 ? true : false;

        RequirePage::library('Permissions');
        $node = Permissions::aggregatePermissions($node, $currentUserId);
        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->addPermissions($child, $currentUserId, $hierarchy);
            }
        }
    }

    //show the page from which someone can write a new text
    public function create(){
        //available only to those logged in (ie: writers)
        CheckSession::sessionAuth();

        // TODO: it's ok to have access to all the writers... for when writers can choose who to play with.
        $writer = new Writer;
        $select = $writer->select();
        Twig::render('text-create.php', ['writers'=>$select]);
    }

    // Api endpoint for autosaving texts
    public function autosave() {
        // Get the current user Id
        $currentUserId = $_SESSION['writer_id'] ?? null;
 
        // Get the text data from the POST request
        $textData = $_POST['text'];

        // Create a new Text object
        $text = new Text;

        // Insert the text data into the database
        $textId = $text->insert($textData);
        

    }



    //this is where we save the text entered, and its 
    //associated keywords, etc. be it a new text or an iteration
    //IF its a new text, we create a new game.
    public function store() {
        // Check if the writer is logged in
        CheckSession::sessionAuth();

        // Get JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendJsonResponse(false, 'Invalid JSON data');
        }

        // Make sure we have input data
        if (empty($input)) {
            // TODO: with autosave, this could happen... so message should be clean
            $this->sendJsonResponse(false, 'No input data received');
        }

        $text = new Text;
        $keyWord = new Keyword;
        $textStatus = new TextStatus;
        $parentId = $input['parent_text_id'] ?: null;
        $isRootText = !$input['game_id'] && !$parentId;
        $currentWriterId = $_SESSION['writer_id'];

        // Check if this is an iteration, if so, check permissions
        if (!$isRootText) {
            $data = $text->selectTexts($currentWriterId, $parentId);
            $this->addPermissions($data, $currentWriterId);

            if (!Permissions::canIterate($data, $currentWriterId)) {
                $this->sendJsonResponse(false, 'Permission denied to iterate');
            }
        }

        // Validate the input
        $status = $input['text_status'];
        $input['parent_id'] = $parentId;
        $status = $this->validateText($input, $isRootText, $status);

        // Create a new game if this is a root text (no game_id && no parent_id
         if ($isRootText) {
            $gameController = new ControllerGame;
            $gameId = $gameController->createGame($input);

            if ($gameId === false) {
                $this->sendJsonResponse(false, 'Failed to create a new game');
            }

            $input['game_id'] = $gameId;
        } 

        // Get the keywords from POST
        $keywords = $input['keywords'];

        // Remove the keywords and redirectPage reference from POST
        unset($input['keywords']);
        unset($input['currentPage']);

        // Remove the other extra values from POST so that you can send off your POST to insert
        unset($input['firstName']);
        unset($input['lastName']);
        unset($input['parentTitle']);
        unset($input['parentWriting']);
        unset($input['prompt']);
        unset($input['parent_text_id']);

        // Translate ['text_status'] into its 'id' in order to save it with the text
        unset($input['text_status']);
        $input['status_id'] = $textStatus->selectStatus($status);

        // Send what's left of the input (text info) to CRUD
        $textIdFromInsert = $text->insert($input);

        //send the writer_id and the game_id to game_has_player
        if ($status == 'published') {
            $gameHasPlayer = new GameHasPlayer;
            $gameHasPlayer->insert([
                'player_id' => $currentWriterId,
                'game_id' => $input['game_id'],
                'active' => 1
            ]);
        }

        // Handle keywords
        $prep = new Prep;
        // Since this is not an update, we can bypass keyword logic if none are provided.
        if (isset($input['keywords'])) {    
            $keywords = $prep->keywords($input['keywords']);
            $textHasKeyword = new TextHasKeyword;

            // each keyword needs to be treated:
            foreach ($keywords as $word) {
                // cleaned of spaces
                $assArr = ['word' => trim($word)];

                // inserted into the keywords table, (if it isn't already there)
                $testId = $keyWord->insert($assArr, true);

                // we need that keyword's id: but we must remember that it comes as an array
                $keywordIdFromInsert = $keyWord->selectWordId($assArr);

                // with that id, we can build an associative array to send to text_has_keyword
                $textHasKeywordArray = ['text_id' => $textIdFromInsert, 'keyword_id' => $keywordIdFromInsert['id']];

                // now we can insert this keyword into text_has_keyword
                $textHasKeyword->insert($textHasKeywordArray);
            }
        }

        $this->sendJsonResponse(true, 'Text saved successfully', 'text');
    }


    //this will show a specific text on its own page
    //It is not currently being used. Text are currently loaded along with all the 
    //texts associated to a game, and 
    public function show($id = null){ 
        $text = new Text;
        $selectId = $text->selectIdText($id);

        //TODO: since this exists, you need to block it off to users who are
        //not the writer if its a draft

        //here, you check if the id doesn't exist, or if it's null
        if($id == null || !$selectId){
            Twig::render('home-error.php', ['message'=> "Something went wrong. Sorry.The requested text does not exist."]);
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
    // for a draft: all fields can be altered. the draft-edit view is sent. 
    // a published text: only the note/note_date can be altered. the note-edit view is sent.
    public function edit(){
        //no access if you are not logged in
        CheckSession::sessionAuth();

        //models
        $text = new Text;

        //variables 
        $currentWriterId = $_SESSION['writer_id'];
        $textId = $_POST['id'];

        //get the latest info about text and game
        $textData = $text->selectTexts($currentWriterId, $textId);
        $status = $textData['text_status'];

        // Add permissions to the retrieved data
        $this->addPermissions($textData, $currentWriterId);


        // Check user's permission to edit (myText && openForChanges && (draft || incomplete_draft)) 
        if (!Permissions::canEdit($textData, $currentWriterId) && !Permissions::canAddNote($textData, $currentWriterId)) {
            Twig::render('home-error.php', ['message'=> "Sorry! You don't have permission to edit this text."]);
            exit();
        }

        // All is good, lets save some keywords.
        $keywords = $text->selectKeyword($_POST['id']);

        // Prepare the keywords
        $keywordString = "";
        foreach ($keywords as $key => $value) {
            $keywordString .= $value.", ";
        }
        $cleanKeywordString= trim($keywordString, ", ");

        // Create a data array that will send the values
        // to the page legibly...
        $textData["keywords"] = $cleanKeywordString;
        $textData["lastKeywords"] = $cleanKeywordString;

        if ($status == 'published') {
            // Render the view for adding notes to published texts
            Twig::render('text-note-edit.php', ['data' => $textData, 'keywords' => $keywords]);

        }elseif($status == 'draft' || $status == 'incomplete_draft'){
            // Get the some parent data, IF this is not a root text
            if ($textData['parent_id']) {
                $parentData = $text->selectTexts($currentWriterId, $textData['parent_id']);
                $textData['parentFirstName'] = $parentData['firstName'];
                $textData['parentLastName'] = $parentData['lastName'];
                $textData['parentTitle'] = $parentData['title'];
                $textData['parentWriting'] = $parentData['writing'];
            }

            // Send it all to the form
            Twig::render('text-draft-edit.php', ['data' => $textData]);
        }
    }

    //a function to publish instantly
    public function instaPublish(){
        //no access if you are not logged in
        CheckSession::sessionAuth();
        
        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('text');
            exit();
        }

        //check permissions
        $text = new Text;
        $currentWriterId = $_SESSION['writer_id'];
        $textId = $_POST['id'];
        $textData = $text->selectTexts($currentWriterId, $textId);

        $this->addPermissions($textData, $currentWriterId);


        //TODO: you may want to revisit the inability to edit if the game is closed... just for writers who are writing at the moment the game closes... especially if what is out there is public, like a note! you wouldn't want to stop the writer from making their public note legible. I feel it should be possible to edit a note, even if the game is closed. In this case... permission to publish would be reliant of the game being open for changes, and the text being neither an incomplete draft, nor a published text. 

        // Check user's permission to edit (myText && openForChanges && isDraft -- a validated draft)
        if (!Permissions::canPublish($textData, $currentWriterId)) {
            $this->sendJsonResponse(false, 'Permission to publish denied');
        }

        // Get the 'published' status_id dynamically
        $textStatus = new TextStatus;
        $statusData = $textStatus->selectStatusByName('published');
        $statusId = $statusData['id'];


        // Prepare the data for update
        $data = [
            'id' => $textId,
            'status_id' => $statusId // Dynamically retrieved 'published' status_id
        ];

        $success = $text->update($data);
    
        //if the publish was a success, add the player to the game
        //BUT only if they are not already in it? 
        if ($success) { 
            $gameId = $text->selectGameId($textId);

            // Check if the player is already in the game
            $gameHasPlayer = new GameHasPlayer;
            $existingPlayer = $gameHasPlayer->selectCompositeId(['game_id' => $gameId, 'player_id' => $currentWriterId]);

            // Insert only if the player is not already in the game
            if (!$existingPlayer) {
                $gameHasPlayerData = [
                    'player_id' => $currentWriterId,
                    'game_id' => $gameId,
                    'active' => 1
                ];
                $gameHasPlayer->insert($gameHasPlayerData);
            }          
        }

        error_log("InstaPublish result: " . ($success ? "true" : "false"));
    
        $this->sendJsonResponse($success, $success ? 'Published successfully' : 'Failed to publish');
    }

    //update send an edited text to the database
    public function update(){
        //no access if you are not logged in
        CheckSession::sessionAuth();

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('text');
            exit();
        }

        // Get JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendJsonResponse(false, 'Invalid JSON data');
        }

        // Make sure we have input data
        if (empty($input)) {
            // TODO: with autosave, this could happen... so message should be clean
            $this->sendJsonResponse(false, 'No input data received');
        }

        $text = new Text;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;
        $prep = new Prep;

        $currentWriterId = $_SESSION['writer_id'];
        $textId = $input['id'];
        $textData = $text->selectTexts($currentWriterId, $textId);
        $isRoot = $textData['parent_id'] == '' ? true : false;

        $this->addPermissions($textData, $currentWriterId);

        // Check user's permission to edit (myText && openForChanges)
        if (!Permissions::canEdit($textData, $currentWriterId) && !Permissions::canAddNote($textData, $currentWriterId)) {
            $this->sendJsonResponse(false, 'Permission to edit denied');   
        }

        //validate the $_POST
        $currentPage = $input['currentPage'];

        // get the intended status from the form data
        $textStatus = new TextStatus;
        $status = $input['text_status'];
        unset($input['text_status']);

        // Choose the validation method 
        // For a note, validate, update, and exit.
        // For other texts, validate, and continue below.
        if($currentPage == "text-note-edit.php"){
            $this->validateNote($input);
            // Here, you are only allowing a user to edit the NOTE:
            $updateNote['note'] = $input['note'];
            $updateNote['note_date'] = $input['note_date'];
            $updateNote['id'] = $input['id'];
            $update = $text->update($updateNote);

            // TODO: you'll probably want to access this async too with a little message :)
            RequirePage::redirect('text');
            exit;
        }else{
            // Your validation may change the status, if the text isnt instaPublish ready
            $status = $this->validateText($input, $isRoot, $status);
        }

        // Root texts need to update the game prompt
        if ($isRoot) {
            $gameId = $text->selectGameId($textId);
            $game = new Game;
            $game->update(['id' => $gameId, 'prompt' => $input['prompt']]);
            unset($input['prompt']);
            unset($input['parent_id']);
            unset($input['writer_id']);
        }

        // you'll need the text-status-id in order to save the text
        $input['status_id'] = $textStatus->selectStatus($status);

        //although I am not keeping the functionality of editing keywords,
        //I'm keeping the code here, because I remember it was a little 
        //complicated to work out, and ultimately, editing keywords is fine--
        //I could decide to make the functionality available again.

        //get the new keywords from POST, copy, and remove
        $keywords = $input['keywords'];
        unset($input['keywords']);
        unset($input['currentPage']);
        unset($input['parentFirstName']);
        unset($input['parentLastName']);
        unset($input['parentTitle']);
        unset($input['parentWriting']);

        //get the previous keywords from POST, also remove
        $lastKeywords = $input['lastKeywords'];
        unset($input['lastKeywords']); 

        //send what's left of the POST (text info) to CRUD
        //if you want to allow a user to edit EVERYTHING:
        $update = $text->update($input);

        // If the publish was a success, add the player to the game
        // BUT only if they are not already in it
        if ($update && $status == 'published') { 
            // Check if the player is already in the game
            $gameId = $text->selectGameId($textId);
            $gameHasPlayer = new GameHasPlayer;
            $existingPlayer = $gameHasPlayer->selectCompositeId(['game_id' => $gameId, 'player_id' => $currentWriterId]);

            // Insert only if the player is not already in the game
            if (!$existingPlayer) {
                $gameHasPlayerData = [
                    'player_id' => $currentWriterId,
                    'game_id' => $gameId,
                    'active' => 1
                ];
                $gameHasPlayer->insert($gameHasPlayerData);
            }          
        }

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
            $textHasKeywordArray = ['text_id' => $input['id'], 'keyword_id' => $keywordIdFromInsert['id']];

            //now we can insert this keyword into text_has_keyword
            $textHasKeyword->insertTextHasKeyWord($textHasKeywordArray);
        }

        //earlier, previous keywords was compared to current keywords 
        //the difference was placed in $wordsToCheck
        if(isset($wordsToCheck) && !empty($wordsToCheck)){
            foreach($wordsToCheck as $word){
                //delete text_has_id lines for keywords no longer used
                $textHasKeyword->deleteTextHasKeyword($word, $input['id']);

                //get an associative array with the whole keyword line
                $keywordInfos = $keyword->selectId($word, 'word');

                //with the id, check if the key is being used elsewhere, if not, delete from keywords
                $keyword->deleteUnusedKeywords($keywordInfos['id']);
            }
            $this->sendJsonResponse(true, 'Operation successful', 'text');
        }else{
            $this->sendJsonResponse(true, 'Operation successful', 'text');
        }
    }


    // Deletes a text from the database
    public function delete(){
        // No access if you are not logged in
        CheckSession::sessionAuth();

        $currentWriterId = $_SESSION['writer_id'];
        $textId = $_POST['id']; 
        $insta = isset($_POST['insta']) && $_POST['insta'] === '1';
        $text = new Text;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;

        //TODO: I think I'm going a little crazy. a bunch of things I need for my checks will be in $textData--like the parent_id, which I don't need to send via the form--oh, but I do, because it helps decide the view.
        $textData = $text->selectTexts($currentWriterId, $textId);
        $this->addPermissions($textData, $currentWriterId);
        $isRoot = $textData['parent_id'] == '' ? true : false;

        // Check user's permission to edit (myText && openForChanges)
        if (!Permissions::canDelete($textData, $currentWriterId)) {
            Twig::render('home-error.php', ['message'=> "Sorry! This game is closed, or the text you're trying to edit isn't yours. Either way, this action is not permitted."]);
            exit();
        }

        /* // $select will be false if 'id' is not found in the column 'parent_id' for any other text
        $select = $text->selectId($textId, 'parent_id');
        if($select){
            Twig::render('home-error.php', ['message'=> "Another writer has iterated on this text, and therefore it can no longer be deleted. Sorry."]);
            return;
        }

        // Block if the writer logged in is not this text's writer
        if($textData['writer_id'] != $_SESSION['writer_id']){

            Twig::render('home-error.php', ['message'=> "You can't delete another writer's text."]);
            return;
        } */

        // $keyWordIds is given an associative array where all keys are "keyword_id"
        // it is empty if there are no keywords in the given text.
        $keyWordIds = $keyword->selectKeywordIds($textId);

        // Check if there are any keywords... and if so
        if(isset($keyWordIds)){
            // Delete ALL text_has_keyword entries
            $textHasKeyword->delete($textId);

            // Delete the keywords, if they aren't being used by other text_has_keyword
            foreach ($keyWordIds as $key => $value) {
                if (!$keyword->deleteUnusedKeywords($value["keyword_id"])) {
                    // Handle the error, maybe log it or set a flag
                    error_log("Failed to delete unused keyword: " . $value["keyword_id"]);
                }
            }
        }

        // in order to be able to delete, you need to delete the "seens" that reference this id
        $seen = new Seen;
        // Directly delete all entries in the `seen` table that reference this text
        $seen->deleteById($textId);

        $response = $text->delete($textId);

        // If the text deleted is a root, delete the game
        if($response && $isRoot){
            $gameId = $textData['game_id'];
            $game = new Game;
            $game->delete($gameId);
        }


        if ($response !== true) {
            if (!$insta) {
                Twig::render('home-error.php', [
                    'message'=> "We were not able to delete. Sorry.",
                ]);
            } else {
                $this->sendJsonResponse(false, 'Failed to delete');
            }
        } else {
            if (!$insta) {
                RequirePage::redirect('text');
            } else {
                $this->sendJsonResponse(true, 'Deleted successfully');
            }
        }
    }


    // Like show and edit, it presents a filled-out form with the text to be iterated
    public function iterate(){
        // No access if you are not logged in
        CheckSession::sessionAuth();

        // Recuperate the text, and the keywords associated to it
        $text = new Text;
        $currentWriterId = $_SESSION['writer_id'];
        $textData = $text->selectTexts($currentWriterId, $_POST['id']);


        // Add permissions to the retrieved data
        $this->addPermissions($textData, $currentWriterId);

        // Check user's permission to iterate (myText && openForChange && !isDraft)
        if (!Permissions::canIterate($textData, $currentWriterId)) {
            Twig::render('home-error.php', ['message'=> "Sorry! This action is not permitted, for one of many reasons."]);
            exit();
        }

        $keywords = $text->selectKeyword($_POST['id']);

        // Prepare the keywords string
        $keywordString = "";
        foreach ($keywords as $key => $value) {
            $keywordString .= $value.", ";
        }
        $cleanKeywordString= trim($keywordString, ", ");

        // Create a data array that will send the values to the page legibly...
        $textData["keywords"] = $cleanKeywordString;
        // To deal with the parent title, parent writing and the title and writing of the iteration separately
        $textData["parentTitle"] = $textData["title"];
        $textData["parentWriting"] = $textData["writing"];
        $textData["title"] = "";

        // Send it all to the form
        Twig::render('text-iterate.php', ['data' => $textData]);
    }

    // Validate the text data 
    // The $autosave parameter is to check if the data is being sent via an api fetch or if it's a form submission
    public function validateText($data, $isRoot, $intended_status, $autoSave = false){
        RequirePage::library('Validation');
        $val = new Validation;
    
        // Basic validation for all texts (including incomplete drafts)
        $val->name('writing')->value($data["writing"])->max(16777215); // MEDIUMTEXT max length
        $val->name('title')->value($data["title"])->max(45); // Currently a varchar 45 could increase to 100
        $val->name('keywords')->value($data["keywords"])->max(255); // Allow for multiple keywords

        if ($isRoot) {
            $val->name('prompt')->value($data["prompt"])->max(200);
        }

        // Check if basic validation passes
        if (!$val->isSuccess()) {
                // TODO: send the errors in a good structure... so that the front end can display it nicely. 
                 // Convert the errors to JSON format
                $jsonData = json_encode($val->displayErrors());
                return $jsonData;
        }
    
        // Stricter validation for publication AND/OR for autoPublish-ready drafts
        $val->name('keywords')->value($data["keywords"])->pattern('keywords')->keywordCount(3);

        if (!$isRoot) {
            // Iterations use a short title to describe changes to the parent text 
            $val->name('title')->value($data["title"])->required()->wordCount(3);
            $val->name('writing')->value($data["writing"])->required()->wordCount(50, $data['parentWriting']);
        }else{
            // Root texts set up the game and prompt
            $val->name('title')->value($data["title"])->required();
            $val->name('writing')->value($data["writing"])->required()->wordCount(50, "");
            $val->name('prompt')->value($data["prompt"])->required()->max(200);
        } 
        
        if ($val->isSuccess()) {
            return $intended_status; // Keep the intended status
        } else {
            if ($intended_status == 'draft') {
                return 'incomplete_draft';
            } else {
                // TODO: send the errors in a workable structure... so that the front end can display it nicely. 
                    // Convert the errors to JSON format
                $jsonData = json_encode($val->displayErrors());
                return $jsonData;
            }
        }
    }

    public function validateNote($data){
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('note')->value($data["note"])->max(500)->wordCount(50);

        if($val->isSuccess()){
            // If this is successful, continue the code, so... do nothing
        }else{
            $errors = $val->displayErrors();
            // Send it to the form
            Twig::render($data["currentPage"], ['data' => $data, 'errors' => $errors]);
            exit();
        };
    }

    private function sendJsonResponse($success, $message, $redirectUrl = null) {
        header('Content-Type: application/json');
        echo json_encode([
            'success' => $success,
            'toastMessage' => $message,
            'toastType' => $success ? 'success' : 'error',
            'redirectUrl' => $redirectUrl
        ]);
        exit;
    }
}

?>