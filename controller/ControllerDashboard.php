<?php

RequirePage::model('Game');

class ControllerDashboard extends Controller {

    public function index(){
        // Get notifications
        $notifications = $this->getNotifications();
        
        // Get all games (flat array for DataManager compatibility)
        $game = new Game;
        $allGames = $game->getGames();
        
        // Get dashboard data (categorized for initial server-side render)
        $dashboardData = $this->buildDashboardData();
        
        // Render dashboard view
        Twig::render('dashboard-index.php', [
            'dashboardData' => $dashboardData, // Categorized data for server-side render
            'gamesData' => json_encode($allGames), // Flat array for DataManager
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications)
        ]);
    }
    
    /**
     * API endpoint to get dashboard data (for AJAX requests)
     */
    public function getDashboardData() {
        $dashboardData = $this->buildDashboardData();
        
        header('Content-Type: application/json');
        echo json_encode($dashboardData);
        exit;
    }
    
    /**
     * Get categorized dashboard data
     */
    private function buildDashboardData() {
        $game = new Game;
        
        // Get all games (we'll categorize them)
        $allGames = $game->getGames();
        
        // Initialize dashboard data structure
        $dashboardData = [
            'canJoin' => [
                'invitations' => ['games' => [], 'count' => 0, 'hasUnreads' => false],
                'other' => ['games' => [], 'count' => 0, 'hasUnreads' => false]
            ],
            'inspiration' => []
        ];
        
        // Only add user-specific sections if not a guest
        if (!$this->isGuest()) {
            $dashboardData['myGames'] = [
                'urgent' => ['games' => [], 'count' => 0, 'hasUnreads' => false],
                'active' => ['games' => [], 'count' => 0, 'hasUnreads' => false],
                'archives' => ['games' => [], 'count' => 0, 'hasUnreads' => false]
            ];
            
            // Add bookmarked subsection for logged-in users
            $dashboardData['inspiration']['bookmarked'] = ['games' => [], 'count' => 0, 'hasUnreads' => false];
        }
        
        // Categorize each game
        foreach ($allGames as $game) {
            $this->categorizeGame($game, $dashboardData);
        }
        
        return $dashboardData;
    }
    
    /**
     * Check if current user is a guest
     */
    private function isGuest() {
        return !isset($_SESSION['writer_id']) || empty($_SESSION['writer_id']);
    }
    
    /**
     * Categorize a single game into the appropriate dashboard sections
     */
    private function categorizeGame($game, &$dashboardData) {
        // Use the SQL-provided category field directly - much simpler!
        $category = $game['category'];
        $hasUnreads = $game['unseen_count'] > 0;
        $isGuest = $this->isGuest();
        
        
        // Map SQL categories to dashboard sections
        switch ($category) {
            case 'myGames.urgent':
                if (!$isGuest && isset($dashboardData['myGames'])) {
                    $dashboardData['myGames']['urgent']['games'][] = $game;
                    $dashboardData['myGames']['urgent']['count']++;
                    if ($hasUnreads) $dashboardData['myGames']['urgent']['hasUnreads'] = true;
                }
                break;
                
            case 'myGames.active':
                if (!$isGuest && isset($dashboardData['myGames'])) {
                    $dashboardData['myGames']['active']['games'][] = $game;
                    $dashboardData['myGames']['active']['count']++;
                    if ($hasUnreads) $dashboardData['myGames']['active']['hasUnreads'] = true;
                }
                break;
                
            case 'myGames.archives':
                if (!$isGuest && isset($dashboardData['myGames'])) {
                    $dashboardData['myGames']['archives']['games'][] = $game;
                    $dashboardData['myGames']['archives']['count']++;
                    if ($hasUnreads) $dashboardData['myGames']['archives']['hasUnreads'] = true;
                }
                break;
                
            case 'canJoin.invitations':
                $dashboardData['canJoin']['invitations']['games'][] = $game;
                $dashboardData['canJoin']['invitations']['count']++;
                if ($hasUnreads) $dashboardData['canJoin']['invitations']['hasUnreads'] = true;
                break;
                
            case 'canJoin.other':
                $dashboardData['canJoin']['other']['games'][] = $game;
                $dashboardData['canJoin']['other']['count']++;
                if ($hasUnreads) $dashboardData['canJoin']['other']['hasUnreads'] = true;
                break;
                
            case 'inspiration.bookmarked':
                if (!$isGuest && isset($dashboardData['inspiration']['bookmarked'])) {
                    $dashboardData['inspiration']['bookmarked']['games'][] = $game;
                    $dashboardData['inspiration']['bookmarked']['count']++;
                    if ($hasUnreads) $dashboardData['inspiration']['bookmarked']['hasUnreads'] = true;
                }
                break;
                
            default:
                error_log('Unknown category: ' . $category . ' for game: ' . $game['game_id']);
                break;
        }
    }
}

?>
