# Search and Filter System Architecture

## Overview

This document explains how the search and filter system works for dashboard and game list pages, and how to hook up a new page to support search and/or filters.

## Architecture Components

### Core Components

1. **DataManager** (`dataManager.js`)
   - Centralized data store and cache manager
   - Reacts to filter/search input events and fetches data from backend
   - Emits data-ready events: `gamesRefreshed` (flat array) and `dashboardCategoriesUpdated` (structured)

2. **FilterManager** (`filterManager.js`)
   - Manages filter UI (contribution, game state, bookmark filters)
   - Emits `filterApplied` (UI coordination) and `refreshGames` (data refresh)

3. **SearchManager** (`searchManager.js`)
   - Manages search input UI
   - Emits `searchApplied` (triggers data refresh + UI highlighting)

4. **DashboardManager** (`dashboardManager.js`)
   - Renders categorized dashboard structure
   - Listens to `dashboardCategoriesUpdated` for rendering
   - Initializes filters from URL on page load

5. **GameSearchFilterManager** (`gameSearchFilterManager.js`)
   - Manages game list page UI
   - Listens to `gamesRefreshed` for rendering flat game list
   - Initializes filters from URL on page load

### Event Flow

```
User Action → UI Manager → Event Bus → DataManager → Backend API → DataManager → Event Bus → View Manager
```

## Filter System

### Filter Types

1. **hasContributed**: Filters by contribution status
   - Values: `null` (all), `true` (contributor), `'mine'` (owner)
   - URL format: `?hasContributed=all|contributor|mine`

2. **gameState**: Filters by game state
   - Values: `'all'`, `'open'`, `'closed'`
   - URL format: `?gameState=all|open|closed`

3. **bookmarked**: Filters by bookmark status
   - Values: `null` (all), `true` (bookmarked), `false` (not bookmarked)
   - URL format: `?bookmarked=all|bookmarked|not_bookmarked`

### Filter Flow

```
1. User clicks filter button
   ↓
2. FilterManager updates button state
   ↓
3. FilterManager calls dataManager.setFilters(newFilters)
   ↓
4. FilterManager emits 'filterApplied' (for UI coordination)
   ↓
5. FilterManager emits 'refreshGames' (for data refresh)
   ↓
6. DataManager.refreshGamesFromBackend() triggered
   ↓
7. Backend API called with filters
   ↓
8. DataManager.updateGamesData() updates cache
   ↓
9. DataManager emits 'gamesRefreshed' (flat) + 'dashboardCategoriesUpdated' (structured)
   ↓
10. View managers render updated data
```

### Filter Initialization from URL

Both dashboard and game list pages initialize filters from URL on page load:

**Dashboard:**
```javascript
// dashboardManager.js - constructor
this.initializeFiltersFromURL(); // Reads URL, sets filters, emits refreshGames if changed
```

**Game List:**
```javascript
// gameSearchFilterManager.js - constructor
// Reads URL, sets filters, emits refreshGames if changed
```

This ensures DataManager cache matches URL state after page refresh.

## Search System

### Search Flow

```
1. User types in search input
   ↓
2. SearchManager.handleSearchInput() (debounced)
   ↓
3. SearchManager calls dataManager.setSearch(value)
   ↓
4. SearchManager.searchNodes() (for highlighting)
   ↓
5. SearchManager emits 'searchApplied' (value)
   ↓
6. DataManager.refreshGamesFromBackend() triggered
   ↓
7. Backend API called with search parameter
   ↓
8. DataManager.updateGamesData() updates cache
   ↓
9. DataManager emits 'gamesRefreshed' + 'dashboardCategoriesUpdated'
   ↓
10. View managers render updated data
   ↓
11. SearchHighlighter highlights matching terms
```

### Search Initialization from URL

```javascript
// searchManager.js - constructor
// Reads URL param 'search', sets value, emits refreshGames if present
```

## Data Refresh Mechanism

### Primary Event: `refreshGames`

This is the main data refresh event. When emitted, it triggers:

1. `DataManager.refreshGamesFromBackend()`
2. Backend API call with current filters/search/category
3. Cache update
4. Emission of `gamesRefreshed` (flat) and `dashboardCategoriesUpdated` (structured)

### Who Emits `refreshGames`?

- **FilterManager**: After filter button clicks
- **SearchManager**: After search input (when restoring from URL)
- **DashboardManager**: After initializing filters from URL
- **GameSearchFilterManager**: After initializing filters from URL

### Who Listens to `refreshGames`?

- **DataManager**: Primary listener - triggers data refresh

## Backend Integration

### Server-Side Rendering (SSR)

Both dashboard and game list pages support SSR with filters/search:

**Dashboard Controller:**
```php
// controller/ControllerDashboard.php
public function index() {
    // Read filters/search from $_GET
    $filters = [/* parse from $_GET */];
    $search = $_GET['search'] ?? null;
    
    // Get filtered games
    $allGames = $game->getGames(null, $filters, null, $search);
    
    // Render with initial data
    Twig::render('dashboard-index.php', [
        'gamesData' => json_encode($allGames), // For DataManager
        'dashboardData' => $this->buildDashboardData($filters, $search), // For SSR
        'initialFilters' => $filters,
        'initialSearch' => $search
    ]);
}
```

**Game List Controller:**
Similar pattern - read from `$_GET`, apply filters/search, render.

### API Endpoint

Both pages use the same backend endpoint for AJAX requests:

```
POST /game/getGames
Body: { filters: {...}, search: "...", category: "..." }
Response: Array of game objects
```

## How to Hook Up a New Page

### Step 1: Add Filter/Search UI to Template

Include the filter and search navigation links in your page template, plus a JSON element for server-rendered games data:

```twig
<!-- Store the flat games data for DataManager compatibility -->
<script type="application/json" id="games-data">
    {{ gamesData|raw }}
</script>

{% if not guest %}
    <nav>
        <a href="{{ i18n.createUrl('filter') }}" class="nav-link filter" data-item="filter">
            {{ i18n.t('nav.filter') }}
        </a>
        <a href="{{ i18n.createUrl('search') }}" class="nav-link search" data-item="search">
            {{ i18n.t('nav.search') }}
        </a>
    </nav>
{% endif %}
```

**Note:** The `#games-data` JSON element is critical - it prevents stale cached data from overwriting correct server-rendered HTML on page refresh.

### Step 2: Create View Manager

Create a manager class that:
1. **CRITICAL**: Loads server-rendered games data into DataManager cache BEFORE setting up event listeners
2. Initializes filters from URL on page load
3. Listens to data-ready events from DataManager
4. Renders the filtered/searched data

**Why Step 1 is critical:** DataManager initializes from localStorage cache, which may contain stale unfiltered games. Loading server-rendered data syncs the cache with server state before event listeners fire, preventing stale data from overwriting correct server-rendered HTML.

**Example:**

```javascript
import { eventBus } from './eventBus.js';

export class MyPageManager {
    constructor() {
        this.container = document.querySelector('.my-page-container');
        if (!this.container) return;
        
        this.dataManager = window.dataManager;
        
        // CRITICAL: Load server-rendered games data FIRST
        // This must happen BEFORE setting up event listeners
        // to prevent stale cache from triggering re-renders
        this.initializeFromServerData();
        
        // Step 2: Initialize filters from URL
        this.initializeFiltersFromURL();
        
        // Step 3: Listen to data-ready events (after cache is synced)
        eventBus.on('gamesRefreshed', (games) => this.renderGames(games));
        // OR for categorized data:
        eventBus.on('dashboardCategoriesUpdated', (data) => this.renderCategorized(data));
    }
    
    /**
     * Load server-rendered games data into DataManager cache
     * Prevents stale cached data from overwriting correct server-rendered HTML
     */
    initializeFromServerData() {
        const gamesData = this.loadGamesData();
        if (gamesData && gamesData.length > 0) {
            // Update DataManager cache with server-rendered filtered games
            // This ensures cache matches server state before any events fire
            this.dataManager.updateGamesData(gamesData, true);
            console.log('🎯 MyPageManager: Loaded', gamesData.length, 'games from server-rendered data');
        }
    }
    
    /**
     * Load games data from server-rendered JSON element
     */
    loadGamesData() {
        const dataElement = document.getElementById('games-data');
        if (dataElement) {
            try {
                return JSON.parse(dataElement.textContent);
            } catch (e) {
                console.error('MyPageManager: Error parsing games data:', e);
                return null;
            }
        }
        return null;
    }
    
    initializeFiltersFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const hasContributed = urlParams.get('hasContributed');
        const bookmarked = urlParams.get('bookmarked');
        const gameState = urlParams.get('gameState');
        
        if (!hasContributed && !bookmarked && !gameState) {
            return; // No filters in URL
        }
        
        // Convert URL values to backend format
        const initialFilters = {
            hasContributed: hasContributed === 'contributor' ? true :
                           hasContributed === 'mine' ? 'mine' : null,
            gameState: gameState || 'all',
            bookmarked: bookmarked === 'bookmarked' ? true :
                       bookmarked === 'not_bookmarked' ? false : null
        };
        
        const currentFilters = this.dataManager.getFilters();
        const filtersChanged = JSON.stringify(initialFilters) !== JSON.stringify(currentFilters);
        
        if (filtersChanged) {
            this.dataManager.setFilters(initialFilters);
            eventBus.emit('refreshGames'); // Trigger data refresh
        }
    }
    
    renderGames(games) {
        // Render flat array of games
        // games is already filtered/searched by DataManager
    }
}
```

### Step 3: Initialize Manager in main.js

```javascript
// main.js
if (document.querySelector('.my-page-container')) {
    const myPageManager = new MyPageManager();
    window.myPageManager = myPageManager;
}
```

### Step 4: Update Backend Controller

Ensure your controller reads filters/search from `$_GET` for SSR and includes `gamesData` in template:

```php
public function index() {
    // Read filters/search from URL
    $filters = [];
    if (isset($_GET['hasContributed'])) {
        $filters['hasContributed'] = $_GET['hasContributed'];
    }
    if (isset($_GET['bookmarked'])) {
        $filters['bookmarked'] = $_GET['bookmarked'];
    }
    if (isset($_GET['gameState'])) {
        $filters['gameState'] = $_GET['gameState'];
    }
    $search = $_GET['search'] ?? null;
    
    // Get filtered games
    $game = new Game;
    $games = $game->getGames(null, $filters, null, $search);
    
    // Render template
    Twig::render('my-page.php', [
        'gamesData' => json_encode($games),
        'initialFilters' => $filters,
        'initialSearch' => $search
    ]);
}
```

## Data Formats

### Flat Format (`gamesRefreshed` event)

Array of game objects:
```javascript
[
    { game_id: "1", prompt: "...", ... },
    { game_id: "2", prompt: "...", ... }
]
```

Used by: Game list pages

### Structured Format (`dashboardCategoriesUpdated` event)

Categorized hierarchy:
```javascript
{
    myStories: {
        drafts: { games: [...], count: 5, hasUnreads: false },
        active: { games: [...], count: 3, hasUnreads: true },
        archives: { games: [...], count: 2, hasUnreads: false }
    },
    canJoin: {
        invitations: { games: [...], count: 1, hasUnreads: false },
        suggested: { games: [...], count: 4, hasUnreads: false },
        other: { games: [...], count: 0, hasUnreads: false }
    },
    inspiration: {
        bookmarked: { games: [...], count: 2, hasUnreads: false },
        weLiked: { games: [...], count: 1, hasUnreads: false }
    }
}
```

Used by: Dashboard page

## Key Events Reference

### Input Events (Trigger Data Refresh)

- `refreshGames` - Primary refresh trigger (emitted by FilterManager, SearchManager, etc.)
- `searchApplied` - Search value changed (also triggers refresh)
- `filterApplied` - Filter button clicked (UI coordination only, not data refresh)

### Output Events (Data Ready)

- `gamesRefreshed` - Flat array of games ready for rendering
- `dashboardCategoriesUpdated` - Structured categorized data ready for rendering

### UI Coordination Events

- `filterApplied` - Filter changed (for URL updates, nav highlighting)
- (No direct search UI event - handled internally by SearchManager)

## Common Patterns

### Pattern 1: Filter Button Click

```javascript
// In FilterManager
filterButton.addEventListener('click', () => {
    const newState = getNextState();
    this.dataManager.setFilters({ ...filters, key: newState });
    this.updateButtonUI(newState);
    eventBus.emit('filterApplied'); // UI coordination
    eventBus.emit('refreshGames');  // Data refresh
});
```

### Pattern 2: Search Input

```javascript
// In SearchManager
handleSearchInput(value) {
    this.dataManager.setSearch(value);
    if (value.trim()) {
        this.searchNodes(value); // For highlighting
    }
    eventBus.emit('searchApplied', value); // Triggers refreshGames in DataManager
}
```

### Pattern 3: URL Initialization

```javascript
// In View Manager constructor
initializeFiltersFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    // Parse filters from URL
    const filters = { /* ... */ };
    
    const currentFilters = this.dataManager.getFilters();
    if (JSON.stringify(filters) !== JSON.stringify(currentFilters)) {
        this.dataManager.setFilters(filters);
        eventBus.emit('refreshGames'); // Sync cache with URL
    }
}
```

## Troubleshooting

### Filters not applied on page refresh (stale cache overwrites server HTML)

**Issue**: Filters in URL but games not filtered after refresh. Server renders correctly, but frontend overwrites with unfiltered games.

**Root Cause**: DataManager loads from localStorage cache on initialization, which may contain stale unfiltered games. If nothing loads server-rendered data into the cache before event listeners fire, stale cache triggers `dashboardCategoriesUpdated` / `gamesRefreshed` events that overwrite correct server-rendered HTML.

**Solution**: **CRITICAL** - Load server-rendered games data into DataManager cache BEFORE setting up event listeners:
```javascript
constructor() {
    // ...
    this.dataManager = window.dataManager;
    
    // CRITICAL: Load server-rendered data FIRST (before event listeners)
    this.initializeFromServerData(); // Syncs cache with server state
    
    // Then set up listeners (cache is now correct, won't trigger wrong re-renders)
    this.initEventListeners();
}

initializeFromServerData() {
    const gamesData = this.loadGamesData(); // Read from #games-data element
    if (gamesData && gamesData.length > 0) {
        this.dataManager.updateGamesData(gamesData, true); // Sync cache
    }
}
```

**Why this works**: Server-rendered data is loaded into cache before event listeners are set up, so when `updateDashboardCategories()` emits events, the cache contains correct filtered data that matches the server-rendered HTML (no unwanted re-render needed).

### Search works but filters don't

**Issue**: Search applies on refresh but filters don't

**Solution**: Check that filter initialization emits `refreshGames`:
```javascript
if (filtersChanged) {
    this.dataManager.setFilters(filters);
    eventBus.emit('refreshGames'); // Critical!
}
```

### Duplicate data requests

**Issue**: Multiple API calls on page load

**Solution**: DataManager has debouncing (100ms) to batch rapid calls. Check that initialization only emits `refreshGames` once per page load.

## Summary

1. **FilterManager** manages filter UI and emits `filterApplied` + `refreshGames`
2. **SearchManager** manages search UI and emits `searchApplied` (triggers refresh)
3. **DataManager** listens to refresh events, fetches from backend, emits data-ready events
4. **View Managers** initialize filters from URL, listen to data-ready events, render
5. **Backend** reads `$_GET` for SSR and provides API endpoint for AJAX

The system is reactive: UI changes → events → DataManager → backend → events → UI updates.

