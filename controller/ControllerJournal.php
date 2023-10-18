<?php

RequirePage::model('Journal');

class ControllerJournal extends Controller{

    public function index(){
        $journal = new Journal;
        $select = $journal->selectJournal();
        Twig::render('journal.php', ['data'=>$select]);
    }
    public function addToJournal(){
        $ip = $_SERVER['REMOTE_ADDR'];
        
        $page = $_SERVER["REDIRECT_URL"];

        $writer_id = null;
        if(isSet($_SESSION["writer_id"])){
            $writer_id = $_SESSION["writer_id"];
        }

        $data = ["ip"=>$ip, 
                "page"=>$page,
                "writer_id"=>$writer_id];
        $journal = new Journal;
        $insert = $journal->insert($data);
    }
}