<?php
    error_reporting(E_ALL);
    ini_set('display_errors', '1');

    use PHPMailer\PHPMailer\PHPMailer;
    use PHPMailer\PHPMailer\Exception;
    use PHPMailer\PHPMailer\SMTP;

    require 'vendor/autoload.php';


 Class Email{

    public function welcome($email){
        try {
            //Create a new PHPMailer instance
            $mail = new PHPMailer();
            //Tell PHPMailer to use SMTP
            $mail->isSMTP();
            //Enable SMTP debugging
            //SMTP::DEBUG_OFF = off (for production use)
            //SMTP::DEBUG_CLIENT = client messages
            //SMTP::DEBUG_SERVER = client and server messages
            $mail->SMTPDebug = SMTP::DEBUG_SERVER;
            //Set the hostname of the mail server
            $mail->Host = 'smtp.gmail.com';
            //Use `$mail->Host = gethostbyname('smtp.gmail.com');`
            //if your network does not support SMTP over IPv6,
            //though this may cause issues with TLS
            //Set the SMTP port number:
            // - 465 for SMTP with implicit TLS, a.k.a. RFC8314 SMTPS or
            // - 587 for SMTP+STARTTLS
            $mail->Port = 465;
            //Set the encryption mechanism to use:
            // - SMTPS (implicit TLS on port 465) or
            // - STARTTLS (explicit TLS on port 587)
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            //Whether to use SMTP authentication
            $mail->SMTPAuth = true;
            //Username to use for SMTP authentication - use full email address for gmail
            $mail->Username = 'melisandre.schofield@gmail.com';
            //Password to use for SMTP authentication
            $mail->Password = 'exxg qnbp xemp knpp';//add in the final
            //'exxg qnbp xemp knpp';

            //Set who the message is to be sent from
            //Note that with gmail you can only use your account address (same as `Username`)
            //or predefined aliases that you have configured within your account.
            //Do not use user-submitted addresses in here
            $mail->setFrom('melisandre.schofield@gmail.com', 'Melisandre Schofield');

            //Set an alternative reply-to address
            //This is a good place to put user-submitted addresses
            $mail->addReplyTo($email, 'Forever Friend');

            //Set who the message is to be sent to
            $mail->addAddress($email, 'Forever Friend');
            //Set the subject line
            $mail->Subject = 'Welcome to the Tag You Write family';

            //Read an HTML message body from an external file, convert referenced images to embedded,
            //convert HTML into a basic plain-text alternative body
            $mail->msgHTML("Welcome! Welcome! This is an experiment, and I'm so happy you can join us! If you have any issues with your account, or any feedback, please message me at this address, and I will be happy to respond to you, reset your account, ");

            //Replace the plain text body with one created manually
            $mail->AltBody = 'This is a plain-text message body';

            //Attach an image file
            //$mail->addAttachment('images/phpmailer_mini.png');

            //send the message, check for errors
            if (!$mail->send()) {
                echo 'Mailer Error: ' . $mail->ErrorInfo;
            } else {
                echo 'Message sent!';
                //Section 2: IMAP
                //Uncomment these to save your message in the 'Sent Mail' folder.
                #if (save_mail($mail)) {
                #    echo "Message saved!";
                #}
            }
 
        } catch (Exception $e) {
            echo 'An exception occurred: ' . $e->getMessage();
            // Log the exception to a file for further investigation
            file_put_contents('email_error.log', 'Exception: ' . $e->getMessage(), FILE_APPEND);

            echo 'Email not sent. Error: ' . $mail->ErrorInfo;
        }
    }
}



?>