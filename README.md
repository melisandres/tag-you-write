# Tag You Write

(This description is a work in progress... currently a rough AI generation. Will revisit soon... some of the information needs to be revised.)

A collaborative writing platform that allows users to create, share, and interact with text-based content in a game-like environment.

## 🌟 Features

- **Multi-language Support**: Built-in support for English and French
- **User Management**: Registration, login, and profile management
- **Text Collaboration**: Create and share text content
- **Gamification**: Voting system and game mechanics
- **Real-time Notifications**: Server-Sent Events (SSE) for live updates
- **Activity Tracking**: Intelligent user activity monitoring and analytics
- **Email Notifications**: PHPMailer integration for user communications

## 🏗️ Architecture

The project follows a Model-View-Controller (MVC) architecture:

- **Model**: Data layer handling database operations
- **View**: Twig templating engine for rendering views
- **Controller**: Business logic and request handling

### Directory Structure

```
├── assets/          # Static assets (CSS, JS, images)
├── config/          # Configuration files
├── controller/      # Application controllers
├── library/         # Core utilities and helpers
├── model/          # Data models
├── translations/    # Language files
├── view/           # Twig templates
└── vendor/         # Composer dependencies
```

## 🚀 Getting Started

### Prerequisites

- PHP 7.4 or higher
- Composer
- MySQL/MariaDB
- MAMP/XAMPP/WAMP (for local development)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   composer install
   ```
3. Configure your environment:
   - Copy `.env.example` to `.env`
   - Update database credentials and other settings
4. Set up your web server to point to the project directory
5. Ensure proper permissions on writable directories

## 🔧 Core Systems

### Backend Components

#### Event System
The application uses a configuration-driven event system to track and manage various actions:

1. **Action Types**
   - `ROOT_PUBLISH`: When a root text is published
   - `CONTRIB_PUBLISH`: When a contribution is published
   - `NOTE_ADD`: When a note is added to a text
   - `VOTE_TOGGLE`: When a vote is added or removed
   - `WINNING_VOTE`: When a text wins a vote
   - `GAME_CLOSED`: When a game is closed
   - `NOTIFICATION_CREATED`: When a notification is generated
   - `ACTIVITY_UPDATE`: When user activity state changes (*Note: Uses direct Redis publishing to avoid events table flooding*)

2. **Real-Time Features**
   - **Content Updates**: Votes, publications, notes with instant synchronization
   - **Activity Tracking**: User presence, engagement levels, and context awareness (*Direct Redis pattern*)
   - **Notifications**: User-specific real-time message delivery
   - **Collaborative Indicators**: Live user activity counts and real-time collaboration awareness

3. **System Architecture**
   - Configuration-driven using `EventConfig`
   - Flexible payload system for action-specific data
   - Automatic root text tracking
   - Context-aware action recording
   - Three-tier delivery: Redis Pub/Sub → SSE → AJAX Polling

4. **Data Flow**
```
┌─────────────┐     ┌───────────────┐     ┌─────────────┐     ┌─────────────┐
│             │     │               │     │             │     │             │
│  Controller │────▶│  EventService │───▶ │ Event Model │───▶ │ Redis/SSE   │
│             │     │               │     │             │     │             │
└─────────────┘     └───────────────┘     └─────────────┘     └─────────────┘
```

5. **Adding New Actions**
   - Define action type in `EventConfig`
   - Add action handling in `EventService`
   - Implement action creation in relevant controller

#### Controllers
- `ControllerText`: Handles text creation and management
- `ControllerGame`: Manages game-related functionality
- `ControllerLogin`: Authentication and user sessions
- `ControllerNotification`: Handles real-time notifications
- `ControllerVote`: Manages voting system
- `ControllerLanguage`: Language switching functionality

#### Libraries
- `Twig`: Template engine
- `PHPMailer`: Email functionality
- Custom libraries for routing, session management, and more

### Frontend Architecture

The front-end is built with vanilla JavaScript, implementing a Single Page Application (SPA) like experience without a front-end framework. It uses a manager-based pattern for clear separation of concerns and D3.js for complex data visualizations.

#### Data Flow and State Management
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  User Action    │────▶│  Event Bus      │────▶│  Data Manager   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                                                         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  UI Components  │◀────│  Update Manager │◀────│  State Change   │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

#### Key JavaScript Components

1. **Data Management**
   - `dataManager.js`: Central state management
   - `eventBus.js`: Event-driven communication
   - `autoSaveManager.js`: Content persistence
   - `validationManager.js`: Form validation

2. **Content Visualization**
   - `treeVisualizer.js`: D3.js hierarchical visualization
   - `shelfVisualizer.js`: D3.js grid visualization
   - `svgManager.js`: SVG utilities

3. **Content Management**
   - `storyManager.js`: Content handling
   - `searchManager.js`: Search functionality
   - `filterManager.js`: Filtering system
   - `paginationManager.js`: Content pagination
   - `wordcountManager.js`: Word tracking

4. **UI Components**
   - `modal.js`: Dialog system
   - `formManager.js`: Form handling
   - `tooltipManager.js`: Tooltip system
   - `toastManager.js`: Notifications

5. **Real-time Features**
   - `sseManager.js`: Server-Sent Events
   - `pollingManager.js`: Fallback polling
   - `notificationManager.js`: Real-time notifications

### Security and Permissions

1. **Backend Security**
   - Session management
   - Input validation
   - CSRF protection
   - Secure password handling

2. **Permission System**
   - Role-based access control
   - Checks based on:
     - User ownership
     - Text status
     - Content availability
     - User contribution status
   - Front-end permission enforcement

3. **Data Protection**
   - Secure data transmission
   - Input sanitization
   - Twig template rendering
   - Access control validation

### Validation System

1. **Validation Levels**
   - Autosave: Work-in-progress rules
   - Publish: Strict publication standards
   - Guidance: Creation feedback

2. **Features**
   - Word count tracking
   - Content change validation
   - Keyword validation
   - Date/Email validation
   - Pattern matching
   - Character limits

3. **User Guidance**
   - Real-time feedback
   - Progressive messages
   - Severity-based alerts
   - Contextual help

### Activity Tracking System

The application includes a sophisticated user activity tracking system that monitors engagement and provides analytics for collaborative writing sessions.

**Key Features:**
- Dual idle detection (timer-based + engagement-based)
- Context-aware tracking (page type, game context, text focus)
- Intelligent heartbeat system with automatic idle detection
- Performance-optimized with minimal network overhead

**Components:**
- `CurrentActivityManager` (`assets/js/currentActivityManager.js`): Core tracking system
- `ControllerWriterActivity`: Backend API for activity data
- `WriterActivity` Model: Database operations and analytics

**Documentation:** See [README-activity-tracking.md](README-activity-tracking.md) for comprehensive documentation including architecture, usage examples, and troubleshooting.

## 🌐 Multi-language Support

- URL-based selection (`/en/home`, `/fr/home`)
- Translation files in `translations/`
- Automatic detection and redirection

## 🎨 Frontend Styling

### CSS Architecture
```
css/
├── atoms/      # Basic building blocks
├── elements/   # Simple components
├── cards/      # Card components
├── layouts/    # Page layouts
├── general/    # Global styles
└── main.css    # Main stylesheet
```

## 🧪 Testing

The project includes custom test scripts in the `tests/` directory that focus on notification functionality:

- `tests/notification/test_notification_model.php`: Tests notification model functionality
- `tests/notification/test_notification_flow.php`: Tests complete notification flow
- `tests/run_tests.php`: Script to execute all tests

To run the tests:
```bash
php tests/run_tests.php
```

The tests use mock classes to simulate database operations and test specific functionality like timezone handling and notification flow.

## 📝 License

[Specify your license here]

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support, please [specify your support channels]
