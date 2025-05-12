<?php

class EventConfig {
    private $config;
    
    public function __construct() {
        $this->config = [
            'ROOT_PUBLISH' => [
                'required_fields' => ['textId', 'gameId', 'title', 'isRoot'],
                'events' => [
                    'game' => [
                        'type' => 'game_started',
                        'table' => 'game',
                        'payload_fields' => ['title']
                    ],
                    'text' => [
                        'type' => 'text_published',
                        'table' => 'text',
                        'payload_fields' => ['title']
                    ]
                ]
            ],
            'CONTRIB_PUBLISH' => [
                'required_fields' => ['textId', 'gameId', 'title', 'isRoot'],
                'events' => [
                    'game' => [
                        'type' => 'game_text_added',
                        'table' => 'game',
                        'payload_fields' => ['title']
                    ],
                    'text' => [
                        'type' => 'text_published',
                        'table' => 'text',
                        'payload_fields' => ['title']
                    ]
                ]
            ],
            'NOTE_ADD' => [
                'required_fields' => ['textId', 'gameId', 'title'],
                'events' => [
                    'game' => [
                        'type' => 'game_text_annotated',
                        'table' => 'game',
                        'payload_fields' => ['title']
                    ],
                    'text' => [
                        'type' => 'text_annotated',
                        'table' => 'text',
                        'payload_fields' => ['title']
                    ]
                ]
            ],
            'VOTE_TOGGLE' => [
                'required_fields' => ['textId', 'gameId', 'title', 'isVoting'],
                'events' => [
                    'text' => [
                        'type' => 'text_voted',
                        'table' => 'text',
                        'payload_fields' => ['title', 'isVoting']
                    ]
                ]
            ],
            'WINNING_VOTE' => [
                'required_fields' => ['textId', 'gameId', 'title'],
                'events' => [
                    'text' => [
                        'type' => 'text_won',
                        'table' => 'text',
                        'payload_fields' => ['title']
                    ]
                ]
            ],
            'GAME_CLOSED' => [
                'required_fields' => ['textId', 'gameId', 'title'],
                'events' => [
                    'game' => [
                        'type' => 'game_closed',
                        'table' => 'game',
                        'payload_fields' => ['title', 'textId']
                    ]
                ]
            ],
            'NOTIFICATION_CREATED' => [
                'required_fields' => ['notificationId', 'recipientId', 'notificationType'],
                'events' => [
                    'notification' => [
                        'type' => 'notification_created',
                        'table' => 'notification',
                        'payload_fields' => ['notificationType', 'textId'],
                        'writer_id_field' => 'recipientId'
                    ]
                ]
            ]
        ];
    }
    
    public function getConfig($eventType) {
        return $this->config[$eventType] ?? null;
    }
}