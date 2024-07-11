<?php
// to show errors on the page?
// error_reporting(E_ALL);
// ini_set('display_errors', '2');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

require 'vendor/autoload.php';

class Email {
    public function welcome($email, $name, $subject, $message) {
        try {
            $mail = new PHPMailer(true); // Enable exceptions
            $mail->isSMTP();
            $mail->SMTPDebug = SMTP::DEBUG_SERVER;
            $mail->Host = 'mail.la-fin.org';
            $mail->Port = 465;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->SMTPAuth = true;
            $mail->Username = 'administration@la-fin.org';
            $mail->Password = 'mc454na#2'; // Make sure this is correct

            $mail->setFrom('administration@la-fin.org', 'M. Schofield');
            $mail->addReplyTo('melisandre.schofield@gmail.com', 'M. Schofield');
            $mail->addAddress($email, $name);
            $mail->Subject = $subject;
            $mail->msgHTML($message);
            $mail->AltBody = 'This is a plain-text message body';

            if (!$mail->send()) {
                $this->logError('Mailer Error: ' . $mail->ErrorInfo);
            } else {
                echo 'Message sent!';
            }
        } catch (Exception $e) {
            $this->logError('An exception occurred: ' . $e->getMessage());
        }
    }

    private function logError($error) {
        file_put_contents('email_error.log', date("Y-m-d h:i:sa") . " - " . $error . "\n", FILE_APPEND);
    }
}

// Example usage (uncomment to test)
// $emailInstance = new Email();
// $emailInstance->welcome('melisandreschofield@gmail.com');
?>

