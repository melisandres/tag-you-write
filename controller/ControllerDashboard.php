<?php

RequirePage::model('Game');

class ControllerDashboard extends Controller {

    public function index(){
        // Get notifications
        $notifications = $this->getNotifications();
        
        // Read filters/search from URL (SSR respects incoming params)
        $filters = [];
        if (isset($_GET['hasContributed'])) {
            // normalize values: 'true'|'false'|'mine'|''
            $val = $_GET['hasContributed'];
            $filters['hasContributed'] = $val === '' ? null : $val;
        }
        if (isset($_GET['bookmarked'])) {
            $filters['bookmarked'] = $_GET['bookmarked'] === '' ? null : $_GET['bookmarked'];
        }
        if (isset($_GET['gameState'])) {
            $filters['gameState'] = $_GET['gameState'] === '' ? null : $_GET['gameState'];
        }
        $search = isset($_GET['search']) ? $_GET['search'] : null;

        // Get all games (flat array for DataManager compatibility), applying filters/search when present
        $game = new Game;
        $allGames = $game->getGames(null, $filters, null, $search);
        
        // Get dashboard data (categorized for initial server-side render)
        $dashboardData = $this->buildDashboardData($filters, $search);
        
        // Render dashboard view
        Twig::render('dashboard-index.php', [
            'dashboardData' => $dashboardData, // Categorized data for server-side render
            'gamesData' => json_encode($allGames), // Flat array for DataManager
            'notifications' => $notifications,
            'notificationsData' => json_encode($notifications),
            'initialFilters' => $filters,
            'initialSearch' => $search
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
    private function buildDashboardData($filters = [], $search = null) {
        $game = new Game;
        
        // Get all games (we'll categorize them)
        $allGames = $game->getGames(null, $filters, null, $search);
        
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
            // Use 'myStories' as section key to match frontend/templates
            $dashboardData['myStories'] = [
                'drafts' => ['games' => [], 'count' => 0, 'hasUnreads' => false],
                'active' => ['games' => [], 'count' => 0, 'hasUnreads' => false],
                'archives' => ['games' => [], 'count' => 0, 'hasUnreads' => false]
            ];
            
        }
        
        // Add closed subsection for all users (closed games for inspiration)
        $dashboardData['inspiration']['closed'] = ['games' => [], 'count' => 0, 'hasUnreads' => false];
        
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
            case 'myGames.drafts':
                if (!$isGuest && isset($dashboardData['myStories'])) {
                    $dashboardData['myStories']['drafts']['games'][] = $game;
                    $dashboardData['myStories']['drafts']['count']++;
                    if ($hasUnreads) $dashboardData['myStories']['drafts']['hasUnreads'] = true;
                }
                break;
                
            case 'myGames.active':
                if (!$isGuest && isset($dashboardData['myStories'])) {
                    $dashboardData['myStories']['active']['games'][] = $game;
                    $dashboardData['myStories']['active']['count']++;
                    if ($hasUnreads) $dashboardData['myStories']['active']['hasUnreads'] = true;
                }
                break;
                
            case 'myGames.archives':
                if (!$isGuest && isset($dashboardData['myStories'])) {
                    $dashboardData['myStories']['archives']['games'][] = $game;
                    $dashboardData['myStories']['archives']['count']++;
                    if ($hasUnreads) $dashboardData['myStories']['archives']['hasUnreads'] = true;
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
                
            case 'inspiration.closed':
                if (isset($dashboardData['inspiration']['closed'])) {
                    $dashboardData['inspiration']['closed']['games'][] = $game;
                    $dashboardData['inspiration']['closed']['count']++;
                    if ($hasUnreads) $dashboardData['inspiration']['closed']['hasUnreads'] = true;
                }
                break;
                
            default:
                error_log('Unknown category: ' . $category . ' for game: ' . $game['game_id']);
                break;
        }
    }
}

?>
