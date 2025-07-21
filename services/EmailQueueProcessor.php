<?php
// Define ROOT_DIR if not already defined
if (!defined('ROOT_DIR')) {
    define('ROOT_DIR', dirname(__DIR__));
}

require_once(ROOT_DIR . '/model/EmailQueue.php');
require_once(ROOT_DIR . '/library/Email.php');
require_once(ROOT_DIR . '/library/languages.php');

/**
 * Email Queue Processor
 * 
 * This class processes queued emails. It's designed to be lean and efficient
 * for use with cron jobs. It should be called every minute in production.
 */
class EmailQueueProcessor {
    private $emailQueue;
    private $emailer;
    private $maxEmailsPerRun;
    private $isProduction;

    public function __construct($maxEmailsPerRun = 50) {
        $this->emailQueue = new EmailQueue();
        $this->emailer = new Email();
        $this->maxEmailsPerRun = $maxEmailsPerRun;
        
        // Determine if we're in production based on environment
        $this->isProduction = $this->isProductionEnvironment();
    }

    /**
     * Process pending emails
     * 
     * @return array Processing results
     */
    public function processPendingEmails() {
        $startTime = microtime(true);
        $processed = 0;
        $sent = 0;
        $failed = 0;
        $errors = [];

        try {
            // Get pending emails
            $pendingEmails = $this->emailQueue->getPendingEmails($this->maxEmailsPerRun);
            
            if (empty($pendingEmails)) {
                return [
                    'success' => true,
                    'message' => 'No pending emails to process',
                    'processed' => 0,
                    'sent' => 0,
                    'failed' => 0,
                    'duration' => round((microtime(true) - $startTime) * 1000, 2)
                ];
            }

            foreach ($pendingEmails as $email) {
                $processed++;
                
                try {
                    // Prepare message parameters
                    $messageParams = [];
                    if ($email['message_params']) {
                        $messageParams = json_decode($email['message_params'], true) ?: [];
                    }

                    // Prepare subject parameters
                    $subjectParams = [];
                    if ($email['subject_params']) {
                        $subjectParams = json_decode($email['subject_params'], true) ?: [];
                    }

                    // Get translated subject and message
                    $subject = translate($email['subject'], $subjectParams);
                    $message = translate($email['message_key'], $messageParams);
                    
                    // Send email
                    if ($this->emailer->sendImmediate(
                        $email['recipient_email'],
                        $email['recipient_name'],
                        $subject,
                        $message
                    )) {
                        // Mark as sent
                        $this->emailQueue->markAsSent($email['id']);
                        $sent++;
                    } else {
                        // Mark as failed
                        $this->emailQueue->markAsFailed($email['id']);
                        $failed++;
                        $errors[] = "Failed to send email to: " . $email['recipient_email'];
                    }
                } catch (Exception $e) {
                    // Mark as failed
                    $this->emailQueue->markAsFailed($email['id']);
                    $failed++;
                    $errors[] = "Exception processing email ID {$email['id']}: " . $e->getMessage();
                }
            }

            // Clean up old emails (only in production)
            if ($this->isProduction) {
                $cleaned = $this->emailQueue->cleanupOldEmails();
                if ($cleaned > 0) {
                    error_log("EmailQueueProcessor: Cleaned up $cleaned old emails");
                }
            }

        } catch (Exception $e) {
            error_log("EmailQueueProcessor error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Error processing emails: ' . $e->getMessage(),
                'processed' => $processed,
                'sent' => $sent,
                'failed' => $failed,
                'errors' => array_merge($errors, [$e->getMessage()]),
                'duration' => round((microtime(true) - $startTime) * 1000, 2)
            ];
        }

        $duration = round((microtime(true) - $startTime) * 1000, 2);
        
        // Log results
        if ($sent > 0 || $failed > 0) {
            error_log("EmailQueueProcessor: Processed $processed emails ($sent sent, $failed failed) in {$duration}ms");
        }

        return [
            'success' => true,
            'message' => "Processed $processed emails",
            'processed' => $processed,
            'sent' => $sent,
            'failed' => $failed,
            'errors' => $errors,
            'duration' => $duration
        ];
    }

    /**
     * Get processing statistics
     * 
     * @return array Statistics
     */
    public function getStats() {
        return $this->emailQueue->getStats();
    }

    /**
     * Determine if we're in production environment
     * 
     * @return bool
     */
    private function isProductionEnvironment() {
        // Check for EMAIL_QUEUE_ENABLED environment variable
        if (isset($_ENV['EMAIL_QUEUE_ENABLED'])) {
            return filter_var($_ENV['EMAIL_QUEUE_ENABLED'], FILTER_VALIDATE_BOOLEAN);
        }
        
        // Fallback: check APP_ENV
        return ($_ENV['APP_ENV'] ?? 'development') === 'production';
    }
}

?> 