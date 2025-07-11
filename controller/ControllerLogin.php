<?php
RequirePage::model('Writer');

class ControllerLogin extends Controller {

    public function index(){
        $notifications = $this->getNotifications();
        Twig::render('login.php', [
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
     }

    public function auth(){
        //this is to make sure there's a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('writer/create');
            exit();
        }

        // Check if request contains JSON
        $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
        
        if (strpos($contentType, 'application/json') !== false) {
            // Handle JSON input
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
            
            // Check for valid JSON
            if (json_last_error() !== JSON_ERROR_NONE) {
                $this->sendJsonResponse(false, 'auth.invalid_json');
                exit();
            }
            
            $email = $data['email'] ?? '';
            $password = $data['password'] ?? '';
        } else {
            // Handle form data from $_POST
            extract($_POST);
        }

        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('email')->value($email)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->min(6)->max(20);

        if($val->isSuccess()){
            $writer = new Writer;
            if($writer->checkWriter($email, $password)){
                // Process any stored invitation tokens
                if (isset($_SESSION['game_invitation_access']) && !empty($_SESSION['game_invitation_access'])) {
                    RequirePage::controller('ControllerGameInvitation');
                    $invitationController = new ControllerGameInvitation();
                    $result = $invitationController->processLoggedInInvitation(null, 'login'); // No token needed - uses session
                    
                    // Store pending confirmations in session for frontend to handle
                    if ($result['success'] && !empty($result['pendingConfirmations'])) {
                        $_SESSION['pending_invitation_confirmations'] = $result['pendingConfirmations'];
                    }
                }
                
                // For JSON requests, send JSON response
                if (strpos($contentType, 'application/json') !== false) {
                    $this->sendJsonResponse(true, 'auth.login_success', 'text');
                } else {
                    // For traditional form requests, redirect
                    RequirePage::redirect('text');
                }
            } else {
                if (strpos($contentType, 'application/json') !== false) {
                    $this->sendJsonResponse(false, 'auth.no_match');
                } else {
                    $notifications = $this->getNotifications();
                    Twig::render('login.php', [
                        "errors"=>"auth.no_match", 
                        "data"=>$_POST,
                        'notifications' => $notifications,
                        'notificationsData' => json_encode($notifications)
                    ]);
                }
            }
        } else {
            $errors = $val->displayErrors();
            if (strpos($contentType, 'application/json') !== false) {
                $this->sendJsonResponse(false, 'auth.validation_failed', ['errors' => $errors]);
            } else {
                $notifications = $this->getNotifications();
                Twig::render('login.php', [
                    'errors' => $errors, 
                    'data'=>$_POST,
                    'notifications' => $notifications,
                    'notificationsData' => json_encode($notifications)
                ]);
            }
        }
    }

    public function logout(){
        session_destroy();
        RequirePage::redirect('login');
    }

    public function forgotPassword() {
        $notifications = $this->getNotifications();
        Twig::render('forgot-password.php', [
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }
    
    public function sendResetLink() {
        if($_SERVER["REQUEST_METHOD"] !== "POST") {
            RequirePage::redirect('login/forgotPassword');
            exit();
        }

        // Check if request contains JSON
        $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
        
        if (strpos($contentType, 'application/json') !== false) {
            // Handle JSON input
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
            
            // Check for valid JSON
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("JSON decode error: " . json_last_error_msg());
                $this->sendJsonResponse(false, 'auth.password_reset.invalid_json');
                exit();
            }
            
            $email = $data['email'] ?? '';
            error_log("JSON data - email: " . (empty($email) ? 'empty' : $email));
        } else {
            // Handle form data from $_POST
            extract($_POST);
            error_log("POST data - email: " . (empty($email) ? 'empty' : $email));
        }

        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('email')->value($email)->pattern('email')->required();
    
        if($val->isSuccess()) {
            $writer = new Writer;
            $writerData = $writer->selectId($email, "email");
    
            if($writerData) {
                // Generate reset token
                $token = bin2hex(random_bytes(32));
                $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));
                
                // Store token in database
                $writer->update([
                    'id' => $writerData['id'],
                    'reset_token' => $token,
                    'reset_expiry' => $expiry
                ]);
    
                // Send email
                try {
                    RequirePage::library('Email');
                    $emailer = new Email;
                    
                    // Get translated email content
                    $subject = translate('auth.password_reset.email_title');
                    $message = translate('auth.password_reset.email_message');
                    $message .= RequirePage::getBaseUrl() . langUrl('login/resetPassword/' . $token);
                    
                    $emailer->welcome($email, $writerData['firstName'], $subject, $message);
                    
                    // Send appropriate response based on request type
                    if (strpos($contentType, 'application/json') !== false) {
                        $this->sendJsonResponse(true, 'auth.password_reset.email_sent');
                    } else {
                        $notifications = $this->getNotifications();
                        Twig::render('login.php', [
                            'message' => 'auth.password_reset.email_sent',
                            'notifications' => $notifications,
                            'notificationsData' => json_encode($notifications)
                        ]);
                    }
                } catch (Exception $e) {
                    error_log("Email sending error: " . $e->getMessage());
                    
                    // Still return success to the user, but log the error
                    if (strpos($contentType, 'application/json') !== false) {
                        $this->sendJsonResponse(true, 'auth.password_reset.email_sent');
                    } else {
                        $notifications = $this->getNotifications();
                        Twig::render('login.php', [
                            'message' => 'auth.password_reset.email_sent',
                            'notifications' => $notifications,
                            'notificationsData' => json_encode($notifications)
                        ]);
                    }
                }
            } else {
                if (strpos($contentType, 'application/json') !== false) {
                    $this->sendJsonResponse(false, 'auth.password_reset.email_not_found');
                } else {
                    $notifications = $this->getNotifications();
                    Twig::render('forgot-password.php', [
                        'errors' => 'auth.password_reset.email_not_found', 
                        'data' => $_POST,
                        'notifications' => $notifications,
                        'notificationsData' => json_encode($notifications)
                    ]);
                }
            }
        } else {
            $errors = $val->displayErrors();
            if (strpos($contentType, 'application/json') !== false) {
                $this->sendJsonResponse(false, 'auth.password_reset.validation_failed', ['errors' => $errors]);
            } else {
                $notifications = $this->getNotifications();
                Twig::render('forgot-password.php', [
                    'errors' => $errors, 
                    'data' => $_POST,
                    'notifications' => $notifications,
                    'notificationsData' => json_encode($notifications)
                ]);
            }
        }
    }
    
    public function resetPassword($token) {
        $writer = new Writer;
        $writerData = $writer->selectId($token, "reset_token");
    
        if(!$writerData || strtotime($writerData['reset_expiry']) < time()) {
            $notifications = $this->getNotifications();
            Twig::render('home-error.php', [
                'message' => 'auth.password_reset.invalid_or_expired_reset_link',
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
            return;
        }
    
        $notifications = $this->getNotifications();
        Twig::render('reset-password.php', [
            'token' => $token,
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }
    
    public function updatePassword() {
        if($_SERVER["REQUEST_METHOD"] !== "POST") {
            RequirePage::redirect('login');
            exit();
        }

        // Check if request contains JSON
        $contentType = isset($_SERVER["CONTENT_TYPE"]) ? $_SERVER["CONTENT_TYPE"] : '';
        
        if (strpos($contentType, 'application/json') !== false) {
            // Handle JSON input
            $jsonInput = file_get_contents('php://input');
            $data = json_decode($jsonInput, true);
            
            // Check for valid JSON
            if (json_last_error() !== JSON_ERROR_NONE) {
                error_log("JSON decode error: " . json_last_error_msg());
                $this->sendJsonResponse(false, 'auth.password_reset.invalid_json');
                exit();
            }
            
            $password = $data['password'] ?? '';
            $token = $data['token'] ?? '';
            
            error_log("JSON data - password: " . (empty($password) ? 'empty' : 'set') . ", token: " . (empty($token) ? 'empty' : 'set'));
        } else {
            // Handle form data from $_POST
            extract($_POST);
            error_log("POST data - password: " . (empty($password) ? 'empty' : 'set') . ", token: " . (empty($token) ? 'empty' : 'set'));
        }

        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('password')->value($password)->pattern('alphanum')->required()->min(6)->max(20);
    
        if($val->isSuccess()) {
            $writer = new Writer;
            $writerData = $writer->selectId($token, "reset_token");
    
            if($writerData) {
                $options = ['cost' => 10];
                $passwordHash = password_hash($password, PASSWORD_BCRYPT, $options);
    
                $writer->update([
                    'id' => $writerData['id'],
                    'password' => $passwordHash,
                    'reset_token' => null,
                    'reset_expiry' => null
                ]);

                // Properly log in the user - match all required session variables
                session_regenerate_id();
                $_SESSION['writer_id'] = $writerData['id'];
                $_SESSION['privilege'] = $writerData['privilege_id'] ?? 2; // Default to normal user if not set
                $_SESSION['writer_firstName'] = $writerData['firstName'];
                $_SESSION['writer_lastName'] = $writerData['lastName'];
                $_SESSION['writer_userName'] = $writerData['email'];
                $_SESSION['fingerPrint'] = md5($_SERVER['HTTP_USER_AGENT'].$_SERVER['REMOTE_ADDR']);
                
                // Process any stored invitation tokens
                if (isset($_SESSION['game_invitation_access']) && !empty($_SESSION['game_invitation_access'])) {
                    RequirePage::controller('ControllerGameInvitation');
                    $invitationController = new ControllerGameInvitation();
                    $result = $invitationController->processLoggedInInvitation(null, 'password_reset'); // No token needed - uses session
                    
                    // Store pending confirmations in session for frontend to handle
                    if ($result['success'] && !empty($result['pendingConfirmations'])) {
                        $_SESSION['pending_invitation_confirmations'] = $result['pendingConfirmations'];
                    }
                }
                
                // Send JSON response (similar to ControllerText)
                $this->sendJsonResponse(true, 'auth.password_reset.password_updated', 'text');
            } else {
                $this->sendJsonResponse(false, 'auth.password_reset.invalid_token');
            }
        } else {
            $errors = $val->displayErrors();
            $this->sendJsonResponse(false, 'auth.password_reset.validation_failed', ['errors' => $errors]);
        }
    }

/*     // Add the sendJsonResponse method from ControllerText
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
            // Just pass the simple page name - don't add language prefix
            // This matches how ControllerText handles redirects
            $response['redirectUrl'] = $additionalData;
        }

        error_log("Sending JSON response: " . json_encode($response));
        
        header('Content-Type: application/json');
        echo json_encode($response);
        exit;
    } */
}

?>