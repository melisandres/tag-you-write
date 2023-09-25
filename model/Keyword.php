<?php
require_once('Crud.php');

class Keyword extends Crud{

    public $table = 'keyword';
    public $primaryKey = 'id';
    public $secondaryKey = 'word';
    public $fillable = ['id',
                        'word',
                        ];


    //this gets called from a loop, perhaps I should add the 
    //loop in this function. The value sent is an associative array
    //of one element. Technically, I could change the sql statement, 
    //to make it work with other unused lists... $value key is keyword_id, 
    //and so the sql could be populated dynamically. But will I use this
    //sort of function elsewhere?
    public function deleteUnusedKeywords($value){
        $sql = "DELETE FROM $this->table
                WHERE $this->primaryKey = :$this->primaryKey
                AND NOT EXISTS (
                    SELECT 1
                    FROM text_has_keyword
                    WHERE keyword_id = :$this->primaryKey
                    );";
        $stmt = $this->prepare($sql); 
        $stmt->bindValue(":$this->primaryKey", $value);
        if ($stmt->execute()){
            echo "success";
        }else{
            echo "meow: ".$stmt->errorInfo();
        }
    }

    //returns all the keyword_ids associated to this current text.
    public function selectKeywordIds($id, $field='id'){
        $sql ="SELECT keyword_id
        FROM text_has_keyword
        WHERE text_id = :$this->primaryKey;";

        $stmt = $this->prepare($sql);
        $stmt->bindValue(":$this->primaryKey", $id);
        $stmt->execute();

        $count = $stmt->rowCount();
        if ($count >= 1){
            return $stmt->fetchAll();
        }
    }
}


?>