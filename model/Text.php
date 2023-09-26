<?php
require_once('Crud.php');

class Text extends Crud{

    public $table = 'text';
    public $primaryKey = 'id';
    public $fillable = ['id',
                        'date',
                        'writing',
                        'writer_id',
                        'parent_id',
                        'title'
                        ];

    //returns all the  texts along with the name of the writer of the text
    //in the display all texts page
    public function selectTexts(){
        $sql = "SELECT text.*, 
                writer.firstName AS firstName, 
                writer.lastName AS lastName
                FROM text
                INNER JOIN writer 
                ON text.writer_id = writer.id;";

        $stmt = $this->query($sql);
        $stmt->execute();

        return $stmt->fetchAll();
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
}


?>