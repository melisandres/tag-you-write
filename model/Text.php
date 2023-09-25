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
}


?>