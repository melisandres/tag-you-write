<?php
/**
 * Test script for DiffService
 * Tests normalize, diff, and count methods
 */

// Load autoloader
require_once __DIR__ . '/../vendor/autoload.php';

// Load DiffService
require_once __DIR__ . '/../services/DiffService.php';

echo "=== Testing DiffService ===\n\n";

$diffService = new DiffService();

// Test 1: Normalize function
echo "Test 1: Normalize function\n";
echo "---------------------------\n";
$htmlText = "<p>This is   a   test\n\nwith   multiple   spaces</p>";
$normalized = $diffService->normalize($htmlText);
echo "Input:  " . $htmlText . "\n";
echo "Output: " . $normalized . "\n";
echo "Expected: 'This is a test with multiple spaces'\n";
echo ($normalized === "This is a test with multiple spaces" ? "✓ PASS\n" : "✗ FAIL\n");
echo "\n";

// Test 2: Simple diff - word change
echo "Test 2: Simple word change\n";
echo "---------------------------\n";
$parent = "The cat sat on the mat.";
$child = "The cat slept on the mat.";
$diff = $diffService->diff($child, $parent);
echo "Parent: " . $parent . "\n";
echo "Child:  " . $child . "\n";
echo "Diff: " . json_encode($diff, JSON_PRETTY_PRINT) . "\n";
echo "Expected format: [{\"type\":\"equal\",\"text\":\"The cat \"},{\"type\":\"delete\",\"text\":\"sat\"},{\"type\":\"insert\",\"text\":\"slept\"},{\"type\":\"equal\",\"text\":\" on the mat.\"}]\n";
echo "\n";

// Test 3: Count function - word change should count as 1
echo "Test 3: Count function - word change\n";
echo "-------------------------------------\n";
$count = $diffService->count($diff);
echo "Diff count: " . $count . "\n";
echo "Expected: 1 (changed word 'sat' to 'slept' counts as 1, not 2)\n";
echo ($count === 1 ? "✓ PASS\n" : "✗ FAIL (got $count, expected 1)\n");
echo "\n";

// Test 4: Multiple word changes
echo "Test 4: Multiple word changes\n";
echo "------------------------------\n";
$parent2 = "The quick brown fox jumps over the lazy dog.";
$child2 = "The fast red fox leaps over the sleepy dog.";
$diff2 = $diffService->diff($child2, $parent2);
echo "Parent: " . $parent2 . "\n";
echo "Child:  " . $child2 . "\n";
$count2 = $diffService->count($diff2);
echo "Diff count: " . $count2 . "\n";
echo "Expected: 4 (quick->fast, brown->red, jumps->leaps, lazy->sleepy = 4 changes)\n";
echo "\n";

// Test 5: Word addition
echo "Test 5: Word addition\n";
echo "----------------------\n";
$parent3 = "The cat sat.";
$child3 = "The cat sat on the mat.";
$diff3 = $diffService->diff($child3, $parent3);
$count3 = $diffService->count($diff3);
echo "Parent: " . $parent3 . "\n";
echo "Child:  " . $child3 . "\n";
echo "Diff count: " . $count3 . "\n";
echo "Expected: 4 (added 4 words: 'on the mat.')\n";
echo "\n";

// Test 6: Word deletion
echo "Test 6: Word deletion\n";
echo "---------------------\n";
$parent4 = "The cat sat on the mat.";
$child4 = "The cat sat.";
$diff4 = $diffService->diff($child4, $parent4);
$count4 = $diffService->count($diff4);
echo "Parent: " . $parent4 . "\n";
echo "Child:  " . $child4 . "\n";
echo "Diff count: " . $count4 . "\n";
echo "Expected: 4 (deleted 4 words: 'on the mat.')\n";
echo "\n";

// Test 7: Root text (empty parent)
echo "Test 7: Root text (empty parent)\n";
echo "---------------------------------\n";
$parent5 = "";
$child5 = "This is a new root text.";
$diff5 = $diffService->diff($child5, $parent5);
$count5 = $diffService->count($diff5);
echo "Parent: (empty)\n";
echo "Child:  " . $child5 . "\n";
echo "Diff: " . json_encode($diff5, JSON_PRETTY_PRINT) . "\n";
echo "Diff count: " . $count5 . "\n";
echo "Expected: 6 (all words are new: 'This is a new root text.' = 6 words)\n";
echo ($count5 === 6 ? "✓ PASS\n" : "✗ FAIL\n");
echo "\n";

// Test 8: Identical texts
echo "Test 8: Identical texts\n";
echo "-----------------------\n";
$parent6 = "The cat sat on the mat.";
$child6 = "The cat sat on the mat.";
$diff6 = $diffService->diff($child6, $parent6);
$count6 = $diffService->count($diff6);
echo "Parent: " . $parent6 . "\n";
echo "Child:  " . $child6 . "\n";
echo "Diff count: " . $count6 . "\n";
echo "Expected: 0 (no differences)\n";
echo ($count6 === 0 ? "✓ PASS\n" : "✗ FAIL\n");
echo "\n";

// Test 9: HTML in text
echo "Test 9: HTML in text\n";
echo "--------------------\n";
$parent7 = "<p>The <strong>cat</strong> sat.</p>";
$child7 = "<p>The <em>cat</em> slept.</p>";
$diff7 = $diffService->diff($child7, $parent7);
$count7 = $diffService->count($diff7);
echo "Parent: " . $parent7 . "\n";
echo "Child:  " . $child7 . "\n";
echo "Diff: " . json_encode($diff7, JSON_PRETTY_PRINT) . "\n";
echo "Diff count: " . $count7 . "\n";
echo "Expected: 1 (changed 'sat' to 'slept', HTML should be stripped)\n";
echo "\n";

echo "=== Testing Complete ===\n";

