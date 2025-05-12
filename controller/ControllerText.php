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
RequirePage::model('Notification');
RequirePage::model('Event');

class ControllerText extends Controller{

    //show the page with all the texts
    public function index(){
        // Get filter parameters from URL
        $filters = [
            'hasContributed' => isset($_GET['hasContributed']) ? 
                ($_GET['hasContributed'] === 'true' || $_GET['hasContributed'] === 'contributor' ? true : 
                ($_GET['hasContributed'] === 'mine' ? 'mine' : null)) : null,
            'gameState' => isset($_GET['gameState']) ? $_GET['gameState'] : 'all'
        ];

        // TODO: Get the sort parameter from URL
        $sort = null;

        /* error_log('Sort: ' . $sort); */

        // Getting the games
        $game = new Game;
        $allGames = $game->getGames($sort, $filters);

        // Get the notifications
        $currentUserId = $_SESSION['writer_id'] ?? null;
        if ($currentUserId){
            $notification = new Notification;
            $notifications = $notification->getNotifications();
        }else{
            $notifications = [];
        }

        // Send both the rendered data and the complete dataset
        Twig::render('text-index.php', [
            'texts' => $allGames,
            'gamesData' => json_encode($allGames),
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications),
            'initialFilters' => json_encode($filters) 
        ]);
    }

    public function collab($rootId = null) {
        if ($rootId === null) {
            Twig::render('home-error.php', ['message' => "error.no_game_specified"]);
            exit();
        }

        // First get the game ID from the text ID
        $text = new Text;
        $gameId = $text->selectGameId($rootId);

        if (!$gameId) {
            Twig::render('home-error.php', ['message' => "error.text_not_found"]);
            exit();
        }

        // Get the game data using the game ID
        $game = new Game;
        $filters = []; // Empty filters since we want just this specific game
        $gameData = $game->getGames(null, $filters, $gameId);

        if (empty($gameData)) {
            Twig::render('home-error.php', ['message' => "error.game_not_found"]);
            exit();
        }

        // Get the tree data
        $treeData = $this->getTree($rootId);

        // Get the notifications
        $notification = new Notification;
        $notifications = $notification->getNotifications();

        // Render the collaboration view
        Twig::render('text-collab.php', [
            'game' => $gameData[0], // Single game data
            'gameData' => json_encode($gameData[0]), // For JavaScript
            'treeData' => $treeData, // The tree structure
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
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
        $game = new Game;

        // Get the gameId
        $gameId = $game->selectGameId($rootId);

        // Get the current user Id
        $currentUserId = $_SESSION['writer_id'] ?? null;

        // Get only the texts for this game
        $select = $text->selectTexts($currentUserId, $gameId, true);

        // Build the requested tree
        $tree = $this->buildHierarchy($select, 'id', $rootId);

        // Add permissions to each node iteratively
        $this->addPermissions($tree[0], $currentUserId, $tree);

        // Convert the hierarchical array to JSON format
        $jsonData = json_encode($tree);

        return $jsonData;
    }

    // An end point for only modified text nodes from a single tree. 
    public function checkTreeUpdates() {
        $data = json_decode(file_get_contents('php://input'), true);
        $rootId = $data['rootId'];
        $lastTreeCheck =  date('Y-m-d H:i:s', (int)($data['lastTreeCheck'] / 1000));

        $text = new Text;
        $game = new Game;

        // Get the gameId
        $gameId = $game->selectGameId($rootId);

        // Get the current user Id
        $currentUserId = $_SESSION['writer_id'] ?? null;

        // Get only the texts for this game
        $modifiedNodes = $text->selectTexts($currentUserId, $gameId, true, $lastTreeCheck);

        if (!empty($modifiedNodes)) {
            $this->addPermissions($modifiedNodes[0], $currentUserId, $modifiedNodes);
        }

        // Convert the hierarchical array to JSON format
        $jsonData = json_encode($modifiedNodes);

        header('Content-Type: application/json');
        echo $jsonData;
        exit;
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

    // This works hand in hand with the library/permissions.php. I can't remember why it isn't included in this system... I think it just works a little differently, and so it's easier to keep it here (?)
/*     private function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        // selectTexts adds hasContributed, isWinner, and openForChanges, but 
        // the front end works better if these are just true/false instead of 0/1
        $node['hasContributed'] = $node['hasContributed'] == 1;
        $node['isWinner'] = $node['isWinner'] == 1;
        $node['openForChanges'] = $node['openForChanges'] == 1;

        RequirePage::library('Permissions');
        $node = Permissions::aggregatePermissions($node, $currentUserId);
        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->addPermissions($child, $currentUserId, $hierarchy);
            }
        }
    } */

    //show the page from which someone can write a new text
    public function create(){
        //available only to those logged in (ie: writers)
        CheckSession::sessionAuth();
        Twig::render('text-create.php', ['data' => []]);

        // TODO: it's ok to have access to all the writers... for when writers can choose who to play with.
/*         $writer = new Writer;
        $select = $writer->select(); */

    }


    // We need a method that handles autosaves--making the decision whether to insert or update
    public function autoSave() {
        // Get JSON input   
        $input = json_decode(file_get_contents('php://input'), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendJsonResponse(false, 'toast.text.invalid_json');
        }
    
        if (empty($input)) {
            $this->sendJsonResponse(false, 'toast.text.no_input');
        }
    
        // Get the textId from the input
        $textId = $input['id'] ?? null;
    
        // update or store, depending on whether the text has an id
        if ($textId) {
            // Call the update method
            $this->update($input);
        } else {
            // Call the store method
            $textId = $this->store($input);
        }
        // Return the new text ID in the response
        $this->sendJsonResponse(true, 'toast.text.auto_success', ['textId' => $textId]);
    }


    //this is where we save the text entered, and its 
    //associated keywords, etc. be it a new text or an iteration
    //IF its a new text, we create a new game.
    public function store($autoSaveInput = null) {
        // Check if the writer is logged in
        CheckSession::sessionAuth();

        // Get JSON input
        if ($autoSaveInput == null) {
            $input = json_decode(file_get_contents('php://input'), true);
        }else{
            $input = $autoSaveInput;
        }

        // Check if the input is valid JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendJsonResponse(false, 'toast.text.invalid_json');
        }

        // Make sure we have input data
        if (empty($input)) {
            $this->sendJsonResponse(false, 'toast.text.no_input');
        }

        // Initialize models
        $text = new Text;
        $keyWord = new Keyword;
        $textStatus = new TextStatus;

        // Get the parent ID and check if this is a root text   
        $parentId = $input['parent_id'] == '' ? null : $input['parent_id'];
        // This represents a FIRST save... so it won't have a game_id yet
        $isRootText = !$input['game_id'] && !$parentId;

        // Get the current writer ID
        $currentWriterId = $_SESSION['writer_id'];

        // Check if this is an iteration, if so, check permissions
        if (!$isRootText) {
            $data = $text->selectTexts($currentWriterId, $parentId);
            $this->addPermissions($data, $currentWriterId);

            if (!Permissions::canIterate($data, $currentWriterId)) {
                $this->sendJsonResponse(false, 'toast.text.permission_denied_iterate');
            }
        }

        // Validate the input
        $status = $input['text_status'];
        $input['parent_id'] = $parentId;
        $status = $this->validateText($input, $isRootText, $status);

        // Check if validation returned an error structure
        if (is_array($status) && isset($status['status']) && $status['status'] === 'error') {
            $this->sendJsonResponse(false, 'toast.text.validation_failed', ['errors' => $status['errors']]);
            exit;
        }

        // Create a new game if this is a root text (no game_id && no parent_id
        if ($isRootText) {
            $gameController = new ControllerGame;
            $gameId = $gameController->createGame($input);

            if ($gameId === false) {
                $this->sendJsonResponse(false, 'toast.text.failed_create_game');
            }

            $input['game_id'] = $gameId;
        } 

        // Get the keywords from POST
        $keywords = $input['keywords'];

       
        // Translate ['text_status'] into its 'id' in order to save it with the text
        $input['status_id'] = $textStatus->selectStatus($status);

        // Send what's left of the input (text info) to CRUD
        $textToSave = [
            'title' => $input['title'],
            'writing' => $input['writing'],
            'parent_id' => $parentId,
            'game_id' => $input['game_id'],
            'status_id' => $input['status_id'],
            'writer_id' => $currentWriterId,
            'date' => date('Y-m-d H:i:s'),
            'modified_at' => date('Y-m-d H:i:s')
        ];

        // Modified_at currentlyrefresh the UI... so it permits the writer of the text to retrieve it when they return to the page, and the Modified_since endpoint retrieves it... only for them. 

        //save the text
        $textIdFromInsert = $text->insert($textToSave);

        //if this is a root text, save the root text id in the game
        if ($isRootText) {
            $data = [
                'id' => $input['game_id'],
                'root_text_id' => $textIdFromInsert
            ];
            $game = new Game;
            $game->update($data);
        }

        //send the writer_id and the game_id to game_has_player
        if ($status == 'published') {
            $gameHasPlayer = new GameHasPlayer;
            $gameHasPlayer->insert([
                'player_id' => $currentWriterId,
                'game_id' => $input['game_id'],
                'active' => 1
            ]);
        }

        // Update the game's modified_at--so that the creator can see the game, be it published or not. 
        $game = new Game;
        $game->update([
            'id' => $input['game_id'], 
            'modified_at' => date('Y-m-d H:i:s')
        ]);

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

        // EVENTS! But only when a text is published. And if the text is a root, Two events: game and text--because this is "Store" not "update".

        // NOTE: This is assuming that the writer does not need to see their draft on a representation of the game while editing, and that leaving the form page to return to the game page will go through the modifiedSince endpoint, and bypass the events system, which will not carry any events for drafts but only for publishing. 
        if ($status == 'published') {
            // Create events for the published text
            $eventType = $isRootText ? 'ROOT_PUBLISH' : 'CONTRIB_PUBLISH';
            $this->createEvents($eventType, [
                'textId' => $textIdFromInsert,
                'gameId' => $input['game_id'],
                'title' => $input['title'],
                'isRoot' => $isRootText
            ], 'form_submit');
        }

        // Same action in both cases. Not an autosave, doing it here, Yes an autosave, doing it in the autosave method.
        if ($autoSaveInput == null) {
            if ($status == 'published') {
                $this->sendJsonResponse(true, 'toast.text.publish_success', 'text');
            } else {
                $this->sendJsonResponse(true, 'toast.text.success', ['textId' => $textIdFromInsert]);
            }
        }else{
            // Return the new text ID
            return $textIdFromInsert;
        }
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
            Twig::render('home-error.php', ['message'=> "error.game_does_not_exist"]);
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
        // No access if you are not logged in
        CheckSession::sessionAuth();

        // Models
        $text = new Text;

        // Variables 
        $currentWriterId = $_SESSION['writer_id'];
        
        // Check for text ID in both POST and GET
        $textId = $_POST['id'] ?? $_GET['id'] ?? null;
        
        if (!$textId) {
            Twig::render('home-error.php', ['message'=> "error.no_text_id_provided"]);
            exit();
        }

        // Get the latest info about text and game
        $textData = $text->selectTexts($currentWriterId, $textId);
        $status = $textData['text_status'];
        
        // Check if text data was found
        if (!$textData) {
            Twig::render('home-error.php', ['message'=> "error.text_not_found"]);
            exit();
        }
        
        // Add permissions to the retrieved data
        $this->addPermissions($textData, $currentWriterId);

        // Check user's permission to edit (myText && openForChanges && (draft || incomplete_draft)) 
        if (!Permissions::canEdit($textData, $currentWriterId) && !Permissions::canAddNote($textData, $currentWriterId)) {
            Twig::render('home-error.php', ['message'=> "error.permission_denied_edit"]);
            exit();
        }

        // All is good, lets save some keywords.
        $keywords = $text->selectKeyword($textId);

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
                $textData['game_title'] = $parentData['game_title'];
            }

            // Send it all to the form
            Twig::render('text-create.php', ['data' => $textData]);
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
            $this->sendJsonResponse(false, 'toast.text.permission_denied_publish');
        }

        // Get the 'published' status_id dynamically
        $textStatus = new TextStatus;
        $statusData = $textStatus->selectStatusByName('published');
        $statusId = $statusData['id'];

        // Prepare the Text data for update
        $data = [
            'id' => $textId,
            'status_id' => $statusId, // Dynamically retrieved 'published' status_id
            'modified_at' => date('Y-m-d H:i:s')
        ];

        $success = $text->update($data);
    
        // If the publish was a success, make modifications to the game
        // Add the player BUT only if they are not already in it.
        // Update the game's modified_at--but only if the text is a root text.
        if ($success) { 
            $gameId = $text->selectGameId($textId);

            // Check if the player is already in the game
            $gameHasPlayer = new GameHasPlayer;
            $existingPlayer = $gameHasPlayer->selectCompositeId([
                'game_id' => $gameId, 
                'player_id' => $currentWriterId
            ]);

            // Insert only if the player is not already in the game
            if (!$existingPlayer) {
                $gameHasPlayerData = [
                    'player_id' => $currentWriterId,
                    'game_id' => $gameId,
                    'active' => 1
                ];
                $gameHasPlayer->insert($gameHasPlayerData);
            }  
            
            // Update the game's modified_at--because any new game will change the "seen" count.
            $game = new Game;
            $game->update([
                'id' => $gameId, 
                'modified_at' => date('Y-m-d H:i:s')
            ]);

            // Determine if this is a root text
            $isRoot = $textData['parent_id'] == '' ? true : false;
            
            // Create events for the published text
            $eventType = $isRoot ? 'ROOT_PUBLISH' : 'CONTRIB_PUBLISH';
            $this->createEvents($eventType, [
                'textId' => $textId,
                'gameId' => $gameId,
                'title' => $textData['title'],
                'isRoot' => $isRoot
            ], 'insta_publish');

            $gameData = $game->getGames(null, [], $gameId);
            $gameData[0]['isNewPlayer'] = !$existingPlayer; 
        }

        $this->sendJsonResponse(
            $success, 
            $success ? 'toast.text.publish_success' : 'toast.text.publish_failed',
            [
                'gameData' => $gameData, 
            ]
        );
    }

    //update send an edited text to the database
    public function update($autoSaveInput = null){
        //no access if you are not logged in
        CheckSession::sessionAuth();

        // Get JSON input
        if ($autoSaveInput == null) {
            $input = json_decode(file_get_contents('php://input'), true);
        }else{
            $input = $autoSaveInput;
        }
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->sendJsonResponse(false, 'toast.text.invalid_json');
        }

        // Make sure we have input data
        if (empty($input)) {
            $this->sendJsonResponse(false, 'toast.text.no_input');
        }

        // Initialize models
        $text = new Text;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;
        $game = new Game;

        $prep = new Prep;

        // Get the current writer's ID
        $currentWriterId = $_SESSION['writer_id'];

        // Get the text ID
        $textId = $input['id'];

        // Get the text data
        $textData = $text->selectTexts($currentWriterId, $textId);
        $isRoot = $textData['parent_id'] == '' ? true : false;

        // Get the game ID
        $gameId = $text->selectGameId($textId);

        // Add permissions
        $this->addPermissions($textData, $currentWriterId);
    
        // Check user's permission to edit (myText && openForChanges)
        if (!Permissions::canEdit($textData, $currentWriterId) && !Permissions::canAddNote($textData, $currentWriterId)) {
            $this->sendJsonResponse(false, 'toast.text.permission_denied_edit');   
        }

        //validate the $_POST
        $currentPage = $input['currentPage'];

        // get the intended status from the form data
        $status = $input['text_status'];

        // Choose the validation method 
        // For a note, validate, update, and exit.
        // For other texts, validate, and continue below.
        if($currentPage == "text-note-edit.php"){
            $this->validateNote($input);
            // Here, you are only allowing a user to edit the NOTE:
            $updateNote = [
                'note' => $input['note'],
                'note_date' => $input['note_date'],
                'id' => $input['id'],
                'modified_at' => date('Y-m-d H:i:s')
            ];

            $update = $text->update($updateNote);

            // Update the game's modified_at, so that you can show the "unseen" count
            if ($update) {
                $game->update([
                    'id' => $gameId, 
                    'modified_at' => date('Y-m-d H:i:s')
                ]);
                
                // Determine if this is a root text
                $isRoot = $textData['parent_id'] == '' ? true : false;
                
                // Create events for the note update
                $this->createEvents('NOTE_ADD', [
                    'textId' => $textId,
                    'gameId' => $gameId,
                    'title' => $textData['title'],
                    'isRoot' => $isRoot
                ], 'note_edit');
            }

            $this->sendJsonResponse($update, $update ? 'toast.text.note_success' : 'toast.text.note_failed', 'text');  
            exit;
        }else{
            // Your validation may change the status, if the text isn't instaPublish ready
            $status = $this->validateText($input, $isRoot, $status);
        }

        // Check if validation returned an error structure
        if (is_array($status) && isset($status['status']) && $status['status'] === 'error') {
            $this->sendJsonResponse(false, 'toast.text.validation_failed', ['errors' => $status['errors']]);
            exit;
        }

        // Root texts need to update the game prompt
        if ($isRoot) {
            $game->update([
                'id' => $gameId, 
                'prompt' => $input['prompt']
            ]);
        }

        // you'll need the text-status-id in order to save the text
        $textStatus = new TextStatus;
        $input['status_id'] = $textStatus->selectStatus($status);

        //get the new keywords from POST
        $keywords = $input['keywords'];

        //get the previous keywords from POST
        $lastKeywords = $input['lastKeywords'];

        // TODO: HERE might be where you add a "current_activity" table entry... 
        $newText = [
            'id' => $textId,
            'status_id' => $input['status_id'],
            'writing' => $input['writing'],
            'title' => $input['title'],
            'date' => date('Y-m-d H:i:s'),
            'modified_at' => date('Y-m-d H:i:s')
        ];

        $update = $text->update($newText);


        // If the publish was a success, add the player to the game
        // BUT only if they are not already in it
        if ($update && $status == 'published') { 
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

        // All updates (not only published) update the game's modified_at
        $game->update([
            'id' => $gameId, 
            'modified_at' => date('Y-m-d H:i:s')
        ]);


        // Using class Prep to prepare keywords arrays... 
        // Words come in as strings, come out a clean arrays
        $cleanedKeywords = $prep->keywords($keywords);
        $cleanedLastKeywords = $prep->keywords($lastKeywords);
        $wordsToCheck = array_diff($cleanedLastKeywords, $cleanedKeywords);

        //each keyword needs to be treated:
        foreach ($cleanedKeywords as $word) {
            // They have been cleaned of spaces in Prep
            //$assArr = ['word' => trim($word)];
            $assArr = ['word' => $word];

            // Inserted into the keywords table, (if it isn't already there)
            $keyword->insert($assArr, true);

            // We need that keyword's id: but we must remember that it comes as an array
            $keywordIdFromInsert = $keyword->selectWordId($assArr);

            // With that id, we can build an associative array to send to text_has_keyword
            $textHasKeywordArray = ['text_id' => $input['id'], 'keyword_id' => $keywordIdFromInsert['id']];

            // Now we can insert this keyword into text_has_keyword
            $textHasKeyword->insertTextHasKeyWord($textHasKeywordArray);
        }

        // Earlier, previous keywords was compared to current keywords 
        // The difference was placed in $wordsToCheck
        if(isset($wordsToCheck) && !empty($wordsToCheck)){
            foreach($wordsToCheck as $word){
                // Delete text_has_id lines for keywords no longer used
                $textHasKeyword->deleteTextHasKeyword($word, $input['id']);

                // Get an associative array with the whole keyword line
                $keywordInfos = $keyword->selectId($word, 'word');

                // With the id, check if the key is being used elsewhere, if not, delete from keywords
                $keyword->deleteUnusedKeywords($keywordInfos['id']);
            }   
        }

        // Final events and messages
        if ($status == "published"){
            // Create events for the published text
            $eventType = $isRoot ? 'ROOT_PUBLISH' : 'CONTRIB_PUBLISH';
            $this->createEvents($eventType, [
                'textId' => $textId,
                'gameId' => $gameId,
                'title' => $input['title'],
                'isRoot' => $isRoot
            ], 'update');

            // Send a success message
            $this->sendJsonResponse(true, 'toast.text.publish_success', 'text');
        }else{
            // give a "autosaved" message if it's an autosave
            if( $autoSaveInput !== null){
                $this->sendJsonResponse(true, 'toast.text.auto_success');
            }else{
                $this->sendJsonResponse(true, 'toast.text.success');
            }
        }
    }

    public function softDelete(){
        // TODO: implement softDelete

        // there needs to be a way to "delete" offensive or inappropriate texts

        // this would be different from the delete that a writer can apply to a draft... that basically clears it from the database. 
    }


    // Deletes a text from the database
    public function delete(){
        // No access if you are not logged in
        CheckSession::sessionAuth();

        $currentWriterId = $_SESSION['writer_id'];
        $textId = $_POST['id']; 


        //$insta = isset($_POST['insta']) && $_POST['insta'] === '1';
        $text = new Text;
        $keyword = new Keyword;
        $textHasKeyword = new TextHasKeyword;

        $textData = $text->selectTexts($currentWriterId, $textId);

        $this->addPermissions($textData, $currentWriterId);
        $isRoot = $textData['parent_id'] == '' ? true : false;

        // Check user's permission to edit (myText && openForChanges)
        if (!Permissions::canDelete($textData, $currentWriterId)) {
            $this->sendJsonResponse(false, 'toast.text.permission_denied_delete');
            exit();
        }

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
                    //error_log("Failed to delete unused keyword: " . $value["keyword_id"]);
                }
            }
        }

        // in order to be able to delete, you need to delete the "seens" that reference this id
        $seen = new Seen;
        // Directly delete all entries in the `seen` table that reference this text
        $seen->deleteById($textId);

        // If the text deleted is a root, remove the reference to it in the game
        if($isRoot){
            $game = new Game;
            // Update the game to remove the reference to this text
            $game->update(['id' => $textData['game_id'], 'root_text_id' => null]);
        }

        // Now that the game (if this is a root) doesn't reference this text, you can delete it
        $response = $text->delete($textId);

        if ($response && $isRoot) {
            // If delete text worked now we can safely delete the game
            $game->delete($textData['game_id']);
        }elseif(!$response && $isRoot){
            // If it failed, update the game to re-add the reference to this text
            $game->update(['id' => $textData['game_id'], 'root_text_id' => $textId]);
        }

        if ($response !== true) {
            $this->sendJsonResponse(false, 'toast.text.delete_failed');
        } else {
            $this->sendJsonResponse(true, 'toast.text.delete_success', 'text');
        } 
    }


    // Like show and edit, it presents a filled-out form with the text to be iterated
    public function iterate(){
        // No access if you are not logged in
        CheckSession::sessionAuth();

        // Recuperate the text, and the keywords associated to it
        $text = new Text;
        $currentWriterId = $_SESSION['writer_id'];
        $parentId = $_POST['id'];
        $parentData = $text->selectTexts($currentWriterId, $parentId);

        // Add permissions to the retrieved data
        $this->addPermissions($parentData, $currentWriterId);

        // Check user's permission to iterate (myText && openForChange && !isDraft)
        if (!Permissions::canIterate($parentData, $currentWriterId)) {
            Twig::render('home-error.php', ['message'=> "error.permission_denied_iterate"]);
            exit();
        }

        $keywords = $text->selectKeyword($parentId);

        // Prepare the keywords string
        $keywordString = "";
        foreach ($keywords as $key => $value) {
            $keywordString .= $value.", ";
        }
        $cleanKeywordString= trim($keywordString, ", ");

        // Create a data array that will send the values to the page legibly...
        $textData["keywords"] = $cleanKeywordString;
        // To deal with the parent title, parent writing and the title and writing of the iteration separately
        $textData["parentTitle"] = $parentData["title"];
        $textData["parentWriting"] = $parentData["writing"];
        $textData["title"] = "";

        //adding the following might make things clearer
        $textData["parent_id"] = $parentData["id"];

        $data = [
            'parent_id' => $parentId,
            'parentFirstName' => $parentData['firstName'],
            'parentLastName' => $parentData['lastName'],
            'parentTitle' => $parentData['title'],
            'parentWriting' => $parentData['writing'],
            'game_id' => $parentData['game_id'],
            'title' => '',
            'writing' => $parentData['writing'],
            'keywords' => $cleanKeywordString,
            'prompt' => $parentData['prompt'],
            'game_title' => $parentData['game_title']
        ];

        // Send it all to the form
        Twig::render('text-create.php', ['data' => $data]);
    }

    // Validate the text data 
    // The $autosave parameter is to check if the data is being sent via an api fetch or if it's a form submission
    private function validateText($data, $isRoot, $intended_status, $autoSave = false){
        RequirePage::library('Validation');
        $val = new Validation;

        // Debug initial status
        error_log("validateText called with intended_status: " . $intended_status);

        // Create clean versions of rich text fields for validation
        $cleanWriting = strip_tags($data["writing"]);
        $cleanParentWriting = isset($data['parentWriting']) ? strip_tags($data['parentWriting']) : '';
        if ($isRoot) {
            $cleanPrompt = strip_tags($data["prompt"]);
        }

        // Basic validation for all texts (including incomplete drafts)
        $val->name('writing')->value($data["writing"])->max(16777215); // MEDIUMTEXT max length
        $val->name('title')->value($data["title"])->max(100);
        $val->name('keywords')->value($data["keywords"])->max(255); // Allow for multiple keywords

        if ($isRoot) {
            $val->name('prompt')->value($cleanPrompt)->max(500);
        }

        // Check if basic validation passes
        if (!$val->isSuccess()) {
            // Return validation errors in a structured format
            return [
                'status' => 'error',
                'errors' => $val->getErrors()
            ];
        }

        // Stricter validation for publication AND/OR for autoPublish-ready drafts
        $val->name('keywords')->value($data["keywords"])->pattern('keywords')->keywordCount(3);

        if (!$isRoot) {
            // Iterations use a short title to describe changes to the parent text 
            $val->name('title')->value($data["title"])->required()->wordCount(3);
            $val->name('writing')->value($cleanWriting)->required()->differentFrom($cleanParentWriting)->wordCount(50, $cleanParentWriting);
        } else {
            $val->name('title')->value($data["title"])->required()->max(100);
            $val->name('writing')->value($cleanWriting)->required()->wordCount(50, "");
            $val->name('prompt')->value($cleanPrompt)->required()->max(500);
        }
        
        if ($val->isSuccess()) {
            return $intended_status; // Keep the intended status
        } else {
            if ($intended_status == 'draft') {
                return 'incomplete_draft';
            } else {
                // Return validation errors in a structured format
                return [
                    'status' => 'error',
                    'errors' => $val->getErrors()
                ];
            }
        }
    }

    public function validateNote($data){
        RequirePage::library('Validation');
        $val = new Validation;
        $cleanNote = strip_tags($data["note"]);
        $val->name('note')->value($cleanNote)->max(500)->wordCount(50);

        if($val->isSuccess()){
            // If this is successful, continue the code, so... do nothing
        }else{
            $errors = $val->displayErrors();
            // Send it to the form
            Twig::render($data["currentPage"], ['data' => $data, 'errors' => $errors]);
            exit();
        };
    }

    private function sendJsonResponse($success, $message, $additionalData = null) {
            // Clear any output that might have been sent before
        if (ob_get_length()) ob_clean();
        $response = [
            'success' => $success,
            'toastMessage' => $message,
            'toastType' => $success ? 'success' : 'error',
        ];

        if (is_array($additionalData)) {
            $response = array_merge($response, $additionalData);
        } elseif ($additionalData !== null) {
            $response['redirectUrl'] = $additionalData;
        }

        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    }

    public function searchNodes() {
        try {
            $searchTerm = $_GET['term'] ?? '';
            $rootStoryId = $_GET['rootStoryId'] ?? null;
            $text = new Text();

            // Get the game ID from the rootStoryId
            $gameId = $text->selectGameId($rootStoryId);

            // Search nodes by term, game ID, and text status
            $results = $text->searchNodesByTerm($searchTerm, $gameId, $_SESSION['writer_id'] ?? null);

            // Debugging: Use var_dump or print_r instead of echo
/*             error_log("Results: " . print_r($results, true)); */

            header('Content-Type: application/json');
            echo json_encode($results);
        } catch (Exception $e) {
            error_log('Error in searchNodes: ' . $e->getMessage());
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => $e->getMessage()]);
        }
        exit;
    }
}

?>