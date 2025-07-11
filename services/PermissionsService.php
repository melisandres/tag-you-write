<?php
/**
 * Permissions Service
 * 
 * This service provides permission handling for both controller and non-controller contexts.
 * It combines functionality from both library/Permissions.php and Controller->addPermissions().
 * 
 * ARCHITECTURAL STRATEGY:
 * ----------------------
 * This implementation centralizes the permission normalization and recursion logic
 * while still leveraging the core permission rules from library/Permissions.php.
 * 
 * The service provides a single entry point (addPermissions) that:
 * 1. Normalizes boolean values in the data
 * 2. Applies permissions through the Permissions library
 * 3. Recursively processes any child nodes
 * 
 * This allows for consistent permission handling across both controller contexts
 * and direct access contexts like Server-Sent Events.
 */

require_once(__DIR__ . '/../library/Permissions.php');

class PermissionsService {
    /**
     * Apply permissions to node data and recursively to its children
     * 
     * This combines the normalization from Controller->addPermissions() with
     * permission aggregation from Permissions::aggregatePermissions().
     * 
     * @param array &$node The node to apply permissions to
     * @param int|null $currentUserId The current user's ID
     * @param array $hierarchy Optional hierarchy for complex permission rules
     * @return array The node with permissions applied
     */
    public static function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        // First normalize boolean values
        self::normalizeValues($node);
        
        // Then apply permissions using the original Permissions class
        $node = Permissions::aggregatePermissions($node, $currentUserId);
        
        // Recursively process children if any
        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                self::addPermissions($child, $currentUserId, $hierarchy);
            }
        }
        
        return $node;
    }
    
    /**
     * Normalize boolean values in node data
     * 
     * @param array &$node The node data to normalize (passed by reference)
     */
    private static function normalizeValues(&$node) {
        // Convert integer values to boolean (from Controller->addPermissions)
        $node['hasContributed'] = isset($node['hasContributed']) ? $node['hasContributed'] == 1 : false;
        $node['isWinner'] = isset($node['isWinner']) ? $node['isWinner'] == 1 : false;
        $node['openForChanges'] = isset($node['openForChanges']) ? $node['openForChanges'] == 1 : true;
        
        // Normalize game permission fields
        $node['joinable_by_all'] = isset($node['joinable_by_all']) ? (bool)$node['joinable_by_all'] : true;
        $node['visible_to_all'] = isset($node['visible_to_all']) ? (bool)$node['visible_to_all'] : true;
        $node['hasInvitation'] = isset($node['hasInvitation']) ? (bool)$node['hasInvitation'] : false;
        
        // Other boolean fields that might need normalization
        $booleanFields = ['hasVoted', 'is_winner'];
        foreach ($booleanFields as $field) {
            if (isset($node[$field])) {
                $node[$field] = (bool)$node[$field];
            }
        }
    }
} 