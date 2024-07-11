<?php
require_once('Crud.php');

class Writer extends Crud{

    public $table = 'writer';
    public $primaryKey = 'id';

    public $fillable = ['id',
                        'firstName',
                        'lastName',
                        'email',
                        'birthday',
                        'password',
                        'privilege_id'
                        ];


    public function writerExists($email){

        $sql = "SELECT * FROM $this->table WHERE email = :$email";

        $stmt = $this->prepare($sql);
        $stmt->bindValue(":$email", $email);
        $stmt->execute();

        $count = $stmt->rowCount();
        if($count == 1){
            return $stmt->fetch();
        }else{
            return false;
        }  
    }

    public function checkWriter($email, $password){
        $sql = "SELECT * FROM $this->table WHERE email = ?";
        $stmt = $this->prepare($sql);
        try {
            $stmt->execute(array($email));
        } catch (PDOException $e) {
            echo "Error: " . $e->getMessage();
        }
        $errorInfo = $stmt->errorInfo();
        if ($errorInfo[0] !== '00000') {
            echo "SQLSTATE error code: " . $errorInfo[0] . "<br>";
            echo "Driver-specific error code: " . $errorInfo[1] . "<br>";
            echo "Driver-specific error message: " . $errorInfo[2] . "<br>";
            die;
        }

        $stmt->execute(array($email));

        $count = $stmt->rowCount();

        if($count === 1){
            $writer = $stmt->fetch();

            if(password_verify($password, $writer['password'])){
                
                session_regenerate_id();
                $_SESSION['writer_id'] = $writer['id'];
                $_SESSION['privilege'] = $writer['privilege_id'];
                //eventually I should put the user_id here too! 
                //if I use a user, all of this will be in the user controller etc...
                $_SESSION['writer_firstName'] = $writer['firstName'];
                $_SESSION['writer_lastName'] = $writer['lastName'];
                $_SESSION['writer_userName'] = $writer['email'];
                $_SESSION['fingerPrint'] = md5($_SERVER['HTTP_USER_AGENT'].$_SERVER['REMOTE_ADDR']);
                /* RequirePage::redirect('client'); */
                return true;
            }else{
                return false;
            }
        }else{
            return false;
        } 

    }

} 


?>