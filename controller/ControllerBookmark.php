<?php

RequirePage::model('Bookmark');
RequirePage::model('Writer');
RequirePage::model('Text');

class ControllerBookmark extends Controller {

    public function index(){
        // Not needed for bookmark functionality
    }

    public function bookmarkToggle($text_id) {
        // Ensure user is logged in
        if (!isset($_SESSION['writer_id'])) {
            http_response_code(401);
            echo json_encode(['error' => 'Unauthorized']);
            return;
        }

        $bookmark = new Bookmark;
        $writer_id = $_SESSION['writer_id'];
        $data = ['writer_id' => $writer_id, 'text_id' => $text_id];
    
        // Check if this text is already bookmarked by this user
        $alreadyBookmarked = $bookmark->selectCompositeId($data);
    
        // Toggle between saving or deleting the bookmark
        if ($alreadyBookmarked) {
            $bookmark->deleteComposite($data);
            $bookmarked = false;
        } else {
            // Add timestamp when bookmarking
            $data['bookmarked_at'] = date('Y-m-d H:i:s');
            $bookmark->saveComposite($data);
            $bookmarked = true;
        }
    
        // Build the response data
        $response = [
            'textId' => $text_id,
            'bookmarked' => $bookmarked,
            'writerId' => $writer_id
        ];
    
        // Return a JSON response
        echo json_encode($response);
    }
} 