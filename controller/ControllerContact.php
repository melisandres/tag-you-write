<?php

RequirePage::library('Email');
RequirePage::library('Validation');

class ControllerContact extends Controller {

    public function index() {
        // Contact form is handled via modal, no index page needed
        // But we need this method because Controller is abstract
        RequirePage::redirect('home');
    }

    /**
     * Handle contact form submission
     * Accepts JSON POST request with email, subject, message, newsletter fields
     */
    public function submit() {
        // Only accept POST requests
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            http_response_code(405);
            $this->sendJsonResponse(false, 'contact.method_not_allowed');
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
                $this->sendJsonResponse(false, 'contact.invalid_json');
                exit();
            }
            
            $email = $data['email'] ?? '';
            $subject = $data['subject'] ?? '';
            $message = $data['message'] ?? '';
            $newsletter = isset($data['newsletter']) && $data['newsletter'] === true;
        } else {
            // Handle form data from $_POST
            $email = $_POST['email'] ?? '';
            $subject = $_POST['subject'] ?? '';
            $message = $_POST['message'] ?? '';
            $newsletter = isset($_POST['newsletter']) && $_POST['newsletter'] === 'on';
        }

        // Server-side validation
        RequirePage::library('Validation');
        $val = new Validation;
        $val->name('email')->value($email)->pattern('email')->required()->max(255);
        $val->name('subject')->value($subject)->required()->max(200);
        $val->name('message')->value($message)->required()->min(10)->max(5000);

        if (!$val->isSuccess()) {
            $this->sendJsonResponse(false, 'contact.validation_failed', ['errors' => $val->displayErrors()]);
            exit();
        }

        try {
            // Get admin email from environment variable
            $adminEmail = $_ENV['SMTP_REPLY_TO_EMAIL'] ?? $_ENV['SMTP_USERNAME'] ?? null;
            
            if (!$adminEmail) {
                error_log('ControllerContact: SMTP_REPLY_TO_EMAIL not set in environment');
                $this->sendJsonResponse(false, 'contact.config_error');
                exit();
            }

            // Get user info if logged in
            $userName = 'Guest';
            $userEmail = $email;
            if (isset($_SESSION['writer_id'])) {
                RequirePage::model('Writer');
                $writer = new Writer();
                $writerData = $writer->selectId($_SESSION['writer_id']);
                if ($writerData) {
                    $userName = trim(($writerData['firstName'] ?? '') . ' ' . ($writerData['lastName'] ?? ''));
                    if (empty(trim($userName))) {
                        $userName = $writerData['email'] ?? 'User';
                    }
                }
            }

            // Prepare email content
            $emailer = new Email();
            
            // Build message content with contact form data
            $messageParams = [
                'userName' => $userName,
                'userEmail' => $userEmail,
                'subject' => $subject,
                'message' => nl2br(htmlspecialchars($message, ENT_QUOTES, 'UTF-8')), // Preserve line breaks, escape HTML
                'newsletter' => $newsletter ? 'Yes' : 'No',
                'isLoggedIn' => isset($_SESSION['writer_id']) ? 'Yes' : 'No'
            ];

            // Send email to admin using sendWithKeys for queuing support
            $emailSent = $emailer->sendWithKeys(
                $adminEmail,
                'Tag You Write Admin',
                'email.contact_form.subject',
                'email.contact_form.message',
                ['subject' => $subject], // Subject params
                $messageParams // Message params
            );

            if ($emailSent) {
                // Success response
                $this->sendJsonResponse(true, 'contact.submit_success');
            } else {
                // Email sending failed
                error_log('ControllerContact: Failed to send contact email');
                $this->sendJsonResponse(false, 'contact.submit_error');
            }
        } catch (Exception $e) {
            error_log('ControllerContact: Exception in submit: ' . $e->getMessage());
            $this->sendJsonResponse(false, 'contact.submit_error');
        }
    }
}

?>
