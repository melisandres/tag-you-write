<?php
class Prep {
    public function keywords($words){
        $words = explode(',', $words);
        $cleanedWordArray = [];
        foreach ($words as $word) {
            $word = trim($word);
            if(!empty(trim($word))){
                array_push($cleanedWordArray, trim($word));
            }
        }
        return $cleanedWordArray;
    }

}




?>