<?php

abstract class Controller{
    abstract public function index();

    protected function addPermissions(&$node, $currentUserId, $hierarchy = []) {
        // Convert integer values to boolean
        $node['hasContributed'] = $node['hasContributed'] == 1;
        $node['isWinner'] = $node['isWinner'] == 1;
        $node['openForChanges'] = $node['openForChanges'] == 1;

        RequirePage::library('Permissions');
        $node = Permissions::aggregatePermissions($node, $currentUserId);
        if (!empty($node['children'])) {
            foreach ($node['children'] as &$child) {
                $this->addPermissions($child, $currentUserId, $hierarchy);
            }
        }
    }
}

?>