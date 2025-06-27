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
}