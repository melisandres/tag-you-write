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
        $text = new Text;
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

        // Initialize $voted to something... not true or false...
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

        // Check if you are getting gameID
        $gameId = $text->selectGameId($text_id); 

        // HERE. TRIGGER THE WIN STUFF... UPDATE THE GAME
        if($isWinningVote && $isConfirmed == "true"){
            $gameController = new ControllerGame;
            $gameController->closeGame($text_id); 
            
            // Get the text title for the event
            $textData = $text->selectTexts($writer_id, $text_id);
            
            // Check if this is a root text
            $isRoot = empty($textData['parent_id']);
            
            // Create a special winning vote event
            $this->createEvents('WINNING_VOTE', [
                'textId' => $text_id,
                'gameId' => $gameId,
                'title' => $textData['title'],
                'isRoot' => $isRoot
            ], 'winning_vote');
        }

        // update the game modified_at timestamp: so the UI knows to change how this node is displayed.
        $game = new Game;
        $game->update([
            'id' => $gameId,
            'modified_at' => date('Y-m-d H:i:s')
        ]);

        // update the text modified_at timestamp: so the UI knows to change how this node is displayed.
        $text->update([
            'id' => $text_id,
            'modified_at' => date('Y-m-d H:i:s')
        ]);
    
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

        // Create events for the vote toggle if an action was taken
        // Skip the regular vote event if this is a winning vote (which already creates events)
        if ($voted !== "pending" && !($isWinningVote && $isConfirmed == "true")) {
            // Get the text title for the event
            $textData = $text->selectTexts($writer_id, $text_id);
            
            // Check if this is a root text
            $isRoot = empty($textData['parent_id']);
            
            // Create an event for the vote/unvote action
            $this->createEvents('VOTE_TOGGLE', [
                'textId' => $text_id,
                'gameId' => $gameId,
                'title' => $textData['title'],
                'isRoot' => $isRoot,
                'isVoting' => $voted  // true if voting, false if unvoting
            ], 'vote_toggle');
        }
    
        // Return a JSON response
        echo json_encode($response);
    }
}