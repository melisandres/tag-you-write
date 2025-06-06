<?php

require_once(__DIR__ . '/../model/Event.php');
require_once(__DIR__ . '/../model/Game.php');
require_once(__DIR__ . '/config/EventConfig.php');
require_once(__DIR__ . '/RedisService.php');

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
        error_log("EventService: Starting event creation for type: $eventType");
        error_log("EventService: Input data: " . json_encode($data));
        
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
        error_log("EventService: Root text ID: $root_text_id");

        // Create events based on configuration
        $success = true;
        $redisService = null;
        
        // Only initialize RedisService if needed
        if (class_exists('RedisService')) {
            $redisService = new RedisService();
            error_log("EventService: RedisService initialized");
        }
        
        foreach ($config['events'] as $eventConfig) {
            error_log("EventService: Processing event config: " . json_encode($eventConfig));
            
            $eventData = $this->prepareEventData($eventConfig, $data, $context, $root_text_id);
            error_log("EventService: Prepared event data: " . json_encode($eventData));
            
            $result = $this->eventModel->createEvent($eventData);
            error_log("EventService: Database insert result: " . json_encode($result));
            
            // Check if result is an error array or false
            if (is_array($result) && isset($result['error'])) {
                error_log("Error creating event: " . $result['error']);
                $success = false;
            } elseif (!$result) {
                error_log("Failed to create event");
                $success = false;
            } else {
                // Event created successfully, publish to Redis
                if ($redisService && $redisService->isAvailable()) {
                    // Add the event ID to the data
                    $eventData['id'] = $result;
                    error_log("EventService: Publishing to Redis with event ID: $result");
                    error_log("EventService: Full event data for Redis: " . json_encode($eventData));
                    $redisService->publishEvent($eventData);
                }
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

        // Determine related_id - use custom field if specified, otherwise use table + 'Id' pattern
        $related_id = null;
        if (isset($eventConfig['related_id_field']) && isset($data[$eventConfig['related_id_field']])) {
            $related_id = $data[$eventConfig['related_id_field']];
        } else {
            $related_id = $data[$eventConfig['table'] . 'Id'];
        }

        return [
            'event_type' => $eventConfig['type'],
            'related_table' => $eventConfig['table'],
            'related_id' => $related_id,
            'root_text_id' => $root_text_id,
            'writer_id' => $writer_id,
            'payload' => $payload,
            'created_at' => date('Y-m-d H:i:s')
        ];
    }
} 