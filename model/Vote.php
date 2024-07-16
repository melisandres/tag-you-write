<?php
require_once('Crud.php');

class Vote extends Crud{

    public $table = 'vote';
    public $primaryKey = ['writer_id', 'text_id'];
    public $fillable = ['text_id',
                        'writer_id'
                        ];

    public function selectCompositeId($values, $keys = null){
        if($keys == null) $keys = $this->primaryKey;

        // Check if the number of values matches the number of keys
        if(count($values) != count($keys)){
            throw new Exception("The number of values must match the number of keys.");
        }

        // Build the WHERE clause with the composite key
        $whereClause = [];
        foreach ($keys as $key) {
            $whereClause[] = "$key = :$key";
        }
        $whereClause = implode(" AND ", $whereClause);

        $sql = "SELECT * FROM $this->table WHERE $whereClause";

        $stmt = $this->prepare($sql);

        // Bind values
        foreach ($keys as $key) {
            $stmt->bindValue(":$key", $values[$key]);
        }
        $stmt->execute();

        $count = $stmt->rowCount();
        if($count == 1){
            return $stmt->fetch();
        }else{
            return false;
        }
    } 

    public function saveVote($values){
        // Ensure values contain both writer_id and text_id
        if (!isset($values['writer_id']) || !isset($values['text_id'])) {
            throw new Exception("Both writer_id and text_id are required.");
        }
    
        $sql = "INSERT INTO $this->table (writer_id, text_id) VALUES (:writer_id, :text_id)
                ON DUPLICATE KEY UPDATE writer_id = :writer_id, text_id = :text_id";
    
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':writer_id', $values['writer_id']);
        $stmt->bindValue(':text_id', $values['text_id']);
    
        return $stmt->execute();
    }

    public function deleteVote($values){
        // Ensure values contain both writer_id and text_id
        if (!isset($values['writer_id']) || !isset($values['text_id'])) {
            throw new Exception("Both writer_id and text_id are required.");
        }
    
        $sql = "DELETE FROM $this->table WHERE writer_id = :writer_id AND text_id = :text_id";
    
        $stmt = $this->prepare($sql);
        $stmt->bindValue(':writer_id', $values['writer_id']);
        $stmt->bindValue(':text_id', $values['text_id']);
    
        return $stmt->execute();
    }    
}