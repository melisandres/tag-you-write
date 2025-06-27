<?php
require_once('Crud.php');

class GameInvitation extends Crud{

    public $table = 'game_invitation';
    public $primaryKey = ['id'];
    public $fillable = ['id', 
                        'game_id', 
                        'inviter_id', 
                        'invitee_id', 
                        'email', 
                        'token', 
                        'invited_at', 
                        'accepted_at', 
                        'declined_at', 
                        'message', 
                        'status', 
                        'can_invite_others'];
                        

    /**
     * Get all invitations for a specific game
     * 
     * @param int $gameId The game ID
     * @return array Array of invitations
     */
    public function getInvitationsByGame($gameId) {
        $sql = "SELECT * FROM {$this->table} WHERE game_id = ?";
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute([$gameId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Delete invitation by ID
     * 
     * @param int $invitationId The invitation ID to delete
     * @return bool Success status
     */
    public function deleteInvitation($invitationId) {
        $sql = "DELETE FROM {$this->table} WHERE id = ?";
        $stmt = $this->pdo->prepare($sql);
        return $stmt->execute([$invitationId]);
    }

    /**
     * Find existing invitation by game, inviter, and either invitee_id or email
     * 
     * @param int $gameId
     * @param int $inviterId 
     * @param int|null $inviteeId
     * @param string|null $email
     * @return array|null Existing invitation or null
     */
    public function findExistingInvitation($gameId, $inviterId, $inviteeId = null, $email = null) {
        if ($inviteeId) {
            $sql = "SELECT * FROM {$this->table} WHERE game_id = ? AND inviter_id = ? AND invitee_id = ?";
            $params = [$gameId, $inviterId, $inviteeId];
        } else {
            $sql = "SELECT * FROM {$this->table} WHERE game_id = ? AND inviter_id = ? AND email = ?";
            $params = [$gameId, $inviterId, $email];
        }
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Generate a unique invitation token
     * 
     * @return string Unique token
     */
    public function generateToken() {
        do {
            $token = bin2hex(random_bytes(16)); // 32 character token
            $sql = "SELECT COUNT(*) FROM {$this->table} WHERE token = ?";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([$token]);
            $exists = $stmt->fetchColumn() > 0;
        } while ($exists);
        
        return $token;
    }
}