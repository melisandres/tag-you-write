# Navigation System Architecture

This document explains how to add navigation items to the Tag You Write application. The system consists of multiple interconnected components that handle responsive behavior, overflow menus, and submenu interactions.

## System Overview

The navigation system has three main JavaScript managers and a complex HTML structure:

1. **ResponsiveNavManager** - Assigns priority attributes for responsive behavior
2. **HamburgerMenuManager** - Manages overflow menu state (open/close)
3. **UniversalSubmenuManager** - Handles submenu interactions across contexts
4. **Backend Logic** - Controls which items appear based on user state and page context

## Architecture Components

### 1. ResponsiveNavManager

**Purpose**: Assigns priority attributes to navigation items for responsive behavior.

**How it works**:
- Assigns `data-priority-nav` attributes to main nav items
- Assigns `data-priority-overflow` attributes to overflow menu items
- CSS uses these attributes to hide/show items at different screen sizes

**Priority System** (lower number = higher priority):
```javascript
this.priorities = {
    'home': 1,           // Always visible
    'dashboard': 2,      // High priority
    'browse': 3,         // Medium-high priority
    'search': 4,         // Medium priority
    'notifications': 5,  // Medium-low priority
    'language': 6,       // Low priority
    'tutorial': 7,       // Very low priority
    'newGame': 8,       // Very low priority
    'logout': 9          // Lowest priority
};
```

### 2. HamburgerMenuManager

**Purpose**: Manages the overflow menu state (open/close, overlay, body scroll lock).

**Key Methods**:
- `openMenu()` - Shows overflow menu
- `closeMenu()` - Hides overflow menu
- `toggleMenu()` - Toggles menu state

### 3. UniversalSubmenuManager

**Purpose**: Handles submenu interactions in both main nav and overflow menu contexts.

**Two Contexts**:
- **Nav Context**: Parent-child relationship (dropdown appears below trigger)
- **Overflow Context**: Side-by-side relationship (submenu appears in separate column)

**Supported Submenu Types**:
- `language` - Language switcher
- `tutorial` - Tutorial options

## HTML Structure

### Main Navigation (`<nav>`)
```html
<nav>
    <!-- Items with submenus -->
    <div class="nav-link language-switcher" data-item="language">
        <div class="current-language">EN</div>
        <div class="nav-text">Language</div>
        <div class="language-dropdown">
            <a data-language="en">EN</a>
            <a data-language="fr">FR</a>
        </div>
    </div>
    
    <!-- Regular items -->
    <a class="nav-link home" data-item="home" href="/">
        <span class="icon" data-svg="home"></span>
        <span class="nav-text">Home</span>
    </a>
    
    <!-- Hamburger button -->
    <div class="nav-link hamburger" data-item="hamburger">
        <span class="icon" data-svg="hamburger"></span>
        <span class="nav-text">Menu</span>
    </div>
</nav>
```

### Overflow Menu Structure
```html
<div class="overflow-menu">
    <div class="overflow-menu-header">
        <button class="overflow-menu-back" style="display: none;">← Back</button>
        <button class="overflow-menu-close">×</button>
    </div>
    <div class="overflow-menu-content">
        <!-- Main Menu Column -->
        <div class="overflow-menu-main">
            <!-- All nav items duplicated here -->
        </div>
        
        <!-- Submenu Column -->
        <div class="overflow-menu-submenu">
            <div class="submenu-content language-submenu">
                <h3>Language</h3>
                <a data-language="en">English</a>
                <a data-language="fr">Français</a>
            </div>
            <div class="submenu-content tutorial-submenu">
                <h3>Tutorial</h3>
                <a data-tutorial="start-game">Start Game</a>
                <a data-tutorial="contribute">Contribute</a>
            </div>
        </div>
    </div>
</div>
```

## Adding New Navigation Items

### Step 1: Add to ResponsiveNavManager

Add your item to the priorities object in `assets/js/responsiveNavManager.js`:

```javascript
this.priorities = {
    'home': 1,
    'dashboard': 2,
    'browse': 3,
    'search': 4,
    'notifications': 5,
    'language': 6,
    'tutorial': 7,
    'newGame': 8,
    'yourNewItem': 9,  // Add here
    'logout': 10       // Update existing priorities
};
```

### Step 2: Add to Main Navigation

In `view/header.php`, add your item to the `<nav>` section:

```html
<a class="nav-link your-new-item" data-item="yourNewItem" href="{{ langUrl('your-route') }}">
    <span class="icon" data-svg="your-icon" data-i18n-title="nav.your_item_tooltip"></span>
    <span class="nav-text" data-i18n="nav.your_item">Your Item</span>
</a>
```

### Step 3: Add to Overflow Menu

In `view/header.php`, add your item to the `.overflow-menu-main` section:

```html
<div class="overflow-menu-item">
    <a class="nav-link your-new-item" data-item="yourNewItem" href="{{ langUrl('your-route') }}">
        <span class="icon" data-svg="your-icon" data-i18n-title="nav.your_item_tooltip"></span>
        <span class="nav-text" data-i18n="nav.your_item">Your Item</span>
    </a>
</div>
```

### Step 4: Add Backend Logic (Optional)

Add conditional logic in `view/header.php` to control when the item appears:

```html
{% if some_condition %}
<a class="nav-link your-new-item" data-item="yourNewItem" href="{{ langUrl('your-route') }}">
    <!-- item content -->
</a>
{% endif %}
```

### Step 5: Add Translations

Add to `translations/en.json` and `translations/fr.json`:

```json
{
    "nav": {
        "your_item": "Your Item",
        "your_item_tooltip": "Your item tooltip"
    }
}
```

### Step 6: Add SVG Icon

Add your SVG to `assets/js/svgManager.js`:

```javascript
static get yourIconSVG() {
    return `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <!-- your SVG content -->
        </svg>
    `;
}
```

## Adding Items with Submenus

### For Main Navigation Submenus

1. **Add trigger to main nav**:
```html
<div class="nav-link your-switcher" data-item="yourSwitcher">
    <div class="current-your-item">Current</div>
    <div class="nav-text">Your Switcher</div>
    <div class="your-dropdown">
        <a data-your-option="option1">Option 1</a>
        <a data-your-option="option2">Option 2</a>
    </div>
</div>
```

2. **Register in UniversalSubmenuManager**:
```javascript
// In registerContexts() method, add to nav context:
'yourSwitcher': {
    trigger: '.your-switcher',
    submenu: '.your-dropdown',
    items: 'a[data-your-option]'
}
```

3. **Add to overflow menu** (main column):
```html
<div class="nav-link your-switcher" data-item="yourSwitcher">
    <div class="current-your-item">Current</div>
    <div class="nav-text">Your Switcher</div>
</div>
```

4. **Add to overflow menu** (submenu column):
```html
<div class="submenu-content your-submenu" data-submenu="yourSwitcher">
    <h3>Your Switcher</h3>
    <a data-your-option="option1">Option 1</a>
    <a data-your-option="option2">Option 2</a>
</div>
```

5. **Register in UniversalSubmenuManager** (overflow context):
```javascript
'yourSwitcher': {
    trigger: '.your-switcher',
    submenu: '.your-submenu',
    items: 'a[data-your-option]'
}
```

6. **Add action handler**:
```javascript
// In handleSubmenuAction() method:
else if (type === 'yourSwitcher') {
    const option = item.getAttribute('data-your-option');
    // Handle your submenu action
    console.log(`Your switcher option selected: ${option}`);
}
```

## Responsive Behavior

The system uses CSS media queries to hide items based on screen size:

- **360px and below**: Show only priority 1-5 items
- **420px and below**: Show only priority 1-6 items  
- **480px and below**: Show only priority 1-7 items
- **600px and below**: Show only priority 1-8 items

Items with higher priority numbers (lower importance) are hidden first and moved to the overflow menu.

## Key Differences: Nav vs Overflow Submenus

### Main Navigation Submenus
- **Structure**: Parent-child relationship
- **Behavior**: Dropdown appears below trigger
- **CSS**: Uses `.open` class on trigger
- **HTML**: Submenu is a child of the trigger element

### Overflow Menu Submenus  
- **Structure**: Side-by-side columns
- **Behavior**: Submenu appears in separate column
- **CSS**: Uses `.submenu-active` class on content container
- **HTML**: Submenu is in separate `.overflow-menu-submenu` column

## UniversalSubmenuManager Responsibilities

The UniversalSubmenuManager handles:

1. **Event Delegation**: Listens for clicks on submenu triggers and items
2. **Context Detection**: Determines whether click is in nav or overflow context
3. **State Management**: Tracks active submenu and manages transitions
4. **Action Dispatching**: Fires custom events for submenu actions
5. **Back Button Handling**: Manages overflow menu back navigation

**What it does NOT handle**:
- Language switching logic (handled by LocalizationManager)
- Tutorial logic (handled by TutorialSwitcherManager)
- Menu opening/closing (handled by HamburgerMenuManager)
- Responsive behavior (handled by CSS)

## Best Practices

1. **Always add items to both nav and overflow menu**
2. **Use consistent data-item attributes**
3. **Follow the priority system for responsive behavior**
4. **Test on different screen sizes**
5. **Add proper translations for all text**
6. **Use semantic HTML structure**
7. **Follow the existing naming conventions**

## Troubleshooting

### Item not appearing in overflow menu
- Check that you added it to both nav and overflow sections
- Verify the `data-item` attribute matches the priority key

### Submenu not working
- Ensure you registered the submenu type in both nav and overflow contexts
- Check that the trigger and submenu selectors are correct
- Verify the data attributes match between HTML and JavaScript

### Responsive behavior not working
- Check that the item is added to ResponsiveNavManager priorities
- Verify the CSS media queries are targeting the correct priority numbers
- Ensure the `data-priority-nav` and `data-priority-overflow` attributes are being set
