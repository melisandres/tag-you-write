<?php

RequirePage::model('Seen');
RequirePage::model('Writer');
RequirePage::model('Text');

class ControllerSeen extends Controller {

    public function index(){

    }

    public function markAsSeen($text_id) {
        if(!$_SESSION['writer_id']){
            return;
        }
        try {
            $seen = new Seen;
            $data = [
                'writer_id' => $_SESSION['writer_id'],
                'text_id' => $text_id,
            ];
    
            $seen->saveComposite($data);
    
            $response = [
                'hasSeen' => true,
            ];
    
            // Set the content type to application/json
            header('Content-Type: application/json');
            echo json_encode($response);
        } catch (Exception $e) {
            // Handle exceptions and return a JSON error response
            http_response_code(500); // Internal Server Error
            $response = [
                'error' => $e->getMessage(),
            ];
            header('Content-Type: application/json');
            echo json_encode($response);
        }
    }
    

    /* public function markAsSeen($text_id) {
        $seen = new Seen;
        $data = [
            'writer_id' => $_SESSION['writer_id'],
            'text_id' => $text_id,
        ];
    
        $seen->saveComposite($data);
    
        // Build the response data
        $response = [
            'hasSeen' => true,
        ];
    
        // Return a JSON response
        echo json_encode($response);
    } */

    public function markAsUnseen($text_id) {
        if(!$_SESSION['writer_id']){
            return;
        }
        $seen = new Seen;
        $data = [
            'writer_id' => $_SESSION['writer_id'],
            'text_id' => $text_id
        ];
    
        $seen->deleteComposite($data);
    
        // Build the response data
        $response = [
            'hasSeen' => false,
        ];
    
        // Return a JSON response
        echo json_encode($response);
    }

    public function seenToggle($text_id) {
        if(!$_SESSION['writer_id']){
            return;
        }
        $seen = new Seen;
        $data = [
            'writer_id' => $_SESSION['writer_id'],
            'text_id' => $text_id
        ];
    
        // Check if this is a seen or unseen action
        $alreadySaw = $seen->selectCompositeId($data);
    
        // Toggle btwn saving / deleting the "seen" entry
        if ($alreadySaw) {
            $seen->deleteComposite($data);
            $hasSeen = false;
        } else {
            $seen->saveComposite($data);
            $hasSeen = true;
        }
    
        // Build the response data
        $response = [
            'hasSeen' => $hasSeen,
        ];
    
        // Return a JSON response
        echo json_encode($response);
    }
}