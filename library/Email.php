<?php
// to show errors on the page?
// error_reporting(E_ALL);
// ini_set('display_errors', '2');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

require 'vendor/autoload.php';

class Email {

    private $mail;
    
    public function __construct() {
        $this->mail = new PHPMailer(true);
        
        // Server settings
        $this->mail->isSMTP();
        $this->mail->Host = $_ENV['SMTP_HOST'];
        $this->mail->SMTPAuth = true;
        $this->mail->Username = $_ENV['SMTP_USERNAME'];
        $this->mail->Password = $_ENV['SMTP_PASSWORD'];
        $this->mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
        $this->mail->Port = $_ENV['SMTP_PORT'];
        
        // Enable debug output
        $this->mail->SMTPDebug = SMTP::DEBUG_SERVER;
        $this->mail->Debugoutput = function($str, $level) {
            error_log("PHPMailer Debug: $str");
            $this->logError("PHPMailer Debug: $str");
        };
        
        // Set sender
        $this->mail->setFrom($_ENV['SMTP_USERNAME'], 'Tag You Write'); // Use the authenticated email as sender
        
        // Set character encoding to UTF-8
        $this->mail->CharSet = 'UTF-8';
        $this->mail->Encoding = 'base64';
    }
    
    /**
     * Send an email with custom subject and message
     * 
     * @param string $to Recipient email address
     * @param string $name Recipient name
     * @param string $subject Email subject
     * @param string $message Email message (HTML)
     * @return bool True if email sent successfully, false otherwise
     */
    public function send($to, $name, $subject, $message) {
        try {
            $this->mail->clearAddresses(); // Clear any previously set addresses
            $this->mail->addAddress($to, $name);
            $this->mail->isHTML(true);
            $this->mail->Subject = $subject;
            $this->mail->Body = $message;
            $this->mail->AltBody = strip_tags($message);
            
            return $this->mail->send();
        } catch (Exception $e) {
            $errorMessage = "Email error: " . $e->getMessage();
            error_log($errorMessage);
            $this->logError($errorMessage);
            // Return false instead of throwing an exception
            return false;
        }
    }

    private function logError($error) {
        file_put_contents('email_error.log', date("Y-m-d h:i:sa") . " - " . $error . "\n", FILE_APPEND);
    }
}
?>
