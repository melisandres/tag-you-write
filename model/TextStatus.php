<?php
require_once('Crud.php');

class TextStatus extends Crud{

    public $table = 'text_status';
    public $primaryKey = 'id';
    public $fillable = ['status'];

    public function selectStatusByName($statusName) {
        $sql = "SELECT id FROM $this->table WHERE status = :name";
        $stmt = $this->pdo->prepare($sql);
        $stmt->bindValue(':name', $statusName);
        $stmt->execute();
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
}