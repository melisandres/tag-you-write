<?php

RequirePage::model('Writer');
RequirePage::model('Privilege');
RequirePage::library('Email');

class ControllerWriter extends Controller{

    public function index(){
        //block access to guests... 
        CheckSession::sessionAuth();

        $writer = new Writer;
        $select = $writer->select();
        $notifications = $this->getNotifications();
        Twig::render('writer-index.php', [
            'writers'=>$select,
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }

    public function create(){
        //this should not be available if you 
        //are logged in already
        //TODO: check if this is the best way to check...
        //you could build another CheckSession::sessionAuth, that
        //basically does the opposite... it would live better there.
        if(isSet($_SESSION['fingerPrint'])){
            $notifications = $this->getNotifications();
            Twig::render('home-error.php', [
                'message'=> "error.already_logged_in",
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
            return;
        }

        $privilege = new Privilege;
        $select = $privilege->select();
        $notifications = $this->getNotifications();

        Twig::render('writer-create.php', [
            'privilege' => $select,
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }

    public function store(){
        // Security: Privilege is now hardcoded to beta_tester for new registrations -- this is for the length of the beta testing period
        // Any privilege_id in POST is removed to prevent privilege escalation
        $privileges = '';
        $errors = "";

        $response = [
            'success' => false,
            'message' => '',
        ];

        //block access without a post... 
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            $response['message'] = 'error.invalid_request_method';
            echo json_encode($response);
            exit();
        }

        //this should not be available if you 
        //are logged in already
        if(isSet($_SESSION['fingerPrint'])){
            $response['message'] = "error.already_logged_in";
            echo json_encode($response);
            exit();
        }

        try{
            $this->validateWriter($_POST);
            extract($_POST);
            unset($_POST['currentPage']);

            //check if the user exists already
            $writer = new Writer;
            $answer = $writer->selectId($email, "email");

            //I'm confused... maybe this was the begining of a solution that was not well implemented? 
            if($answer){
                $response['message'] = "error.already_registered";
                echo json_encode($response);
                exit();
            }

            // Get beta_tester privilege ID by querying the privilege column
            // TODO: this will need to be changed when the beta testing period ends
            $privilege = new Privilege;
            $betaTesterPrivilege = $privilege->selectId('beta_tester', 'privilege');
            
            if (!$betaTesterPrivilege) {
                // Fallback: if beta_tester doesn't exist, log error and use default privilege 2
                error_log("Warning: beta_tester privilege not found in database. Using what is the beta tester privilege id in the database (4).");
                $betaTesterId = 4;
            } else {
                $betaTesterId = $betaTesterPrivilege['id'];
            }

            // Always set privilege_id to beta_tester for new account registrations
            // (ignoring any value that might have been sent in POST)
            $_POST['privilege_id'] = $betaTesterId;

            $writer = new Writer;
            $options =[
                'cost'=>10,
            ];
            $passwordHash = password_hash($password, PASSWORD_BCRYPT, $options);
            $_POST['password']= $passwordHash;

            $insert = $writer->insert($_POST);

            //it's easier to put it here
            //for now
            if($insert) {
                $_SESSION['writer_id'] = $insert;
                $_SESSION['privilege'] = $betaTesterId;
                $_SESSION['fingerPrint'] = md5($_SERVER['HTTP_USER_AGENT'].$_SERVER['REMOTE_ADDR']);
                $_SESSION['writer_firstName'] = $firstName;
                $_SESSION['writer_lastName'] = $lastName;
                $_SESSION['writer_userName'] = $email;
            
                // Process any stored invitation tokens
                if (isset($_SESSION['game_invitation_access']) && !empty($_SESSION['game_invitation_access'])) {
                    RequirePage::controller('ControllerGameInvitation');
                    $invitationController = new ControllerGameInvitation();
                    $result = $invitationController->processLoggedInInvitation(null, 'account_creation'); // No token needed - uses session
                    
                    // Store pending confirmations in session for frontend to handle
                    if ($result['success'] && !empty($result['pendingConfirmations'])) {
                        $_SESSION['pending_invitation_confirmations'] = $result['pendingConfirmations'];
                    }
                }
            
                // Write and close session immediately
                session_write_close();

                $response['success'] = true;
                $response['message'] = 'auth.account_created';
                echo json_encode($response);

                // Send email after response is sent
                $email = new Email;
                $name = $firstName . " " .$lastName;
                
                // Use the new sendWithKeys method for better queuing support
                $email->sendWithKeys(
                    $_POST['email'], 
                    $name, 
                    'auth.account_created_email.email_title',
                    'auth.account_created_email.email_message', 
                    [], 
                    ['name' => $name]
                );
                exit();
            }
        } catch (Exception $e) {    
            $response['message'] = $e->getMessage();
        }
        echo json_encode($response);
        exit();
    }

    public function show($id = null){
        $writer = new Writer;
        $selectId = $writer->selectId($id);

        //error page if id doesn't exist, or if it's null
        if($id == null || !$selectId){
            $notifications = $this->getNotifications();
            Twig::render('home-error.php', [
                'message'=> "error.something_went_wrong",
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
        }else{
            $notifications = $this->getNotifications();
            Twig::render('writer-show.php', [
                'writer' => $selectId,
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
        }
    }

    public function edit(){
        //check if the writer is logged in
        CheckSession::sessionAuth();

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            //if logged in, direct to texts..
            RequirePage::redirect('writer');
            exit();
        }
        $privilege = new Privilege;
        $select = $privilege->select();
        $writer = new Writer;
        $selectId = $writer->selectId($_POST['id']);
        $notifications = $this->getNotifications();
        Twig::render('writer-edit.php', [
            'data' => $selectId, 
            'privilege' => $select,
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }

    public function update(){
        //only available to admins 1
        //and to the person who's id matches the writer-id
        if($_SESSION['writer_id'] != $_POST['id'] && $_SESSION['privilege'] != 1 ){
            Twig::render('home-index.php');
            exit();
        }

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('writer');
            exit();
        }

        //validate
        $this->validateWriter($_POST);

        //clean the $_POST for the update
        unset($_POST['currentPage']);
        $writer = new Writer;
        $update = $writer->update($_POST);
        $id = $_POST['id'];
        RequirePage::redirect('writer/show/'.$id);
    }

    public function destroy(){
        //only available to admins 1
        //and to the person who's id matches the writer-id
        if($_SESSION['writer_id']  !== $_POST['id'] && $_SESSION['privilege'] !== 1 ){
            RequirePage::redirect('writer');
            exit();
        }

        //make sure the page is being accessed with a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('writer');
            exit();
        }
        
        $writer = new Writer;
        $delete = $writer->delete($_POST['id']);
        $id = $_SESSION['writer_id'];
        if($delete){
            if($_POST['id'] == $id){
                session_destroy();
                RequirePage::redirect('login');
                exit();
            }
            RequirePage::redirect('writer');
        }else{
            //TODO: when I revisit this and implement a soft delete, I'll need to translate this. 
            Twig::render('home-error.php', ['message'=> "To delete this writer, you must first delete all their texts--which will only be possible if no one has iterated on them. We would recommend you deactivate this account instead, but we have not yet implemented this functionality. Sorry."]);
        }
    }

    /**
     * Get current user's email for contact form auto-fill
     * Returns JSON with email if logged in, error if not
     */
    public function getCurrentUserEmail() {
        // Check if user is logged in
        if (!isset($_SESSION['writer_id'])) {
            header('Content-Type: application/json');
            http_response_code(401);
            echo json_encode([
                'success' => false,
                'error' => 'User not authenticated'
            ]);
            return;
        }

        try {
            $writer = new Writer();
            $writerData = $writer->selectId($_SESSION['writer_id']);
            
            if (!$writerData || !isset($writerData['email'])) {
                header('Content-Type: application/json');
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'error' => 'User email not found'
                ]);
                return;
            }

            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'email' => $writerData['email']
            ]);
        } catch (Exception $e) {
            error_log('Error in getCurrentUserEmail: ' . $e->getMessage());
            header('Content-Type: application/json');
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'error' => 'Failed to fetch user email'
            ]);
        }
    }

    public function validateWriter($data, $password="default"){
        extract($data);

        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('firstName')->value($firstName)->required()->max(45)->pattern('words');
        $val->name('lastName')->value($lastName)->required()->max(45)->pattern('words');
        $val->name('email')->value($email)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->required()->min(6)->max(20);
        //TODO: put a db default value so that you don't need to put it required
        $val->name('birthday')->value($birthday)->required();

        if($val->isSuccess()){
            return true;
        }else{
            throw new Exception($val->displayErrors());
            // $errors = $val->displayErrors();
            // //why are privilges being accessed here?
            // $privilege = new Privilege;
            // $privileges = $privilege->select();
            // Twig::render($currentPage, ['privilege' => $privileges, 'errors' => $errors, 'data' => $_POST]);
            // exit();
        };
    }

}

?>