<?php

abstract class Crud extends PDO{

    public function __construct(){
        parent::__construct('mysql:host=localhost; dbname=tag; port=8889; charset=utf8', 'root', '');
    }

    public function select($field = 'id', $order = null){
        $sql = "SELECT * FROM $this->table ORDER BY $field $order";
        $stmt = $this->query($sql);
        return $stmt->fetchAll();
    }

    public function selectId($value){
        $sql = "SELECT * FROM $this->table WHERE $this->primaryKey = :$this->primaryKey";


        $stmt = $this->prepare($sql);
        $stmt->bindValue(":$this->primaryKey", $value);
        $stmt->execute();

        $count = $stmt->rowCount();
        if($count == 1){
            //print_r($stmt->fetch());
            return $stmt->fetch();
        }else{
            header("location: ../../home/error");
            exit;
        }   
    }

    public function insert($data){
        $fieldName = implode(', ', array_keys($data));
        $fieldValue = ":".implode(', :', array_keys($data));

        $sql = "INSERT INTO $this->table ($fieldName) VALUES ($fieldValue)";

        $stmt = $this->prepare($sql);

        foreach ($data as $key => $value) {
            $stmt->bindValue(":$key", $value);
        }

        if($stmt->execute()){
            return $this->lastInsertId();
        }else{
            print_r($stmt->errorInfo());
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
            return $this->lastInsertId();
        }else{
            print_r($stmt->errorInfo);
        }

    }


}

?>