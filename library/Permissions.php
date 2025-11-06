<?php

class Permissions {

    /**
     * Check if user has access to the game based on game-level permissions
     * 
     * @param array $data Text data including game permissions
     * @param int|null $currentUserId Current user ID
     * @return bool True if user has access to the game
     */
    public static function hasGameAccess($data, $currentUserId) {
        // If no game permissions data, assume access (backward compatibility)
        if (!isset($data['joinable_by_all']) || !isset($data['visible_to_all'])) {
            return true;
        }

        // Check if user is a player or has invitation first (they should have access regardless of test status)
        if ($currentUserId !== null) {
            $hasContributed = isset($data['hasContributed']) ? (bool)$data['hasContributed'] : false;
            $hasInvitation = isset($data['hasInvitation']) ? (bool)$data['hasInvitation'] : false;
            
            // If user is already a player or has invitation, they have access
            if ($hasContributed || $hasInvitation) {
                return true;
            }
        }

        // Check is_test status (test game visibility based on privilege)
        $isTest = isset($data['is_test']) ? $data['is_test'] : null;
        if (!empty($isTest)) {
            // This is a test game - check if user has privilege to see it
            if (!self::canViewTestGame($isTest)) {
                // User doesn't have privilege to see this test game level
                // (They would have been filtered out in the query, but this is a safety check)
                return false;
            }
        }

        // Check visible_to_all (standard visibility check)
        $visibleToAll = (bool)$data['visible_to_all'];
        if ($visibleToAll) {
            return true;
        }
        
        // If game is not visible to all and user is not a player/has no invitation, deny access
        if ($currentUserId === null) {
            return false;
        }
        
        return false;
    }

    /**
     * Check if user can join/contribute to the game
     * 
     * @param array $data Text data including game permissions
     * @param int|null $currentUserId Current user ID
     * @return bool True if user can join the game
     */
    public static function canJoinGame($data, $currentUserId) {
        // If no game permissions data, assume joinable (backward compatibility)
        if (!isset($data['joinable_by_all'])) {
            return true;
        }

        $joinableByAll = (bool)$data['joinable_by_all'];
        
        // If game is joinable by all, user can join
        if ($joinableByAll) {
            return true;
        }
        
        // If game requires invitation, user must already be a player or have invitation
        if ($currentUserId === null) {
            return false;
        }
        
        // Check if user is already a player in this game
        $hasContributed = isset($data['hasContributed']) ? (bool)$data['hasContributed'] : false;
        if ($hasContributed) {
            return true;
        }
        
        // Check if user has an invitation to this game
        $hasInvitation = isset($data['hasInvitation']) ? (bool)$data['hasInvitation'] : false;
        return $hasInvitation;
    }

    public static function canEdit($data, $currentUserId) {
        // First check game-level access
        if (!self::hasGameAccess($data, $currentUserId)) {
            return false;
        }
        
        $isMyText = $data['writer_id'] == $currentUserId;
        $openForChanges = $data['openForChanges'];
        $isDraft = $data['text_status'] == "draft";
        $isIncompleteDraft = $data['text_status'] == "incomplete_draft";

        return  $currentUserId !== null 
                && $isMyText
                //&& $openForChanges
                && ($isDraft || $isIncompleteDraft);
    }

    public static function canAddNote($data, $currentUserId){
        // First check game-level access
        if (!self::hasGameAccess($data, $currentUserId)) {
            return false;
        }
        
        $isMyText = $data['writer_id'] == $currentUserId;
        $openForChanges = $data['openForChanges'];
        $isPublished = $data['text_status'] == "published";

        return  $currentUserId !== null 
                && $isMyText
                && $openForChanges
                && $isPublished;
    }

    // TODO: not sure if this is needed. I may need a little logic to allow a writer to save a note after a game is closed, but only if they started writing it before the game closed.
    public static function canFinishNote($data, $currentUserId){
        // First check game-level access
        if (!self::hasGameAccess($data, $currentUserId)) {
            return false;
        }
        
        $isMyText = $data['writer_id'] == $currentUserId;
        $isPublished = $data['text_status'] == "published";
        // TODO: anything else? 

        return  $currentUserId !== null 
                && $isMyText
                && $isPublished;
    }

    public static function canDelete($data, $currentUserId) {
        // First check game-level access
        if (!self::hasGameAccess($data, $currentUserId)) {
            return false;
        }
        
        $isMyText = $data['writer_id'] == $currentUserId;
        $isDraft = $data['text_status'] == "draft";
        $isIncompleteDraft = $data['text_status'] == "incomplete_draft";

        return  $currentUserId !== null 
                && $isMyText 
                && ($isDraft || $isIncompleteDraft);
    }

    public static function canIterate($data, $currentUserId) {
        // First check game-level access and joinability
        if (!self::hasGameAccess($data, $currentUserId) || !self::canJoinGame($data, $currentUserId)) {
            return false;
        }
        
        $isMyText = $data['writer_id'] == $currentUserId;
        $openForChanges = $data['openForChanges'];
        $isPublished = $data['text_status'] == "published";

        return  $currentUserId !== null 
                && !$isMyText 
                && $openForChanges
                && $isPublished;
    }

    public static function canVote($data, $currentUserId) {
        // First check game-level access
        if (!self::hasGameAccess($data, $currentUserId)) {
            return false;
        }
        
        $isMyText = $data['writer_id'] == $currentUserId;
        $hasContributed = $data['hasContributed'];
        $openForChanges = $data['openForChanges'];

        return  $currentUserId !== null 
                && !$isMyText 
                && $hasContributed 
                && $openForChanges;
    }

    public static function canPublish($data, $currentUserId) {
        // First check game-level access and joinability
        if (!self::hasGameAccess($data, $currentUserId) || !self::canJoinGame($data, $currentUserId)) {
            return false;
        }
        
        $isMyText = $data['writer_id'] == $currentUserId;
        $openForChanges = $data['openForChanges'];
        $isDraft = $data['text_status'] == "draft";
 
        return  $currentUserId !== null 
                && $isMyText 
                && $openForChanges
                && $isDraft;
    }

    public static function aggregatePermissions($data, $currentUserId) { 
        $data['permissions'] = [
            'canEdit' => self::canEdit($data, $currentUserId),
            'canAddNote' => self::canAddNote($data, $currentUserId),
            'canDelete' => self::canDelete($data, $currentUserId),
            'canIterate' => self::canIterate($data, $currentUserId),
            'isMyText' => $data['writer_id'] == $currentUserId,
            'canVote' => self::canVote($data, $currentUserId),
            'canPublish' => self::canPublish($data, $currentUserId),
            'hasGameAccess' => self::hasGameAccess($data, $currentUserId),
            'canJoinGame' => self::canJoinGame($data, $currentUserId)
        ];
        return $data;
    }

    /**
     * Get the effective privilege ID for the current user
     * Checks test_privilege session var first (for dev mode toggle), then actual privilege
     * 
     * @return int Privilege ID (1=admin, 2=writer, 3=editor, 4=beta_tester, 0=guest)
     */
    public static function getEffectivePrivilege() {
        // Check for dev mode test privilege first (for Step 8: dev mode toggle)
        if (isset($_SESSION['test_privilege'])) {
            return (int)$_SESSION['test_privilege'];
        }
        
        // Otherwise use actual privilege
        return isset($_SESSION['privilege']) ? (int)$_SESSION['privilege'] : 0;
    }

    /**
     * Check if current user is admin/dev (privilege_id = 1)
     * Supports dev mode toggle via test_privilege session var
     * 
     * @return bool
     */
    public static function isDevOrAdmin() {
        return self::getEffectivePrivilege() == 1;
    }

    /**
     * Check if current user is beta tester (privilege_id = 4)
     * Supports dev mode toggle via test_privilege session var
     * 
     * @return bool
     */
    public static function isBetaTester() {
        return self::getEffectivePrivilege() == 4;
    }

    /**
     * Check if current user can view a specific test game level
     * 
     * @param string|null $isTestValue The is_test value ('dev', 'beta', or NULL)
     * @return bool True if user can view this test game level
     */
    public static function canViewTestGame($isTestValue) {
        // NULL or empty = production game, everyone can view (based on visible_to_all)
        if (empty($isTestValue)) {
            return true;
        }

        $privilege = self::getEffectivePrivilege();

        // Admin/dev can see all test games
        if ($privilege == 1) {
            return true;
        }

        // Beta testers can see 'beta' test games
        if ($isTestValue === 'beta' && $privilege == 4) {
            return true;
        }

        // Regular users cannot see test games (unless they have invitation - handled in query)
        // 'dev' test games are only visible to admin/dev
        return false;
    }
}

?>
