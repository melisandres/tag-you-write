<?php

require_once(__DIR__ . '/../model/Event.php');
require_once(__DIR__ . '/../model/Game.php');
require_once(__DIR__ . '/config/EventConfig.php');

class EventService {
    private $eventConfig;
    private $eventModel;
    private $gameModel;
    
    public function __construct() {
        $this->eventConfig = new EventConfig();
        $this->eventModel = new Event();
        $this->gameModel = new Game();
    }
    
    public function createEvents($eventType, $data, $context) {
        $config = $this->eventConfig->getConfig($eventType);
        if (!$config) {
            error_log("Unknown event type: $eventType");
            return false;
        }
        
        // Validate required fields
        foreach ($config['required_fields'] as $field) {
            if (!isset($data[$field])) {
                error_log("Missing required field: $field");
                return false;
            }
        }

        // Get root_text_id
        $root_text_id = $this->getRootTextId($data, $eventType);

        // Create events based on configuration
        $success = true;
        foreach ($config['events'] as $eventConfig) {
            $eventData = $this->prepareEventData($eventConfig, $data, $context, $root_text_id);
            $result = $this->eventModel->createEvent($eventData);
            
            // Check if result is an error array or false
            if (is_array($result) && isset($result['error'])) {
                error_log("Error creating event: " . $result['error']);
                $success = false;
            } elseif (!$result) {
                error_log("Failed to create event");
                $success = false;
            }
        }

        return $success;
    }

    private function getRootTextId($data, $eventType) {
        // Only check isRoot for publishing events
        if (in_array($eventType, ['ROOT_PUBLISH', 'CONTRIB_PUBLISH'])) {
            if ($data['isRoot']) {
                return $data['textId'];
            }
            return $this->gameModel->getRootText($data['gameId']);
        }
        
        // For other events, just get the root text from the game
        return $this->gameModel->getRootText($data['gameId']);
    }

    private function prepareEventData($eventConfig, $data, $context, $root_text_id) {
        $payload = [];
        
        // Handle special cases for different event types
        switch ($eventConfig['type']) {
            case 'text_voted':
                $action = $data['isVoting'] ? 'voted' : 'unvoted';
                $payload = [
                    'title' => $data['title'],
                    'action' => $action,
                    'info' => "user $action on text"
                ];
                break;
            
            case 'game_closed':
                $payload = [
                    'winning_text_id' => $data['textId'],
                    'winning_text_title' => $data['title'],
                    'info' => "game closed via {$context['action']}"
                ];
                break;
            
            case 'notification_created':
                $payload = [
                    'notification_type' => $data['notificationType'],
                    'winning_text_id' => $data['textId'] ?? null,
                    'info' => isset($data['info']) ? $data['info'] : "notification created via {$context['action']}"
                ];
                break;
            
            default:
                foreach ($eventConfig['payload_fields'] as $field) {
                    $payload[$field] = $data[$field];
                }
                $payload['info'] = "via {$context['action']}";
        }

        // Determine writer_id based on config or default to current user
        $writer_id = $context['user_id'];
        if (isset($eventConfig['writer_id_field']) && isset($data[$eventConfig['writer_id_field']])) {
            $writer_id = $data[$eventConfig['writer_id_field']];
        }

        return [
            'event_type' => $eventConfig['type'],
            'related_table' => $eventConfig['table'],
            'related_id' => $data[$eventConfig['table'] . 'Id'],
            'root_text_id' => $root_text_id,
            'writer_id' => $writer_id,
            'payload' => $payload,
            'created_at' => date('Y-m-d H:i:s')
        ];
    }
} 