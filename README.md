# Tag You Write

A collaborative writing platform that allows users to create, share, and interact with text-based content in a game-like environment.

## 🌟 Features

- **Multi-language Support**: Built-in support for English and French
- **User Management**: Registration, login, and profile management
- **Text Collaboration**: Create and share text content
- **Gamification**: Voting system and game mechanics
- **Real-time Notifications**: Server-Sent Events (SSE) for live updates
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
