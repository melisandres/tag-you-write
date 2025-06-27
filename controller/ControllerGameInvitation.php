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
                    // For strict validation, username should have a userId 
                    // (meaning user was found/selected from suggestions)
                    if ($userId === null) {
                        // Only validate format for usernames without userId (typed usernames)
                        $val->name('username')->value($input)->usernameLength(2, 50)->pattern('username');
                        if (!$val->isSuccess()) {
                            $inviteeErrors = array_merge($inviteeErrors, $val->getErrors());
                            $val->errors = []; // Clear errors for next validation
                        }
                        
                        $inviteeErrors[] = "Username must be selected from suggestions";
                    }
                    // If userId is present, the username is valid (was selected from suggestions)
                    // No format validation needed - trust the userId
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

    /**
     * Store or update invitations for a game
     * Removes dead entries and creates tokens for new invitations
     * 
     * @param int $gameId The game ID
     * @param int $inviterId The user ID creating the invitations
     * @param array $inviteesData Array of invitee objects from frontend
     * @return array Success status and any errors
     */
    public function storeInvitations($gameId, $inviterId, $inviteesData) {
        try {
            RequirePage::model('GameInvitation');
            $gameInvitation = new GameInvitation();
            
            // Get existing invitations for this game from this inviter
            $existingInvitations = $gameInvitation->getInvitationsByGame($gameId);
            
            // Filter to only invitations from current inviter
            $myExistingInvitations = array_filter($existingInvitations, function($inv) use ($inviterId) {
                return $inv['inviter_id'] == $inviterId;
            });
            
            // Track which existing invitations should be kept
            $invitationsToKeep = [];
            $errors = [];
            $newInvitations = [];
            $updatedInvitations = [];
            
            // Process each new invitee
            foreach ($inviteesData as $index => $inviteeData) {
                $inviteeId = $inviteeData['userId'] ?? null;
                $email = null;
                $rawInput = $inviteeData['input']; // Always preserve the original input
                
                // Determine how to store the invitee data
                if ($inviteeData['type'] === 'email') {
                    $email = $inviteeData['input'];
                } else {
                    // For usernames: if we have a valid userId, leave email null
                    // If invalid username (no userId), store the raw input in email column for retrieval
                    if (!$inviteeId) {
                        $email = $rawInput; // Store invalid username in email column
                    }
                }
                
                // Find if this invitation already exists
                $existingInvitation = $gameInvitation->findExistingInvitation($gameId, $inviterId, $inviteeId, $email);
                
                if ($existingInvitation) {
                    // Mark this existing invitation to keep
                    $invitationsToKeep[] = $existingInvitation['id'];
                    
                    // Check if we need to update anything (for now, we'll keep existing data)
                    // Future: Could update message, permissions, etc. here
                    $updatedInvitations[] = $existingInvitation;
                } else {
                    // Create new invitation
                    $token = $gameInvitation->generateToken();
                    
                    $newInvitationData = [
                        'game_id' => $gameId,
                        'inviter_id' => $inviterId,
                        'invitee_id' => $inviteeId,
                        'email' => $email,
                        'token' => $token,
                        'invited_at' => date('Y-m-d H:i:s'),
                        'status' => 'pending',
                        'can_invite_others' => 0 // Changed from false to 0
                    ];
                    
                    $insertedId = $gameInvitation->insert($newInvitationData);
                    if ($insertedId) {
                        $newInvitationData['id'] = $insertedId;
                        $newInvitations[] = $newInvitationData;
                    } else {
                        $errors[] = "Failed to create invitation for " . ($email ?: "user ID $inviteeId");
                    }
                }
            }
            
            // Remove invitations that are no longer needed
            $removedCount = 0;
            foreach ($myExistingInvitations as $existingInv) {
                if (!in_array($existingInv['id'], $invitationsToKeep)) {
                    if ($gameInvitation->deleteInvitation($existingInv['id'])) {
                        $removedCount++;
                    } else {
                        $errors[] = "Failed to remove old invitation ID " . $existingInv['id'];
                    }
                }
            }
            
            // Return summary of changes
            return [
                'success' => empty($errors),
                'errors' => $errors,
                'summary' => [
                    'new_invitations' => count($newInvitations),
                    'kept_invitations' => count($invitationsToKeep),
                    'removed_invitations' => $removedCount
                ],
                'invitations' => array_merge($newInvitations, $updatedInvitations)
            ];
            
        } catch (Exception $e) {
            error_log('Error in storeInvitations: ' . $e->getMessage());
            return [
                'success' => false,
                'errors' => ['Failed to process invitations: ' . $e->getMessage()],
                'summary' => [],
                'invitations' => []
            ];
        }
    }

    /**
     * Get invitations for a game formatted for frontend editing
     * 
     * @param int $gameId The game ID
     * @param int $inviterId The inviter ID (optional, to filter by inviter)
     * @return string JSON string of invitees formatted for frontend
     */
    public function getInvitationsForEditing($gameId, $inviterId = null) {
        try {
            RequirePage::model('GameInvitation');
            RequirePage::model('Writer');
            $gameInvitation = new GameInvitation();
            $writer = new Writer();
            
            $invitations = $gameInvitation->getInvitationsByGame($gameId);
            
            // Filter by inviter if specified
            if ($inviterId) {
                $invitations = array_filter($invitations, function($inv) use ($inviterId) {
                    return $inv['inviter_id'] == $inviterId;
                });
            }
            
            // Format for frontend (matching the structure expected by inviteInputManager)
            $formattedInvitees = [];
            foreach ($invitations as $invitation) {
                if ($invitation['invitee_id']) {
                    // Valid username with user ID - DO NOT expose user's email for privacy
                    $userData = $writer->selectId($invitation['invitee_id']);
                    if ($userData) {
                        $fullName = trim($userData['firstName'] . ' ' . $userData['lastName']);
                        $formattedInvitees[] = [
                            'input' => $fullName,
                            'type' => 'username',
                            'userId' => $invitation['invitee_id'],
                            'userData' => [
                                'id' => $userData['id'],
                                'firstName' => $userData['firstName'],
                                'lastName' => $userData['lastName'],
                                'fullName' => $fullName
                                // NOTE: Deliberately NOT including email for privacy
                                // User invited by username, not email
                            ]
                        ];
                    }
                } else if ($invitation['email']) {
                    // This is either an email the user typed OR an invalid username stored in email column
                    $emailValue = $invitation['email'];
                    
                    // Determine if this looks like an email or an invalid username
                    if (filter_var($emailValue, FILTER_VALIDATE_EMAIL) || strpos($emailValue, '@') !== false) {
                        // Treat as email invitation - OK to show because user typed this email
                        $formattedInvitees[] = [
                            'input' => $emailValue,
                            'type' => 'email',
                            'userId' => null
                        ];
                    } else {
                        // Treat as invalid username (stored in email column for preservation)
                        // OK to show because user typed this username
                        $formattedInvitees[] = [
                            'input' => $emailValue, // This is actually the invalid username user typed
                            'type' => 'username',
                            'userId' => null // Invalid username has no user ID
                        ];
                    }
                }
            }
            
            return json_encode($formattedInvitees);
            
        } catch (Exception $e) {
            error_log('Error in getInvitationsForEditing: ' . $e->getMessage());
            return '[]'; // Return empty array on error
        }
    }
}