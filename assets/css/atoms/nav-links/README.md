# Nav-Links Components

This folder contains all CSS files related to navigation link components.

## Structure

- `nav-link.css` - Base styles for all nav-link elements (both `a` and `div` tags)
- `hamburger.css` - Hamburger menu nav-link styles
- `filter.css` - Filter nav-link styles
- `search.css` - Search nav-link styles  
- `notifications.css` - Notifications nav-link styles
- `language-switcher.css` - Language switcher nav-link styles (with dropdown)
- `tutorial-switcher.css` - Tutorial switcher nav-link styles (with dropdown)
- `home.css` - Home nav-link styles
- `browse.css` - Browse/Texts nav-link styles
- `newgame.css` - NewGame nav-link styles
- `logout.css` - Logout nav-link styles

## Usage

All nav-link components inherit from the base `nav-link.css` styles and add their own specific styling on top.

## Import Order

The files should be imported in this order in `main.css`:
1. `nav-link.css` (base styles first)
2. Individual component styles (alphabetical order)

## Complex Components

Some nav-links have associated JavaScript logic:
- **Language Switcher**: `localization.js` - handles language switching
- **Tutorial Switcher**: `tutorialSwitcherManager.js` - handles tutorial modal integration

## Adding New Nav-Links

When adding a new nav-link component:
1. Create a new CSS file in this folder (e.g., `new-component.css`)
2. Follow the naming convention: `.nav-link.component-name`
3. Add the import to `main.css` after the base nav-link import
4. Document the component in this README
5. If the component has JavaScript logic, document it here
