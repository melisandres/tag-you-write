<?php

abstract class Controller{
    abstract public function index();

    public function __construct() {
        // No need to require EventManager anymore
    }

    protected function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        // Convert integer values to boolean
        $node['hasContributed'] = isset($node['hasContributed']) ? $node['hasContributed'] == 1 : false;
        $node['isWinner'] = isset($node['isWinner']) ? $node['isWinner'] == 1 : false;
        $node['openForChanges'] = isset($node['openForChanges']) ? $node['openForChanges'] == 1 : true;

        RequirePage::library('Permissions');
        $node = Permissions::aggregatePermissions($node, $currentUserId);
        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->addPermissions($child, $currentUserId, $hierarchy);
            }
        }
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