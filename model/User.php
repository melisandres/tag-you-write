<?php

require_once('Crud.php');

class User extends Crud{
    public $table = 'user';
    public $primaryKey = 'id';

    public $fillable =[
        'id',
        'name',
        'username',
        'password', 
        'privilege_id'
    ];

    public function checkUser($username, $password){
            $sql = "SELECT * FROM $this->table WHERE username = ?";
            $stmt = $this->prepare($sql);
            $stmt->execute(array($username));

            $count = $stmt->rowCount();

            if($count === 1){
               $user = $stmt->fetch();

                if(password_verify($password, $user['password'])){
                    
                    session_regenerate_id();
                    $_SESSION['user_id'] = $user['id'];
                    $_SESSION['user_name'] = $user['name'];
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