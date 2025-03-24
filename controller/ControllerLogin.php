<?php
RequirePage::model('Writer');

class ControllerLogin extends Controller {

    public function index(){
        Twig::render('login.php');
     }

    public function auth(){
        //this is to make sure there's a post...
        if($_SERVER["REQUEST_METHOD"] !== "POST"){
            RequirePage::redirect('writer/create');
            exit();
        }


        extract($_POST);
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('email')->value($email)->pattern('email')->required()->max(50);
        $val->name('password')->value($password)->pattern('alphanum')->min(6)->max(20);



        if($val->isSuccess()){
            $writer = new Writer;
            if($writer->checkWriter($email, $password)){
                RequirePage::redirect('text');
            }else{
                Twig::render('login.php', ["errors"=>"auth.no_match", "data"=>$_POST]);
            }

            //RequirePage::redirect('user/create');
        }else{
            $errors = $val->displayErrors();
            Twig::render('login.php', ['errors' => $errors, 'data'=>$_POST]);
        };
    }

    public function logout(){
        session_destroy();
        RequirePage::redirect('login');
    }

    public function forgotPassword() {
        Twig::render('forgot-password.php');
    }
    
    public function sendResetLink() {
        if($_SERVER["REQUEST_METHOD"] !== "POST") {
            RequirePage::redirect('login/forgotPassword');
            exit();
        }
    
        extract($_POST);
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
                RequirePage::library('Email');
                $emailer = new Email;
                
                // Get translated email content
                $subject = translate('auth.password_reset.email_title');
                $message = translate('auth.password_reset.email_message');
                $message .= RequirePage::getBaseUrl() . langUrl('login/resetPassword/' . $token);
                
                $emailer->welcome($email, $writerData['firstName'], $subject, $message);
                
                Twig::render('login.php', ['message' => 'auth.password_reset.email_sent']);
            } else {
                Twig::render('forgot-password.php', ['errors' => 'auth.password_reset.email_not_found', 'data' => $_POST]);
            }
        } else {
            $errors = $val->displayErrors();
            Twig::render('forgot-password.php', ['errors' => $errors, 'data' => $_POST]);
        }
    }
    
    public function resetPassword($token) {
        $writer = new Writer;
        $writerData = $writer->selectId($token, "reset_token");
    
        if(!$writerData || strtotime($writerData['reset_expiry']) < time()) {
            Twig::render('home-error.php', ['message' => 'auth.password_reset.invalid_or_expired_reset_link']);
            return;
        }
    
        Twig::render('reset-password.php', ['token' => $token]);
    }
    
    public function updatePassword() {
        if($_SERVER["REQUEST_METHOD"] !== "POST") {
            RequirePage::redirect('login');
            exit();
        }
    
        extract($_POST);
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
    
                Twig::render('login.php', ['message' => translate('auth.password_reset.password_updated')]);
            }
        } else {
            $errors = $val->displayErrors();
            Twig::render('reset-password.php', ['errors' => $errors, 'token' => $token]);
        }
    }
}

?>