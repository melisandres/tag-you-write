<?php
RequirePage::model('GameHasPlayer');

class ControllerGameInvitation extends Controller {

    public function index() {
    }
    
     /**
     * Get recent collaborators for the current user
     * Returns the 50 most recent collaborators based on shared games
     */
    public function getRecentCollaborators() {
        try {
            // Check if user is logged in
            if (!isset($_SESSION['writer_id'])) {
                header('HTTP/1.1 401 Unauthorized');
                echo json_encode(['error' => 'User not authenticated']);
                return;
            }

            $gameHasPlayer = new GameHasPlayer();
            $collaborators = $gameHasPlayer->selectRecentCollaborators();

            // Format the response for frontend consumption
            $formattedCollaborators = [];
            foreach ($collaborators as $collaborator) {
                $formattedCollaborators[] = [
                    'id' => $collaborator['id'],
                    'firstName' => $collaborator['firstName'],
                    'lastName' => $collaborator['lastName'],
                    'email' => $collaborator['email'],
                    'fullName' => trim($collaborator['firstName'] . ' ' . $collaborator['lastName'])
                ];
            }

            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'collaborators' => $formattedCollaborators
            ]);

        } catch (Exception $e) {
            error_log('Error in getRecentCollaborators: ' . $e->getMessage());
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to fetch collaborators']);
        }
    }
    
    /**
     * Search users by first/last name
     * Used for finding potential collaborators as user types
     */
    public function searchUsers() {
        try {
            // Check if user is logged in
            if (!isset($_SESSION['writer_id'])) {
                header('HTTP/1.1 401 Unauthorized');
                echo json_encode(['error' => 'User not authenticated']);
                return;
            }

            // Get search term from query parameter
            $searchTerm = isset($_GET['q']) ? trim($_GET['q']) : '';
            
            if (empty($searchTerm)) {
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => true,
                    'users' => []
                ]);
                return;
            }

            // Minimum 2 characters to avoid too many results
            if (strlen($searchTerm) < 2) {
                header('Content-Type: application/json');
                echo json_encode([
                    'success' => true,
                    'users' => []
                ]);
                return;
            }

            $gameHasPlayer = new GameHasPlayer();
            $users = $gameHasPlayer->searchUsersByName($searchTerm, 20);

            // Format the response for frontend consumption
            $formattedUsers = [];
            foreach ($users as $user) {
                $formattedUsers[] = [
                    'id' => $user['id'],
                    'firstName' => $user['firstName'],
                    'lastName' => $user['lastName'],
                    'email' => $user['email'],
                    'fullName' => trim($user['firstName'] . ' ' . $user['lastName'])
                ];
            }

            header('Content-Type: application/json');
            echo json_encode([
                'success' => true,
                'users' => $formattedUsers
            ]);

        } catch (Exception $e) {
            error_log('Error in searchUsers: ' . $e->getMessage());
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to search users']);
        }
    }

    /**
     * Validate invitee data from frontend with two-tier validation
     * Expects array of invitee objects: {input, type, userId?}
     * 
     * @param array $inviteeData The invitee data to validate
     * @param string $validationLevel 'basic' for autosave, 'strict' for publishing
     * @return array Returns array with 'status' => 'success' or 'error' and 'errors' if validation fails
     */
    public function validateInvitees($inviteeData, $validationLevel = 'strict') {
        RequirePage::library('Validation');
        $val = new Validation;
        $errors = [];
        
        // Check if inviteeData is empty or not an array
        if (empty($inviteeData) || !is_array($inviteeData)) {
            return [
                'status' => 'success', // Empty invitee list is valid
                'validInvitees' => []
            ];
        }
        
        $validInvitees = [];
        $seenInputs = [];
        
        foreach ($inviteeData as $index => $invitee) {
            $inviteeErrors = [];
            
            // Each invitee should be an array with either 'userId' or 'email'
            if (!is_array($invitee)) {
                $inviteeErrors[] = "Invitee data must be an object";
                continue;
            }
            
            // Required fields validation
            if (!isset($invitee['input']) || empty(trim($invitee['input']))) {
                $inviteeErrors[] = "Invitee input is required";
            }
            
            if (!isset($invitee['type']) || !in_array($invitee['type'], ['email', 'username'])) {
                $inviteeErrors[] = "Invitee type must be 'email' or 'username'";
            }
            
            // Skip further validation if basic structure is wrong
            if (!empty($inviteeErrors)) {
                $errors["invitee_" . $index] = $inviteeErrors;
                continue;
            }
            
            $input = trim($invitee['input']);
            $type = $invitee['type'];
            $userId = isset($invitee['userId']) ? $invitee['userId'] : null;
            
            // === BASIC VALIDATION (for autosave) ===
            
            // Basic length checks (prevent overly long data)
            if (strlen($input) > 100) {
                $inviteeErrors[] = "Invitee input too long (max 100 characters)";
            }
            
            // Check for duplicate inputs using validation library
            $val->name('invitee')->value($input)->uniqueInArray($seenInputs, "Duplicate invitee: " . $input);
            if (!$val->isSuccess()) {
                $inviteeErrors = array_merge($inviteeErrors, $val->getErrors());
                $val->errors = []; // Clear errors for next validation
            } else {
                $seenInputs[] = $input; // Add to seen list only if unique
            }
            
            // If basic validation fails, don't continue to strict validation
            if (!empty($inviteeErrors)) {
                $errors["invitee_" . $index] = $inviteeErrors;
                continue;
            }
            
            // === STRICT VALIDATION (for publishing) ===
            if ($validationLevel === 'strict') {
                // Validate email format if type is email
                if ($type === 'email') {
                    $val->name('email')->value($input)->pattern('email');
                    if (!$val->isSuccess()) {
                        $inviteeErrors = array_merge($inviteeErrors, $val->getErrors());
                        $val->errors = []; // Clear errors for next validation
                    }
                }
                
                // Validate username format if type is username
                if ($type === 'username') {
                    $val->name('username')->value($input)->usernameLength(2, 50)->pattern('username');
                    if (!$val->isSuccess()) {
                        $inviteeErrors = array_merge($inviteeErrors, $val->getErrors());
                        $val->errors = []; // Clear errors for next validation
                    }
                    
                    // For strict validation, username should have a userId 
                    // (meaning user was found/selected from suggestions)
                    if ($userId === null) {
                        $inviteeErrors[] = "Username must be selected from suggestions";
                    }
                }
                
                // Validate userId if present
                if ($userId !== null) {
                    if (!is_numeric($userId) || intval($userId) <= 0) {
                        $inviteeErrors[] = "User ID must be a positive number";
                    }
                }
            }
            
            // If no errors for this invitee, add to valid list
            if (empty($inviteeErrors)) {
                $validInvitees[] = [
                    'input' => $input,
                    'type' => $type,
                    'userId' => $userId
                ];
            } else {
                $errors["invitee_" . $index] = $inviteeErrors;
            }
        }
        
        // Check if we exceed maximum number of invitees using validation library
        $val->name('invitees')->value($validInvitees)->maxArrayCount(10, 'invitees');
        if (!$val->isSuccess()) {
            $errors['general'] = $val->getErrors();
        }
        
        if (empty($errors)) {
            return [
                'status' => 'success',
                'validInvitees' => $validInvitees
            ];
        } else {
            return [
                'status' => 'error',
                'errors' => $errors
            ];
        }
    }
}