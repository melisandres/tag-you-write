<?php

/**
 * DiffService
 * 
 * Handles text diffing between child and parent texts.
 * Generates word-based diffs and counts differences.
 * Uses jfcherng/php-diff library (version 6.10.17, PHP 7.1.3+ compatible).
 */

// Load composer autoload
if (file_exists(__DIR__ . '/../vendor/autoload.php')) {
    require_once __DIR__ . '/../vendor/autoload.php';
}

use Jfcherng\Diff\Differ;
use Jfcherng\Diff\SequenceMatcher;

class DiffService {
    
    /**
     * Normalize text for diffing
     * Strips HTML tags and normalizes whitespace
     * 
     * @param string $text The text to normalize
     * @return string The normalized text
     */
    public function normalize($text) {
        if (empty($text)) {
            return '';
        }
        
        // Strip HTML tags
        $normalized = strip_tags($text);
        
        // Normalize whitespace: replace multiple spaces/tabs/newlines with single space
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        
        // Trim leading and trailing whitespace
        $normalized = trim($normalized);
        
        return $normalized;
    }
    
    /**
     * Generate word-based diff between child and parent text
     * 
     * @param string $childText The child text (new text)
     * @param string $parentText The parent text (old text), or empty string for root texts
     * @return array Array of diff blocks with type and text
     */
    public function diff($childText, $parentText = '') {
        // TODO: Root texts compare to empty string - consider removing this logic if it feels broken
        // For root texts, parentText will be empty string
        
        // Normalize both texts
        $normalizedChild = $this->normalize($childText);
        $normalizedParent = $this->normalize($parentText);
        
        // Split into words for word-based diffing
        $childWords = $this->splitIntoWords($normalizedChild);
        $parentWords = $this->splitIntoWords($normalizedParent);
        
        // Generate diff using jfcherng/php-diff
        // Differ takes arrays: old (parent) and new (child)
        $differ = new Differ($parentWords, $childWords, [
            'context' => Differ::CONTEXT_ALL,
            'ignoreWhitespace' => false,
        ]);
        
        // Get the diff as an array of grouped opcodes
        $groupedOpcodes = $differ->getGroupedOpcodes();
        
        // Convert to the required format: [{"type": "equal|delete|insert", "text": "..."}, ...]
        $result = [];
        
        foreach ($groupedOpcodes as $group) {
            foreach ($group as $opcode) {
                // Opcode format: [op, i1, i2, j1, j2]
                // op is an integer bitmask, i1/i2 are old array indices, j1/j2 are new array indices
                list($op, $i1, $i2, $j1, $j2) = $opcode;
                
                // Check opcode type using bitwise AND (op is a bitmask)
                // OP_EQ = 1, OP_DEL = 2, OP_INS = 4, OP_REP = 8
                // Note: OP_REP is a separate flag (not OP_DEL | OP_INS)
                
                if ($op & SequenceMatcher::OP_EQ) {
                    // Equal text - combine words back
                    $text = implode(' ', array_slice($parentWords, $i1, $i2 - $i1));
                    if (!empty($text)) {
                        $result[] = [
                            'type' => 'equal',
                            'text' => $text
                        ];
                    }
                }
                
                // Check for replace first (OP_REP = 8, separate from OP_DEL/OP_INS)
                if ($op & SequenceMatcher::OP_REP) {
                    // Replace = delete + insert
                    $deletedText = implode(' ', array_slice($parentWords, $i1, $i2 - $i1));
                    $insertedText = implode(' ', array_slice($childWords, $j1, $j2 - $j1));
                    
                    if (!empty($deletedText)) {
                        $result[] = [
                            'type' => 'delete',
                            'text' => $deletedText
                        ];
                    }
                    if (!empty($insertedText)) {
                        $result[] = [
                            'type' => 'insert',
                            'text' => $insertedText
                        ];
                    }
                } else {
                    // Check for standalone delete (not part of replace)
                    if ($op & SequenceMatcher::OP_DEL) {
                        $text = implode(' ', array_slice($parentWords, $i1, $i2 - $i1));
                        if (!empty($text)) {
                            $result[] = [
                                'type' => 'delete',
                                'text' => $text
                            ];
                        }
                    }
                    
                    // Check for standalone insert (not part of replace)
                    if ($op & SequenceMatcher::OP_INS) {
                        $text = implode(' ', array_slice($childWords, $j1, $j2 - $j1));
                        if (!empty($text)) {
                            $result[] = [
                                'type' => 'insert',
                                'text' => $text
                            ];
                        }
                    }
                }
            }
        }
        
        return $result;
    }
    
    /**
     * Count the number of word differences
     * Changed words (delete + insert) count as the number of words changed, not deleted + inserted
     * For a change: count max(deleted_words, inserted_words) as 1 change per word position
     * 
     * @param array $diffBlocks The diff blocks from diff()
     * @return int The count of word differences
     */
    public function count($diffBlocks) {
        if (empty($diffBlocks)) {
            return 0;
        }
        
        $count = 0;
        $i = 0;
        $length = count($diffBlocks);
        
        while ($i < $length) {
            $current = $diffBlocks[$i];
            
            if ($current['type'] === 'delete') {
                // Check if next block is an insert (word change)
                if ($i + 1 < $length && $diffBlocks[$i + 1]['type'] === 'insert') {
                    // This is a word change - count the maximum of deleted and inserted words
                    // This represents the number of word positions that changed
                    $deletedWords = $this->countWords($current['text']);
                    $insertedWords = $this->countWords($diffBlocks[$i + 1]['text']);
                    $count += max($deletedWords, $insertedWords);
                    $i += 2; // Skip both delete and insert
                } else {
                    // Just a deletion
                    $count += $this->countWords($current['text']);
                    $i++;
                }
            } elseif ($current['type'] === 'insert') {
                // Check if previous block was a delete (word change)
                if ($i > 0 && $diffBlocks[$i - 1]['type'] === 'delete') {
                    // Already counted as part of the change
                    $i++;
                } else {
                    // Just an insertion
                    $count += $this->countWords($current['text']);
                    $i++;
                }
            } else {
                // Equal - skip
                $i++;
            }
        }
        
        return $count;
    }
    
    /**
     * Split text into words
     * 
     * @param string $text The text to split
     * @return array Array of words
     */
    private function splitIntoWords($text) {
        if (empty($text)) {
            return [];
        }
        
        // Split by whitespace, but keep punctuation attached to words
        // This regex splits on whitespace while preserving word boundaries
        $words = preg_split('/\s+/', $text, -1, PREG_SPLIT_NO_EMPTY);
        
        return $words;
    }
    
    /**
     * Count words in a text string
     * 
     * @param string $text The text to count words in
     * @return int The word count
     */
    private function countWords($text) {
        if (empty($text)) {
            return 0;
        }
        
        $words = $this->splitIntoWords($text);
        return count($words);
    }
}
