<?php
// to show errors on the page?
// error_reporting(E_ALL);
// ini_set('display_errors', '2');

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use PHPMailer\PHPMailer\SMTP;

// Define ROOT_DIR if not already defined
if (!defined('ROOT_DIR')) {
    define('ROOT_DIR', dirname(__DIR__));
}

require ROOT_DIR . '/vendor/autoload.php';

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
        // Check if we should queue emails (production environment)
        if ($this->shouldQueueEmails()) {
            return $this->queueEmail($to, $name, $subject, $message);
        }
        
        // Send immediately (local development)
        return $this->sendImmediate($to, $name, $subject, $message);
    }

    /**
     * Send an email using translation keys (recommended for queuing)
     * 
     * @param string $to Recipient email address
     * @param string $name Recipient name
     * @param string $subjectKey Translation key for subject
     * @param string $messageKey Translation key for message
     * @param array $subjectParams Parameters for subject translation
     * @param array $messageParams Parameters for message translation
     * @return bool True if email sent successfully, false otherwise
     */
    public function sendWithKeys($to, $name, $subjectKey, $messageKey, $subjectParams = [], $messageParams = []) {
        // Check if we should queue emails (production environment)
        if ($this->shouldQueueEmails()) {
            return $this->queueEmailWithKeys($to, $name, $subjectKey, $messageKey, $subjectParams, $messageParams);
        }
        
        // Send immediately (local development)
        return $this->sendImmediateWithKeys($to, $name, $subjectKey, $messageKey, $subjectParams, $messageParams);
    }

    /**
     * Send email immediately (bypass queue)
     * 
     * @param string $to Recipient email address
     * @param string $name Recipient name
     * @param string $subject Email subject
     * @param string $message Email message (HTML)
     * @return bool True if email sent successfully, false otherwise
     */
    public function sendImmediate($to, $name, $subject, $message) {
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

    /**
     * Queue an email for later sending
     * 
     * @param string $to Recipient email address
     * @param string $name Recipient name
     * @param string $subject Email subject
     * @param string $message Email message (HTML)
     * @return bool True if email queued successfully, false otherwise
     */
    public function queueEmail($to, $name, $subject, $message) {
        try {
            // Extract message key and parameters from the message
            $messageKey = $this->extractMessageKey($message);
            $messageParams = $this->extractMessageParams($message);
            
            // Load EmailQueue model
            require_once(__DIR__ . '/../model/EmailQueue.php');
            $emailQueue = new EmailQueue();
            
            $emailData = [
                'recipient_email' => $to,
                'recipient_name' => $name,
                'subject' => $subject,
                'message_key' => $messageKey,
                'message_params' => json_encode($messageParams),
                'status' => 'pending',
                'attempts' => 0,
                'max_attempts' => 3
            ];
            
            $result = $emailQueue->insert($emailData);
            
            if (is_numeric($result)) {
                error_log("Email queued successfully: ID $result to $to");
                return true;
            } else {
                error_log("Failed to queue email to $to: " . json_encode($result));
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Error queuing email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Determine if emails should be queued based on environment
     * 
     * @return bool True if emails should be queued
     */
    private function shouldQueueEmails() {
        // Check for environment variable
        if (isset($_ENV['EMAIL_QUEUE_ENABLED'])) {
            return filter_var($_ENV['EMAIL_QUEUE_ENABLED'], FILTER_VALIDATE_BOOLEAN);
        }
        
        // Check for production environment indicators
        $productionIndicators = [
            'production' => $_ENV['APP_ENV'] ?? null,
            'server_name' => $_SERVER['SERVER_NAME'] ?? null,
            'http_host' => $_SERVER['HTTP_HOST'] ?? null
        ];
        
        foreach ($productionIndicators as $key => $value) {
            if ($value && (
                strpos(strtolower($value), 'prod') !== false ||
                strpos(strtolower($value), 'live') !== false ||
                strpos(strtolower($value), 'yourdomain.com') !== false
            )) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Extract message key from translated message
     * This is a simple implementation - you may need to enhance this
     * 
     * @param string $message The translated message
     * @return string Message key (defaults to 'custom_message')
     */
    private function extractMessageKey($message) {
        // For now, return a default key
        // In a more sophisticated system, you might store the original key
        return 'custom_message';
    }

    /**
     * Send email immediately using translation keys
     * 
     * @param string $to Recipient email address
     * @param string $name Recipient name
     * @param string $subjectKey Translation key for subject
     * @param string $messageKey Translation key for message
     * @param array $subjectParams Parameters for subject translation
     * @param array $messageParams Parameters for message translation
     * @return bool True if email sent successfully, false otherwise
     */
    public function sendImmediateWithKeys($to, $name, $subjectKey, $messageKey, $subjectParams = [], $messageParams = []) {
        // Load translation function
        if (!function_exists('translate')) {
            require_once(__DIR__ . '/languages.php');
        }
        
        $subject = translate($subjectKey, $subjectParams);
        $message = translate($messageKey, $messageParams);
        
        return $this->sendImmediate($to, $name, $subject, $message);
    }

    /**
     * Queue an email using translation keys
     * 
     * @param string $to Recipient email address
     * @param string $name Recipient name
     * @param string $subjectKey Translation key for subject
     * @param string $messageKey Translation key for message
     * @param array $subjectParams Parameters for subject translation
     * @param array $messageParams Parameters for message translation
     * @return bool True if email queued successfully, false otherwise
     */
    public function queueEmailWithKeys($to, $name, $subjectKey, $messageKey, $subjectParams = [], $messageParams = []) {
        try {
            // Load EmailQueue model
            require_once(__DIR__ . '/../model/EmailQueue.php');
            $emailQueue = new EmailQueue();
            
            $emailData = [
                'recipient_email' => $to,
                'recipient_name' => $name,
                'subject' => $subjectKey,
                'subject_params' => json_encode($subjectParams),
                'message_key' => $messageKey,
                'message_params' => json_encode($messageParams),
                'status' => 'pending',
                'attempts' => 0,
                'max_attempts' => 3
            ];
            
            $result = $emailQueue->insert($emailData);
            
            if (is_numeric($result)) {
                error_log("Email queued successfully: ID $result to $to");
                return true;
            } else {
                error_log("Failed to queue email to $to: " . json_encode($result));
                return false;
            }
            
        } catch (Exception $e) {
            error_log("Error queuing email: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Extract message parameters from translated message
     * This is a simple implementation - you may need to enhance this
     * 
     * @param string $message The translated message
     * @return array Message parameters
     */
    private function extractMessageParams($message) {
        // For now, return empty array
        // In a more sophisticated system, you might extract parameters
        return [];
    }

    private function logError($error) {
        file_put_contents('email_error.log', date("Y-m-d h:i:sa") . " - " . $error . "\n", FILE_APPEND);
    }
}
?>
