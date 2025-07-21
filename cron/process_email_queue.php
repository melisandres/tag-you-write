#!/usr/bin/env php
<?php
/**
 * Email Queue Processor Cron Script
 * 
 * This script should be called by cron every minute in production:
* * * * * /usr/bin/php /path/to/your/project/cron/process_email_queue.php >> /path/to/your/project/logs/email_queue_cron.log 2>&1
 * 
 * For local development, you can run this manually to test the queue system.
 */

// Set error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Define the project root
define('ROOT_DIR', dirname(__DIR__));

// Load environment variables
if (file_exists(ROOT_DIR . '/config/load_env.php')) {
    require_once(ROOT_DIR . '/config/load_env.php');
}

// Load the email queue processor
require_once(ROOT_DIR . '/services/EmailQueueProcessor.php');

// Set time limit for the script (5 minutes)
set_time_limit(300);

// Initialize the processor
$processor = new EmailQueueProcessor(50); // Process up to 50 emails per run

// Process pending emails
$result = $processor->processPendingEmails();

// Only log if there's activity or errors
if ($result['processed'] > 0 || $result['failed'] > 0 || !$result['success']) {
    echo json_encode($result, JSON_PRETTY_PRINT) . "\n";
}

// Exit with appropriate code
exit($result['success'] ? 0 : 1);
?> 