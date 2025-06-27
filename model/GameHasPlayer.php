<?php
require_once('Crud.php');

class GameHasPlayer extends Crud{

    public $table = 'game_has_player';
    public $primaryKey = ['game_id', 'player_id'];
    public $secondaryKey = 'player_id';
    public $fillable = ['game_id',
                        'player_id',
                        'active' /* to manage instances where players are invited, but don't accept invitation */
                        ]; 

    public function selectPlayerCount($gameId) {
        $sql = "SELECT COUNT(*) FROM $this->table WHERE game_id = $gameId";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':game_id', $gameId);
        $stmt->execute();
        return $stmt->fetch()['COUNT(*)'];
    }

    public function selectRecentCollaborators() {
        $currentUserId = $_SESSION['writer_id'];
        $sql = "SELECT DISTINCT w.id, w.firstName, w.lastName, w.email
                FROM game_has_player ghp_self
                JOIN game_has_player ghp_other ON ghp_self.game_id = ghp_other.game_id
                JOIN writer w ON w.id = ghp_other.player_id
                WHERE ghp_self.player_id = :current_user_id
                AND ghp_other.player_id != :current_user_id
                LIMIT 50";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':current_user_id', $currentUserId);
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /**
     * Search all users by first name or last name
     * Excludes the current user from results
     */
    public function searchUsersByName($searchTerm, $limit = 20) {
        $currentUserId = $_SESSION['writer_id'];
        $searchPattern = '%' . $searchTerm . '%';
        
        $sql = "SELECT id, firstName, lastName, email
                FROM writer 
                WHERE id != :current_user_id
                AND (firstName LIKE :search_pattern OR lastName LIKE :search_pattern)
                ORDER BY firstName, lastName
                LIMIT :limit";
                
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':current_user_id', $currentUserId);
        $stmt->bindValue(':search_pattern', $searchPattern);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        return $stmt->fetchAll();
    }
}