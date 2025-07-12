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
/*                     'email' => $user['email'], */
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
                        'invited_at' => null, // Will be set when invitations are actually sent
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

    /**
     * Send email invitations for a game (when game is started--specifically when the root node ispublished)
     * Updates invited_at timestamp and sends emails to all pending invitees
     * Also creates notifications for registered users
     * 
     * @param int $gameId The game ID
     * @param array $gameData Game information for email content
     * @return array Success status and results
     */
    public function sendInvitations($gameId, $gameData) {
        try {
            RequirePage::model('GameInvitation');
            RequirePage::model('Writer');
            RequirePage::library('Email');
            
            $gameInvitation = new GameInvitation();
            $writer = new Writer();
            $emailer = new Email();
            
            // Get all pending invitations for this game that haven't been sent yet
            $invitations = $gameInvitation->getInvitationsByGame($gameId);
            $pendingInvitations = array_filter($invitations, function($inv) {
                return $inv['status'] === 'pending' && is_null($inv['invited_at']);
            });
            
            if (empty($pendingInvitations)) {
                return [
                    'success' => true,
                    'message' => 'No pending invitations to send',
                    'sent_count' => 0,
                    'notification_count' => 0
                ];
            }
            
            $emailsSent = 0;
            $notificationsCreated = 0;
            $errors = [];
            $currentTimestamp = date('Y-m-d H:i:s');
            
            foreach ($pendingInvitations as $invitation) {
                // Determine recipient email and name
                $recipientEmail = null;
                $recipientName = null;
                $isRegisteredUser = false;
                
                if ($invitation['invitee_id']) {
                    // Registered user - get their email from the database
                    $userData = $writer->selectId($invitation['invitee_id']);
                    if ($userData) {
                        $recipientEmail = $userData['email'];
                        $recipientName = trim($userData['firstName'] . ' ' . $userData['lastName']);
                        $isRegisteredUser = true;
                    }
                } else if ($invitation['email']) {
                    // Email invitation or invalid username stored in email column
                    $recipientEmail = $invitation['email'];
                    $recipientName = $recipientEmail; // Use email as name for unregistered users
                    $isRegisteredUser = false;
                }
                
                // Skip if no valid email found
                if (!$recipientEmail) {
                    $errors[] = "No valid email found for invitation ID: " . $invitation['id'];
                    continue;
                }
                
                // Get inviter information
                $inviterData = $writer->selectId($invitation['inviter_id']);
                $inviterName = $inviterData ? trim($inviterData['firstName'] . ' ' . $inviterData['lastName']) : 'Someone';
                
                // Prepare email content
                try {
                    $subject = translate('email.game_invitation.subject', [
                        'inviterName' => $inviterName,
                        'gameTitle' => $gameData['title'] ?? 'Untitled Game'
                    ]);
                    
                    // Generate invitation URL
                    $invitationUrl = RequirePage::getBaseUrl() . langUrl('GameInvitation/visit/' . $invitation['token']);
                    
                    $message = translate('email.game_invitation.message', [
                        'recipientName' => $recipientName,
                        'inviterName' => $inviterName,
                        'gameTitle' => $gameData['title'] ?? 'Untitled Game',
                        'gamePrompt' => $gameData['prompt'] ?? '',
                        'invitationUrl' => $invitationUrl
                    ]);
                    
                    // Send email
                    if ($emailer->welcome($recipientEmail, $recipientName, $subject, $message)) {
                        $emailsSent++;
                        
                        // Update invitation with sent timestamp
                        $gameInvitation->update([
                            'id' => $invitation['id'],
                            'invited_at' => $currentTimestamp
                        ]);
                        
                        // Create notification for registered users
                        if ($isRegisteredUser) {
                            $this->createInvitationNotification(
                                $invitation['invitee_id'], 
                                $invitation['inviter_id'], 
                                $gameId, 
                                $gameData
                            );
                            $notificationsCreated++;
                        }
                    } else {
                        $errors[] = "Failed to send email to: " . $recipientEmail;
                    }
                } catch (Exception $e) {
                    $errors[] = "Exception when processing invitation: " . $e->getMessage();
                }
            }
            
            $result = [
                'success' => empty($errors) || $emailsSent > 0, // Success if at least one email sent
                'message' => $emailsSent > 0 ? 'Invitations sent successfully' : 'Failed to send invitations',
                'sent_count' => $emailsSent,
                'notification_count' => $notificationsCreated,
                'errors' => $errors
            ];
            
            return $result;
            
        } catch (Exception $e) {
            error_log('Error in sendInvitations: ' . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Failed to send invitations: ' . $e->getMessage(),
                'sent_count' => 0,
                'notification_count' => 0,
                'errors' => [$e->getMessage()]
            ];
        }
    }

    /**
     * Create notification for game invitation (registered users only)
     * 
     * @param int $inviteeId The user being invited
     * @param int $inviterId The user doing the inviting
     * @param int $gameId The game ID
     * @param array $gameData Game information
     */
    private function createInvitationNotification($inviteeId, $inviterId, $gameId, $gameData) {
        try {
            error_log("Creating notification for user $inviteeId from inviter $inviterId for game $gameId");
            RequirePage::controller('ControllerNotification');
            
            // Create structured message for notification
            $message = json_encode([
                'title' => 'notification.game_invitation.title',
                'message' => 'notification.game_invitation.message',
                'gameId' => $gameId,
                'gameTitle' => $gameData['title'] ?? 'Untitled Game',
                'inviterId' => $inviterId,
                'inviterName' => $gameData['inviterName'] ?? 'Someone'
            ]);
            
            // Use ControllerNotification to create the notification
            $notification = new ControllerNotification();
            $notificationId = $notification->create(
                $inviteeId,  // The user receiving the notification
                $gameId,     // The game ID
                'game_invitation', // Notification type
                $message     // Message data
            );
            
            error_log("Notification created with ID: " . ($notificationId ? $notificationId : 'FAILED'));
            
            if ($notificationId) {
                // Get root_text_id from the game model
                RequirePage::model('Game');
                $game = new Game();
                $rootTextId = $game->getRootText($gameId);
                
                // Create event for the notification using the standard createEvents method
                // Use NOTIFICATION_CREATED to ensure proper Redis handling
                $this->createEvents('NOTIFICATION_CREATED', [
                    'notificationId' => $notificationId,
                    'writerId' => $inviteeId, // This should be the recipient ID for Redis channel
                    'notificationType' => 'game_invitation',
                    'relatedType' => 'game',
                    'relatedId' => $gameId,
                    'gameId' => $gameId, // Add gameId to ensure getRootTextId can find it
                    'textId' => $rootTextId // Add textId as a fallback
                ], 'game_invitation');
                
                error_log("Event created for notification ID: $notificationId");
            }
            
        } catch (Exception $e) {
            error_log('Error creating invitation notification: ' . $e->getMessage());
            error_log('Stack trace: ' . $e->getTraceAsString());
        }
    }

    /**
     * Handle invitation access via token
     * Route: GameInvitation/visit/[token]
     * 
     * Simple flow: locate game by token, show it, store token in session
     * 
     * @param string $token The invitation token
     */
    public function visit($token = null) {
        if (!$token) {
            $notifications = $this->getNotifications();
            Twig::render('home-error.php', [
                'message' => "error.invalid_invitation_link",
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
            return;
        }
        
        try {
            RequirePage::model('GameInvitation');
            RequirePage::model('Game');
            
            $gameInvitation = new GameInvitation();
            $game = new Game();
            
            // Locate invitation by token
            $invitation = $gameInvitation->selectId($token, 'token');
            
            if (!$invitation || !in_array($invitation['status'], ['pending', 'accepted'])) {
                $notifications = $this->getNotifications();
                Twig::render('home-error.php', [
                    'message' => "error.invitation_not_found",
                    'notifications' => $notifications,
                    'notificationsData' => json_encode($notifications)
                ]);
                return;
            }
            
            // Get game information
            $gameData = $game->selectId($invitation['game_id']);
            if (!$gameData || !$gameData['root_text_id']) {
                $notifications = $this->getNotifications();
                Twig::render('home-error.php', [
                    'message' => "error.game_not_found",
                    'notifications' => $notifications,
                    'notificationsData' => json_encode($notifications)
                ]);
                return;
            }
            
            // Store token in session array for game access (only if not already stored)
            if (!isset($_SESSION['game_invitation_access'])) {
                $_SESSION['game_invitation_access'] = [];
            }
            
            // Only store if we don't already have this token for this game
            $alreadyStored = false;
            if (isset($_SESSION['game_invitation_access'][$invitation['game_id']])) {
                $storedToken = $_SESSION['game_invitation_access'][$invitation['game_id']]['token'];
                if ($storedToken === $token) {
                    $alreadyStored = true;
                }
            }
            
            if (!$alreadyStored) {
                $_SESSION['game_invitation_access'][$invitation['game_id']] = [
                    'token' => $token,
                    'invitation_id' => $invitation['id'],
                    'invited_email' => $invitation['email'],
                    'expires_at' => date('Y-m-d H:i:s', strtotime('+2 hours')),
                    'was_prompted' => false
                ];
            }
            
            // Always update visited_at when someone visits via invitation link
            $gameInvitation->update([
                'id' => $invitation['id'],
                'visited_at' => date('Y-m-d H:i:s')
            ]);
            
            // Process invitation immediately - processing checks if the user is logged in, and if not, it will be triggered during login/account creation
            // Only process the current token, not all stored tokens
            $result = $this->processLoggedInInvitation($token, 'visit');
            
            // If user is logged in and there are pending confirmations, store them and redirect to the game
            // The frontend will handle showing the confirmation modal when the page loads
            if ($result['success'] && !empty($result['pendingConfirmations'])) {
                $_SESSION['pending_invitation_confirmations'] = $result['pendingConfirmations'];
            }
            
            // Always show the game collaboration page
            // The frontend will check for pending confirmations and show modal if needed
            RequirePage::redirect('text/collab/' . $gameData['root_text_id']);
            
        } catch (Exception $e) {
            error_log('Error in visit invitation: ' . $e->getMessage());
            $notifications = $this->getNotifications();
            Twig::render('home-error.php', [
                'message' => "error.invitation_processing_failed",
                'notifications' => $notifications,
                'notificationsData' => json_encode($notifications)
            ]);
        }
    }

    /**
     * Process invitation for logged-in users with enhanced safety checks
     * Assigns user ID to email invitations and creates notifications
     * Removes tokens from session when user ID is assigned
     * 
     * @param string $token Optional token to process, or null to process all stored tokens
     * @param string $context The context of the invitation processing ('visit', 'login', 'account_creation', 'password_reset')
     * @return array Response with status and any pending confirmations
     */
    public function processLoggedInInvitation($token = null, $context = 'manual-linking') {
        if (!isset($_SESSION['writer_id'])) {
            if ($context === 'manual-linking') {
                $this->sendJsonResponse(false, 'toast.invitation.link_failed');
                return;
            }
            return ['success' => false, 'message' => 'User not logged in'];
        }
        
        try {
            RequirePage::model('GameInvitation');
            RequirePage::model('Game');
            RequirePage::model('Writer');
            
            $gameInvitation = new GameInvitation();
            $game = new Game();
            $writer = new Writer();
            $currentUserId = $_SESSION['writer_id'];
            
            // Get current user's email
            $currentUserData = $writer->selectId($currentUserId);
            $currentUserEmail = $currentUserData['email'] ?? '';
            
            // Determine which tokens to process
            $tokensToProcess = [];
            $pendingConfirmations = [];
            
            if ($token) {
                // Process specific token
                $tokensToProcess[] = $token;
            } elseif (isset($_SESSION['game_invitation_access'])) {
                // Process all stored tokens
                foreach ($_SESSION['game_invitation_access'] as $gameId => $accessInfo) {
                    // Check if token is expired
                    if (isset($accessInfo['expires_at']) && strtotime($accessInfo['expires_at']) < time()) {
                        // Remove expired token
                        unset($_SESSION['game_invitation_access'][$gameId]);
                        continue;
                    }
                    $tokensToProcess[] = $accessInfo['token'];
                }
            }
            
            foreach ($tokensToProcess as $currentToken) {
                            // Get invitation
            $invitation = $gameInvitation->selectId($currentToken, 'token');
            if (!$invitation) {
                if ($context === 'manual-linking') {
                    $this->sendJsonResponse(false, 'toast.invitation.link_failed');
                    return;
                }
                continue;
            }
                
                // Handle all invitations based on their current state
                if (!$invitation['invitee_id']) {
                    // Email invitation (no invitee_id) - check if emails match
                    $invitedEmail = $invitation['email'] ?? '';
                    $emailsMatch = strtolower(trim($invitedEmail)) === strtolower(trim($currentUserEmail));
                    
                    if ($emailsMatch) {
                        // Emails match - link silently
                        $this->linkInvitationToUser($invitation, $currentUserId, $gameInvitation, $game, $writer);
                        
                        // Remove token from session
                        $this->removeTokenFromSession($currentToken);
                        
                        // For manual linking, return JSON response
                        if ($context === 'manual-linking') {
                            $this->sendJsonResponse(true, 'toast.invitation.link_success');
                            return;
                        }
                    } else {
                        // Emails don't match - add to pending confirmations
                        $pendingConfirmations[] = [
                            'token' => $currentToken,
                            'invitation' => $invitation,
                            'invited_email' => $invitedEmail,
                            'current_user_email' => $currentUserEmail,
                            'context' => $context
                        ];
                        
                        // IMPORTANT: Do NOT remove token from session here - it needs to stay for the modal
                    }
                } else {
                    // User invitation (has invitee_id) - check if it's for current user
                    if ($invitation['invitee_id'] == $currentUserId) {
                        // Token is already linked to current user - remove from session
                        $this->removeTokenFromSession($currentToken);
                    } else {
                        // Token is linked to different user - remove from session for security
                        $this->removeTokenFromSession($currentToken);
                        error_log("Removed token linked to different user. Token: $currentToken, Linked to: {$invitation['invitee_id']}, Current user: $currentUserId");
                    }
                }
            }
            
            // For manual linking, if we have pending confirmations, store them and let frontend handle
            if ($context === 'manual-linking' && !empty($pendingConfirmations)) {
                // Store confirmations in session for the modal to pick up
                $_SESSION['pending_invitation_confirmations'] = $pendingConfirmations;
                
                // Return JSON response indicating confirmation is needed
                $this->sendJsonResponse(false, 'toast.invitation.confirmation_needed', [
                    'needsConfirmation' => true
                ]);
                return;
            }
            
            // Group confirmations by email to avoid repetitive modals
            $groupedConfirmations = [];
            foreach ($pendingConfirmations as $confirmation) {
                $invitedEmail = $confirmation['invited_email'];
                if (!isset($groupedConfirmations[$invitedEmail])) {
                    $groupedConfirmations[$invitedEmail] = [
                        'invited_email' => $invitedEmail,
                        'current_user_email' => $confirmation['current_user_email'],
                        'context' => $confirmation['context'],
                        'tokens' => [],
                        'invitations' => []
                    ];
                }
                $groupedConfirmations[$invitedEmail]['tokens'][] = $confirmation['token'];
                $groupedConfirmations[$invitedEmail]['invitations'][] = $confirmation['invitation'];
            }
            
            return [
                'success' => true,
                'pendingConfirmations' => array_values($groupedConfirmations)
            ];
            
        } catch (Exception $e) {
            error_log('Error processing logged-in invitation: ' . $e->getMessage());
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }
    
    /**
     * Link an invitation to a user and create notification
     * 
     * @param array $invitation The invitation data
     * @param int $userId The user ID to link
     * @param GameInvitation $gameInvitation The invitation model
     * @param Game $game The game model
     * @param Writer $writer The writer model
     */
    private function linkInvitationToUser($invitation, $userId, $gameInvitation, $game, $writer) {
        // Assign current user to this invitation
        $gameInvitation->update([
            'id' => $invitation['id'],
            'invitee_id' => $userId
        ]);
        
        // Create notification for this user
        $gameData = $game->selectId($invitation['game_id']);
        $inviterData = $writer->selectId($invitation['inviter_id']);
        
        if ($gameData && $inviterData) {
            $this->createInvitationNotification(
                $userId,  // inviteeId
                $invitation['inviter_id'],  // inviterId  
                $invitation['game_id'],  // gameId
                [
                    'title' => $gameData['prompt'] ?? 'Untitled Game',
                    'inviterName' => trim($inviterData['firstName'] . ' ' . $inviterData['lastName'])
                ]  // gameData
            );
        }
    }
    
    /**
     * Remove a token from session
     * 
     * @param string $token The token to remove
     */
    private function removeTokenFromSession($token) {
        if (isset($_SESSION['game_invitation_access'])) {
            foreach ($_SESSION['game_invitation_access'] as $gameId => $accessInfo) {
                if ($accessInfo['token'] === $token) {
                    unset($_SESSION['game_invitation_access'][$gameId]);
                    break;
                }
            }
        }
    }
    
    /**
     * Handle invitation confirmation from frontend
     * 
     * @param string $token The token to confirm
     * @param bool $confirmed Whether the user confirmed the invitation
     * @return void Outputs JSON response
     */
    public function confirmInvitation($token, $confirmed) {
        if (!isset($_SESSION['writer_id'])) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'User not logged in']);
            return;
        }
        
        try {
            RequirePage::model('GameInvitation');
            RequirePage::model('Game');
            RequirePage::model('Writer');
            
            $gameInvitation = new GameInvitation();
            $game = new Game();
            $writer = new Writer();
            $currentUserId = $_SESSION['writer_id'];
            
            // Convert string parameter to boolean
            $confirmed = ($confirmed === 'true' || $confirmed === true);
            
            if ($confirmed) {
                // Get invitation
                $invitation = $gameInvitation->selectId($token, 'token');
                if ($invitation && !$invitation['invitee_id']) {
                    // Link the invitation to the user
                    $this->linkInvitationToUser($invitation, $currentUserId, $gameInvitation, $game, $writer);
                    $this->removeTokenFromSession($token);
                    
                    // Get game data to return game ID and root ID
                    $gameData = $game->selectId($invitation['game_id']);
                    $rootId = $gameData['root_text_id'] ?? null;
                    
                    header('Content-Type: application/json');
                    echo json_encode([
                        'success' => true,
                        'game_id' => $invitation['game_id'],
                        'root_id' => $rootId
                    ]);
                    return;
                }
            }
            
            header('Content-Type: application/json');
            echo json_encode(['success' => true]);
            
        } catch (Exception $e) {
            error_log('Error confirming invitation: ' . $e->getMessage());
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
        }
    }
    
    /**
     * Get pending invitation confirmations for frontend
     * 
     * @return void Outputs JSON response
     */
    public function getPendingConfirmations() {
        if (!isset($_SESSION['writer_id'])) {
            header('Content-Type: application/json');
            echo json_encode(['success' => false, 'message' => 'User not logged in']);
            return;
        }
        
        $pendingConfirmations = $_SESSION['pending_invitation_confirmations'] ?? [];
        
        // Clear the session data after retrieving it
        unset($_SESSION['pending_invitation_confirmations']);
        
        header('Content-Type: application/json');
        echo json_encode([
            'success' => true,
            'pendingConfirmations' => $pendingConfirmations
        ]);
    }
}