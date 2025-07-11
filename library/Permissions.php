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

        $joinableByAll = (bool)$data['joinable_by_all'];
        $visibleToAll = (bool)$data['visible_to_all'];
        
        // If game is visible to all, user has access
        if ($visibleToAll) {
            return true;
        }
        
        // If game is not visible to all, user must be a player or have invitation
        if ($currentUserId === null) {
            return false;
        }
        
        // Check if user is a player in this game
        $hasContributed = isset($data['hasContributed']) ? (bool)$data['hasContributed'] : false;
        if ($hasContributed) {
            return true;
        }
        
        // Check if user has an invitation to this game
        $hasInvitation = isset($data['hasInvitation']) ? (bool)$data['hasInvitation'] : false;
        if ($hasInvitation) {
            return true;
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
}

?>
