<?php

abstract class Crud extends PDO{

    public function __construct(){
        parent::__construct('mysql:host=localhost; dbname=tag; port=8889; charset=utf8', 'root', '');
    }

    //this is only being called by writer, at the moment, but it's so general I hesitate to put it in the writer model
    public function select($order = null){
        $sql = "SELECT * FROM $this->table ORDER BY $this->primaryKey $order";
        $stmt = $this->query($sql);
        return $stmt->fetchAll();
    }

    public function selectId($value, $id = null){
        if($id == null) $id = $this->primaryKey;

        $sql = "SELECT * FROM $this->table WHERE $id = :$id";

        $stmt = $this->prepare($sql);
        $stmt->bindValue(":$id", $value);
        $stmt->execute();

        $count = $stmt->rowCount();
        if($count == 1){
            return $stmt->fetch();
        }else{
            return false;
        }   
    }

    public function insert($data, $keyWordInsert = false){
        $fieldName = implode(', ', array_keys($data));
        $fieldValue = ":".implode(', :', array_keys($data));
        $keywordExtra = null;
        if ($keyWordInsert){
            $keywordExtra = "ON DUPLICATE KEY UPDATE word = VALUES(word)";
        }

        $sql = "INSERT INTO $this->table ($fieldName) VALUES ($fieldValue) $keywordExtra";

        $stmt = $this->prepare($sql);

        foreach ($data as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        if($stmt->execute()){
            return $this->lastInsertId();
        }else{
            return $stmt->errorInfo();
        }

        return $this->lastInsertId();
    }


    public function update($data){
        $fieldName = null;

        foreach ($data as $key => $value) {
            $fieldName .= "$key = :$key, "; 
        }

        $fieldName = rtrim($fieldName, ", ");

        $sql = "UPDATE $this->table SET $fieldName WHERE $this->primaryKey = :$this->primaryKey;";

        $stmt = $this->prepare($sql);
        foreach ($data as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        if($stmt->execute()){
            return;
        }else{
            Twig::render('home-error.php', ['message'=> "Sorry, there was an error updating."]);
        }

    }


    //returns the text as well as the first and last name of the writer
    //by id I'm not using the variables I'm passing--this is a little confusing 
    //it might make sense to also get the keywords here.
    public function selectIdText($idValue, $url='writer'){
        $table = $this->table;
        $primaryKey = $this->primaryKey;
        $sql = "SELECT text.*, writer.firstName AS firstName, 
                writer.lastName AS lastName 
                FROM $table INNER JOIN writer 
                ON text.writer_id = writer.id 
                WHERE $table.$primaryKey = :$primaryKey;";
        
        $stmt = $this->prepare($sql);
        $stmt->bindValue(":$primaryKey", $idValue);
        $stmt->execute();

        $count = $stmt->rowCount();
        if ($count == 1){
            return $stmt->fetch();
        }else{
            exit;
        }
    }

    //returns an array where the keys are keyword.id and the values are keyword.word. These values are only the ones associated to the text.id sent to the function
    public function selectKeyword($idValue){
        $sql = "SELECT word, id 
                FROM keyword 
                INNER JOIN text_has_keyword 
                ON keyword_id = keyword.id 
                WHERE text_id = :$this->primaryKey";

        $stmt = $this->prepare($sql);
        $stmt->bindValue(":$this->primaryKey", $idValue);
        $stmt->execute();

        $result = array();

        while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
            $result[$row['id']] = $row['word'];
        }
    
        return $result;
    }

    //returns the id of the keyword sent as the value of a one-item associative array
    //I'm iterating elsewhere and sending it here... but it may be better to combine functions
    public function selectWordId($assArr){
        $value = $assArr['word'];
        $sql = "SELECT id FROM keyword WHERE word = :word;";

        $stmt = $this->prepare($sql);
        $stmt->bindValue(":word", $value);
        $stmt->execute();

        $count = $stmt->rowCount();
        if ($count == 1){
            return $stmt->fetch();
        }else{
            exit;
        }
    }

    public function delete($value){
        $sql = "DELETE FROM $this->table WHERE $this->primaryKey = :$this->primaryKey;";
        $stmt = $this->prepare($sql); 
        $stmt->bindValue(":$this->primaryKey", $value);
        if ($stmt->execute()){
            return true;
        }else{
            return false;
        }
    }
}

?>