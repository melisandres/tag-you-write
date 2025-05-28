<?php
require_once('Crud.php');

class Vote extends Crud{

    public $table = 'vote';
    public $primaryKey = ['writer_id', 'text_id'];
    public $fillable = ['text_id',
                        'writer_id'
                        ];
    
    public function checkWin($text_id){
        // Fetch the updated vote count and player count
        $sql = "SELECT 
                    (SELECT COUNT(*) FROM vote WHERE text_id = :text_id) AS voteCount,
                    (SELECT COUNT(*) - 1 FROM game_has_player WHERE game_id = (SELECT game_id FROM text WHERE id = :text_id)) AS playerCountMinusOne";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':text_id', $text_id);
        $stmt->execute();
        return $stmt->fetch();
    }
}