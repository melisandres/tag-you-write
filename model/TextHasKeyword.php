<?php
require_once('Crud.php');

class TextHasKeyword extends Crud{

    public $table = 'text_has_keyword';
    public $primaryKey = 'text_id';
    public $secondaryKey = 'keyword_id';
    public $fillable = ['text_id',
                        'keyword_id'
                        ];


    //this is specific for inserting text_has_keyword entry
    public function insertTextHasKeyWord($data){
        $keyword_id = $data['keyword_id'];
        $text_id = $data['text_id'];
        $fieldName = implode(', ', array_keys($data));
        $fieldValue = ":".implode(', :', array_keys($data));

        $sql = "INSERT INTO $this->table ($fieldName) VALUES ($fieldValue) 
        ON DUPLICATE KEY UPDATE
            keyword_id = VALUES(keyword_id),
            text_id = VALUES(text_id);";

        $stmt = $this->prepare($sql);

        foreach ($data as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }
        $stmt->bindValue(":$key", $value);

        if($stmt->execute()){
            return $this->lastInsertId();
        }else{
            print_r($stmt->errorInfo());
        }
    }

        //receiving keywords on the update page, and checking which ones were previously entered but have now been modified or deleted, here we delete
        public function deleteTextHasKeyword($word, $id){

            $sql = "DELETE text_has_keyword FROM text_has_keyword
                    INNER JOIN keyword  ON text_has_keyword.keyword_id = keyword.id
                    WHERE word = :word;
                    AND text_has_keyword.text_id = :id;";
    
            $stmt = $this->prepare($sql); 
            $stmt->bindValue(":word", $word);
            $stmt->bindValue(":id", $id);
            $stmt->execute(); 
        }


}


?>