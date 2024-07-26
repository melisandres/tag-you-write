<?php

RequirePage::model('Vote');
RequirePage::model('Writer');
RequirePage::model('Text');
RequirePage::controller('ControllerGame');

class ControllerVote extends Controller {

    public function index(){

    }

    public function voteToggle($id, $isConfirmed = false) {
        $vote = new Vote;
        $text_id = $id;
        $writer_id = $_SESSION['writer_id'];
        $data = ['writer_id' => $writer_id, 'text_id' => $text_id];
    
        // Check if this is a vote or an unvote action
        $alreadyVoted = $vote->selectCompositeId($data);
    
        // Get number of votes and players from db
        $result = $vote->checkWin($text_id);
    
        // Adjust the vote count from the db, with the current vote
        $voteCount = $alreadyVoted ? $result['voteCount'] - 1 : $result['voteCount'] + 1;
        $playerCountMinusOne = $result['playerCountMinusOne'];
    
        // Check if the vote makes the text a winning text
        $isWinningVote = $voteCount >= $playerCountMinusOne;

        //initialize $voted to something... not true or false...
        $voted = "pending";
    
        // Toggle between saving or deleting the vote
        // But first, make sure that it isn't a winning vote
        // Or that if it is a winning vote, that it has been confirmed
        if(!$isWinningVote || ($isWinningVote && $isConfirmed == "true")){
            if ($alreadyVoted) {
                $vote->deleteComposite($data);
                $voted = false;
            } else {
                $vote->saveComposite($data);
                $voted = true;
            }
        }

        // HERE. TRIGGER THE WIN STUFF... UPDATE THE GAME
        if($isWinningVote && $isConfirmed == "true"){
            $gameController = new ControllerGame;
            $gameController->closeGame($text_id); 
        }

        //check if you are getting gameID
        $text = new Text;
        $gameId = $text->selectGameId($text_id); 
    
        // Build the response data
        $response = [
            'textId' => $text_id,
            'alreadyVoted' => $alreadyVoted,
            'voted' => $voted,
            'voteCount' => $voteCount,
            'playerCountMinusOne' => $playerCountMinusOne,
            'isWinningVote' => $isWinningVote,
            'isConfirmed' => $isConfirmed,
            'confirmationRequired' => $isWinningVote && $isConfirmed == "false",
            'gameId' => $gameId
        ];
    
        // Return a JSON response
        echo json_encode($response);
    }
}