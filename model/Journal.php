 <?php
 require_once('Crud.php');

 class Journal extends Crud{
    public $table = 'journal';
    public $primaryKey = 'id';
    public $fillable = ['ip',
                        'date',
                        'name',
                        'page'
                        ];

    public function selectJournal(){
        $sql = "SELECT $this->table.*, 
                writer.firstName AS firstName, 
                writer.lastName AS lastName
                FROM $this->table
                LEFT JOIN writer 
                ON $this->table.writer_id = writer.id
                ORDER BY journal.date DESC";

        $stmt = $this->query($sql);
        $stmt->execute();

        return $stmt->fetchAll();
    }

 }