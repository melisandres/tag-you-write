<?php

abstract class Controller{
    abstract public function index();

    public function __construct() {
        // No need to require EventManager anymore
    }

    protected function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        RequirePage::service('PermissionsService');
        return PermissionsService::addPermissions($node, $currentUserId, $hierarchy);
    }

    /**
     * Create events for different actions in the application
     * 
     * @param string $eventType The type of event (ROOT_PUBLISH, CONTRIB_PUBLISH, NOTE_ADD, etc.)
     * @param array $data Event data including textId, gameId, title, etc.
     * @param string $source The source of the event (form_submit, update, insta_publish, note_edit)
     * @return bool True if events were created successfully, false otherwise
     */
    protected function createEvents($eventType, $data, $source = null) {
        RequirePage::service('EventService');
        $eventService = new EventService();
        return $eventService->createEvents($eventType, $data, [
            'action' => $source ?? 'unknown',
            'user_id' => $_SESSION['writer_id'] ?? null
        ]);
    }
}

?>