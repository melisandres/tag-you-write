<?php
class Prep {
    public function keywords($words){
        $words = explode(',', $words);
        $cleanedWordArray = [];
        foreach ($words as $word) {
            $cleanWord = trim($word);
            if(!empty($cleanWord)){
                array_push($cleanedWordArray, $cleanWord);
            }
        }
        return $cleanedWordArray;
    }

}




?>