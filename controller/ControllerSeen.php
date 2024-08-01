<?php

RequirePage::model('Seen');
RequirePage::model('Writer');
RequirePage::model('Text');

class ControllerSeen extends Controller {

    public function index(){

    }

    public function markAsSeen($text_id) {
        if (!isset($_SESSION['writer_id']) || empty($_SESSION['writer_id'])) {
            // Return a JSON response indicating that the user is not logged in
            $response = [
                'notLoggedIn' => true,
            ];
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        }
    
        $seen = new Seen;
        $data = [
            'writer_id' => $_SESSION['writer_id'],
            'text_id' => $text_id
        ];
    
        $hasBeenSeen = $seen->selectCompositeId($data);
        if ($hasBeenSeen) {
            $data['read_at'] = date('Y-m-d H:i:s');
            $seen->updateCompositeID($data);
        } else {
            $seen->saveComposite($data);
        }
    
        $response = [
            'hasSeen' => true,
        ];
    
        // Set the content type to application/json
        //header('Content-Type: application/json');
        $jsonData = json_encode($response);
        return $jsonData;
    }
    
    

    /* public function markAsSeen($text_id) {
        if (!isset($_SESSION['writer_id']) || empty($_SESSION['writer_id'])) {
            // Return a JSON response indicating that the user is not logged in
            $response = [
                'notLoggedIn' => true,
            ];
            header('Content-Type: application/json');
            echo json_encode($response);
            exit;
        }
    
        try {
            $seen = new Seen;
            $data = [
                'writer_id' => $_SESSION['writer_id'],
                'text_id' => $text_id,
            ];

            $hasBeenSeen = $seen->selectCompositeId($data);
            if($hasBeenSeen){
                $seen->updateCompositeID($data);
            }else{
                $seen->saveComposite($data);
            }
    
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
    } */
    
    // TODO: markAsUnseen, and toggleSeen are not functional, or called
    // If I include them, I'll have to model them on markAsSeen, so that they don't trigger errors
    // when called for a user that is not logged in. 
    public function markAsUnseen($text_id) {
        if(!$_SESSION['writer_id']){
            return;
        }
        $seen = new Seen;
        $data = [
            'writer_id' => $_SESSION['writer_id'],
            'text_id' => $text_id,
            'read_at' => date('Y-m-d H:i:s'),
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