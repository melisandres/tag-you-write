<?php

RequirePage::model('Vote');
RequirePage::model('Writer');
RequirePage::model('Text');

class ControllerVote extends Controller {

    public function index(){

    }

    public function voteToggle($id){
        //TODO: doublecheck if you're allowed to vote on this story
        //STEPS: find the root parent, do a hasContributed check from root parent
        //I can wait and do this later

        //TODO: check if there's such a vote in the db
        //STEPS: SELECT if you get an answer--unvote, else vote
        $vote = new Vote;

        $text_id = $id;
        $writer_id = $_SESSION['writer_id'];
        $data = ['writer_id'=>$writer_id,'text_id'=>$text_id];

        //check if theres a vote in the db for this text and writer
        $alreadyVoted = $vote->selectCompositeId($data);

        // Toggle between saving or deleting the vote
        if ($alreadyVoted) {
            $vote->deleteVote($data);
            $voted = false;
        } else {
            $vote->saveVote($data);
            $voted = true;
        }

        // Return a JSON response
        echo json_encode(['voted' => $voted]);
    }
}