<?php

    /**
     * Validation
     *
     * Semplice classe PHP per la validazione.
     *
     * @author Davide Cesarano <davide.cesarano@unipegaso.it>
     * @copyright (c) 2016, Davide Cesarano
     * @license https://github.com/davidecesarano/Validation/blob/master/LICENSE MIT License
     * @link https://github.com/davidecesarano/Validation
     */

    class Validation {
        public $name;
        public $value;
        public $file;
        /**TODO: all values need to be initialised here */

        /**
         * @var array $patterns
         */
        public $patterns = array(
            'uri'           => '[A-Za-z0-9-\/_?&=]+',
            'url'           => '[A-Za-z0-9-:.\/_?&=#]+',
            'alpha'         => '[\p{L}]+',
            'words'         => '[\p{L}\s]+',
            'alphanum'      => '[\p{L}0-9]+',
            'int'           => '[0-9]+',
            'float'         => '[0-9\.,]+',
            'tel'           => '[0-9+\s()-]+',
            'text'          => '[\p{L}0-9\s-.,;:!"%&()?+\'°#\/@]+',
            'file'          => '[\p{L}\s0-9-_!%&()=\[\]#@,.;+]+\.[A-Za-z0-9]{2,4}',
            'folder'        => '[\p{L}\s0-9-_!%&()=\[\]#@,.;+]+',
            'address'       => '[\p{L}0-9\s.,()°-]+',
            'date_dmy'      => '[0-9]{1,2}\-[0-9]{1,2}\-[0-9]{4}',
            'date_ymd'      => '[0-9]{4}\-[0-9]{1,2}\-[0-9]{1,2}',
            'email'         => '[_a-z0-9-]+(\.[_a-z0-9-]+)*@[a-z0-9-]+(\.[a-z0-9-]+)*(\.[a-z]{2,3})',
            'keywords'      => '^([\w\s]+)(, [\w\s]+)*$'
        );

        /**
         * @var array $errors
         */
        public $errors = array();

        /**
         * Nome del campo
         *
         * @param string $name
         * @return this
         */
        public function name($name){

            $this->name = $name;
            return $this;

        }

        /**
         * Valore del campo
         *
         * @param mixed $value
         * @return this
         */
        public function value($value){

            $this->value = $value;
            return $this;

        }

        /**
         * File
         *
         * @param mixed $value
         * @return this
         */
        public function file($value){

            $this->file = $value;
            return $this;

        }

        /**
         * Pattern da applicare al riconoscimento
         * dell'espressione regolare
         *
         * @param string $name nome del pattern
         * @return this
         */
        public function pattern($name){

            if($name == 'array'){

                if(!is_array($this->value)){
                    $this->errors[] = 'The format of the '.$this->name.' field is not valid.';
                    //$this->errors[] = 'Le format du champ '.$this->name.' n\'est pas valide.';
                }

            }else{

                $regex = '/^('.$this->patterns[$name].')$/u';
                if($this->value != '' && !preg_match($regex, $this->value)){
                    $this->errors[] = 'The format of the '.$this->name.' field is not valid.';
                    //$this->errors[] = 'Le format du champ '.$this->name.' n\'est pas valide.';
                }

            }
            return $this;

        }


        /**
         * Validate word count
         *
         * @param int $maxWords Maximum additional words allowed
         * @param string $parentText The parent text passed down to the user
         * @return $this
         */
        public function wordCount($maxWords, $parentText = '') {
            $parentWordCount = str_word_count($parentText);
            $userWordCount = str_word_count($this->value);
            $newWordsCount = $userWordCount - $parentWordCount;

            $parentWordCount > 0 ? $additional = ' additional' : $additional = '';

            if ($newWordsCount > $maxWords) {
                $this->errors[] = 'The '.$this->name.' field exceeds the maximum allowed word count of '.$maxWords.$additional.' words.';
            }

            return $this;
        }

        /**
         * Validate keyword count
         *
         * @param int $maxWords Maximum additional words allowed
         * @return $this
         */
        public function keywordCount($maxWords) {
            // Split keywords by comma, then count words in each keyword
            $keywords = explode(',', $this->value);
            $keyWordCount = 0;
            $keyWordsCount = count($keywords);

            foreach ($keywords as $keyword) {
                // Trim and count words in each keyword
                $wordCount = str_word_count(trim($keyword));
                if($wordCount > 2){
                    $keyWordCount = $wordCount;
                }
            }

            if ($keyWordCount > 2) {
                $this->errors[] = 'A key word any longer than 2 words is just too long.';
            }

            if ($keyWordsCount > $maxWords){
                $this->errors[] = 'The '.$this->name.' field exceeds the maximum allowed word count of '.$maxWords.' words.';
            }

            return $this;
        }


        /**
         * Pattern personalizzata
         *
         * @param string $pattern
         * @return this
         */
        public function customPattern($pattern){

            $regex = '/^('.$pattern.')$/u';
            if($this->value != '' && !preg_match($regex, $this->value)){
                $this->errors[] = 'The format of the '.$this->name.' field is not valid.';
                //$this->errors[] = 'Le format du champ '.$this->name.' n\'est pas valide.';
            }
            return $this;

        }

        /**
         * Campo obbligatorio
         *
         * @return this
         */
        public function required(){

            if((isset($this->file) && $this->file['error'] == 4) || ($this->value == '' || $this->value == null)){
                $this->errors[] = 'The '.$this->name.' field is required.';
                //$this->errors[] = 'Le champ '.$this->name.' est obligatoire.';
            }
            return $this;

        }

        /**
         * Lunghezza minima
         * del valore del campo
         *
         * @param int $min
         * @return this
         */
        public function min($length){

            if(is_string($this->value)){

                if(strlen($this->value) < $length){
                    $this->errors[] = 'La value of the '.$this->name.' field is bellow its minimal value.';
                    //$this->errors[] = 'La valeur du champ '.$this->name.' est inférieur à la valeur minimale';
                }

            }else{

                if($this->value < $length){
                    $this->errors[] = 'La value of the '.$this->name.' field is bellow its minimal value.';
                    //$this->errors[] = 'La valeur du champ '.$this->name.' est inférieur à la valeur minimale';
                }

            }
            return $this;

        }

        /**
         * Lunghezza massima
         * del valore del campo
         *
         * @param int $max
         * @return this
         */
        public function max($length){

            if(is_string($this->value)){

                if(strlen($this->value) > $length){
                    $this->errors[] = 'La value of the '.$this->name.' field is above its max value.';
                    //$this->errors[] = 'La valeur du champ '.$this->name.' est supérieur à la valeur maximale';
                }

            }else{

                if($this->value > $length){
                    $this->errors[] = 'La value of the '.$this->name.' field is above its max value.';
                    //$this->errors[] = 'La valeur du champ '.$this->name.' est supérieur à la valeur maximale';
                }

            }
            return $this;

        }

        /**
         * Confronta con il valore di
         * un altro campo
         *
         * @param mixed $value
         * @return this
         */
        public function equal($value){

            if($this->value != $value){
                $this->errors[] = 'La value of the '.$this->name.' does not match.';
                //$this->errors[] = 'La valeur du champ '.$this->name.' ne correspond pas.';
            }
            return $this;

        }

        /**
         * Dimensione massima del file
         *
         * @param int $size
         * @return this
         */
        public function maxSize($size){

            if($this->file['error'] != 4 && $this->file['size'] > $size){
                $this->errors[] = 'The file '.$this->name.' is larger than the max size of '.number_format($size / 1048576, 2).' MB.';
                //$this->errors[] = 'Le fichier'.$this->name.' dépasse la taille maximale de '.number_format($size / 1048576, 2).' MB.';
            }
            return $this;

        }

        /**
         * Estensione (formato) del file
         *
         * @param string $extension
         * @return this
         */
        public function ext($extension){

            if($this->file['error'] != 4 && pathinfo($this->file['name'], PATHINFO_EXTENSION) != $extension && strtoupper(pathinfo($this->file['name'], PATHINFO_EXTENSION)) != $extension){
                $this->errors[] = 'The file '.$this->name.' is not a '.$extension.' file.';
                //$this->errors[] = 'Il file '.$this->name.' non è un '.$extension.'.';
            }
            return $this;

        }

        /**
         * Purifica per prevenire attacchi XSS
         *
         * @param string $string
         * @return $string
         */
        public function purify($string){
            return htmlspecialchars($string, ENT_QUOTES, 'UTF-8');
        }

        /**
         * Campi validati
         *
         * @return boolean
         */
        public function isSuccess(){
            if(empty($this->errors)) return true;
        }

        /**
         * Errori della validazione
         *
         * @return array $this->errors
         */
        public function getErrors(){
            if(!$this->isSuccess()) return $this->errors;
        }

        /**
         * Visualizza errori in formato Html
         *
         * @return string $html
         */
        public function displayErrors(){

            $html = '<ul>';
                foreach($this->getErrors() as $error){
                    $html .= '<li>'.$error.'</li>';
                }
            $html .= '</ul>';

            return $html;

        }

        /**
         * Visualizza risultato della validazione
         *
         * @return booelan|string
         */
        public function result(){

            if(!$this->isSuccess()){

                foreach($this->getErrors() as $error){
                    echo "$error\n";
                }
                exit;

            }else{
                return true;
            }

        }

        /**
         * Verifica se il valore è
         * un numero intero
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_int($value){
            if(filter_var($value, FILTER_VALIDATE_INT)) return true;
        }

        /**
         * Verifica se il valore è
         * un numero float
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_float($value){
            if(filter_var($value, FILTER_VALIDATE_FLOAT)) return true;
        }

        /**
         * Verifica se il valore è
         * una lettera dell'alfabeto
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_alpha($value){
            if(filter_var($value, FILTER_VALIDATE_REGEXP, array('options' => array('regexp' => "/^[a-zA-Z]+$/")))) return true;
        }

        /**
         * Verifica se il valore è
         * una lettera o un numero
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_alphanum($value){
            if(filter_var($value, FILTER_VALIDATE_REGEXP, array('options' => array('regexp' => "/^[a-zA-Z0-9]+$/")))) return true;
        }

        /**
         * Verifica se il valore è
         * un url
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_url($value){
            if(filter_var($value, FILTER_VALIDATE_URL)) return true;
        }

        /**
         * Verifica se il valore è
         * un uri
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_uri($value){
            if(filter_var($value, FILTER_VALIDATE_REGEXP, array('options' => array('regexp' => "/^[A-Za-z0-9-\/_]+$/")))) return true;
        }

        /**
         * Verifica se il valore è
         * true o false
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_bool($value){
            if(is_bool(filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE))) return true;
        }

        /**
         * Verifica se il valore è
         * un'e-mail
         *
         * @param mixed $value
         * @return boolean
         */
        public static function is_email($value){
            if(filter_var($value, FILTER_VALIDATE_EMAIL)) return true;
        }

        /**
         * Check if text is different from parent text
         *
         * @param string $parentText The parent text to compare against
         * @return $this
         */
        public function differentFrom($parentText) {
            if ($parentText && $this->value === $parentText) {
                $this->errors[] = 'The '.$this->name.' field must be different from the parent text.';
            }
            return $this;
        }

    }
