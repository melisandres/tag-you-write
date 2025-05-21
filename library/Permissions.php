<?php

class Permissions {

    public static function canEdit($data, $currentUserId) {
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
        $isMyText = $data['writer_id'] == $currentUserId;
        $isPublished = $data['text_status'] == "published";
        // TODO: anything else? 

        return  $currentUserId !== null 
                && $isMyText
                && $isPublished;
    }

    public static function canDelete($data, $currentUserId) {
        $isMyText = $data['writer_id'] == $currentUserId;
        $isDraft = $data['text_status'] == "draft";
        $isIncompleteDraft = $data['text_status'] == "incomplete_draft";

        return  $currentUserId !== null 
                && $isMyText 
                && ($isDraft || $isIncompleteDraft);
    }

    public static function canIterate($data, $currentUserId) {
        $isMyText = $data['writer_id'] == $currentUserId;
        $openForChanges = $data['openForChanges'];
        $isPublished = $data['text_status'] == "published";

        return  $currentUserId !== null 
                && !$isMyText 
                && $openForChanges
                && $isPublished;
    }

    public static function canVote($data, $currentUserId) {
        $isMyText = $data['writer_id'] == $currentUserId;
        $hasContributed = $data['hasContributed'];
        $openForChanges = $data['openForChanges'];

        return  $currentUserId !== null 
                && !$isMyText 
                && $hasContributed 
                && $openForChanges;
    }

    public static function canPublish($data, $currentUserId) {
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
            'canPublish' => self::canPublish($data, $currentUserId)
        ];
        return $data;
    }
}

?>
