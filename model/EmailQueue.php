<?php
require_once('Crud.php');

class EmailQueue extends Crud {
    public $table = 'email_queue';
    public $primaryKey = 'id';

    public $fillable = [
        'id',
        'recipient_email',
        'recipient_name', 
        'subject',
        'subject_params',
        'message_key',
        'message_params',
        'status',
        'attempts',
        'max_attempts',
        'sent_at',
        'created_at',
        'updated_at'
    ];

    /**
     * Get pending emails for processing
     * 
     * @param int $limit Maximum number of emails to retrieve
     * @return array Array of pending email records
     */
    public function getPendingEmails($limit = 50) {
        $sql = "SELECT * FROM $this->table 
                WHERE status = 'pending' 
                AND attempts < max_attempts 
                ORDER BY created_at ASC 
                LIMIT :limit";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Mark email as sent
     * 
     * @param int $id Email queue ID
     * @return bool Success status
     */
    public function markAsSent($id) {
        return $this->update([
            'id' => $id,
            'status' => 'sent',
            'sent_at' => date('Y-m-d H:i:s')
        ]);
    }

    /**
     * Mark email as failed and increment attempts
     * 
     * @param int $id Email queue ID
     * @return bool Success status
     */
    public function markAsFailed($id) {
        // Get current attempts
        $email = $this->selectId($id);
        if (!$email) {
            return false;
        }

        $newAttempts = $email['attempts'] + 1;
        $status = ($newAttempts >= $email['max_attempts']) ? 'failed' : 'pending';

        return $this->update([
            'id' => $id,
            'status' => $status,
            'attempts' => $newAttempts
        ]);
    }

    /**
     * Get failed emails for review
     * 
     * @param int $limit Maximum number of emails to retrieve
     * @return array Array of failed email records
     */
    public function getFailedEmails($limit = 100) {
        $sql = "SELECT * FROM $this->table 
                WHERE status = 'failed' 
                ORDER BY updated_at DESC 
                LIMIT :limit";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->execute();
        
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Clean up old sent emails (older than 30 days)
     * 
     * @return int Number of deleted records
     */
    public function cleanupOldEmails() {
        $sql = "DELETE FROM $this->table 
                WHERE status = 'sent' 
                AND sent_at < DATE_SUB(NOW(), INTERVAL 30 DAY)";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        
        return $stmt->rowCount();
    }

    /**
     * Get email queue statistics
     * 
     * @return array Statistics by status
     */
    public function getStats() {
        $sql = "SELECT 
                    status,
                    COUNT(*) as count,
                    MAX(created_at) as latest
                FROM $this->table 
                GROUP BY status";
        
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute();
        
        $stats = [];
        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $stats[$row['status']] = [
                'count' => $row['count'],
                'latest' => $row['latest']
            ];
        }
        
        return $stats;
    }
}
?> 