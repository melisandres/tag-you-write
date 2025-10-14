/**
 * UniversalSubmenuManager - Handles all submenu logic across different contexts
 * Supports both main navigation dropdowns and overflow menu submenus
 */
export class UniversalSubmenuManager {
    constructor() {
        this.contexts = new Map();
        this.activeSubmenu = null;
        this.init();
    }

    /**
     * Initialize the universal submenu manager
     */
    init() {
        this.registerContexts();
        this.bindEvents();
    }

    /**
     * Register different submenu contexts
     */
    registerContexts() {
        // Main navigation context
        this.contexts.set('nav', {
            container: 'nav',
            submenuTypes: {
                'language': {
                    trigger: '.language-switcher',
                    submenu: '.language-dropdown',
                    items: 'a[data-language]'
                },
                'tutorial': {
                    trigger: '.tutorial-switcher', 
                    submenu: '.tutorial-dropdown',
                    items: 'a[data-tutorial]'
                }
            }
        });

        // Overflow menu context
        this.contexts.set('overflow', {
            container: '.overflow-menu',
            submenuTypes: {
                'language': {
                    trigger: '.language-switcher',
                    submenu: '.language-submenu',
                    items: 'a[data-language]'
                },
                'tutorial': {
                    trigger: '.tutorial-switcher',
                    submenu: '.tutorial-submenu', 
                    items: 'a[data-tutorial]'
                }
            }
        });
    }

    /**
     * Bind events for all contexts
     */
    bindEvents() {
        // Listen for clicks on submenu triggers
        document.addEventListener('click', (e) => {
            this.handleTriggerClick(e);
        });

        // Listen for clicks on submenu items
        document.addEventListener('click', (e) => {
            this.handleSubmenuItemClick(e);
        });

        // Listen for clicks outside to close submenus
        document.addEventListener('click', (e) => {
            this.handleOutsideClick(e);
        });

        // Special capture phase listener for overflow menu only
        document.addEventListener('click', (e) => {
            if (e.target.closest('.overflow-menu')) {
                this.handleOverflowCaptureClick(e);
            }
        }, true); // Use capture phase only for overflow menu

        // Listen for back button clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.overflow-menu-back')) {
                this.handleBackButtonClick(e);
            }
        });
    }

    /**
     * Handle overflow menu clicks in capture phase (runs before other listeners)
     */
    handleOverflowCaptureClick(e) {
        const context = this.contexts.get('overflow');
        if (!context) return;

        for (const [submenuType, config] of Object.entries(context.submenuTypes)) {
            const trigger = e.target.closest(config.trigger);
            if (trigger) {
                console.log(`UniversalSubmenuManager: ${submenuType} trigger clicked in overflow (capture)`);
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                this.showSubmenu('overflow', submenuType);
                return;
            }
            
            // Check for clicks on icon elements
            const iconElements = document.querySelectorAll(`${config.trigger} .current-language, ${config.trigger} .current-tutorial`);
            for (const icon of iconElements) {
                if (icon.contains(e.target)) {
                    console.log(`UniversalSubmenuManager: ${submenuType} icon clicked in overflow (capture)`);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    this.showSubmenu('overflow', submenuType);
                    return;
                }
            }
        }
    }

    /**
     * Handle clicks on submenu triggers (normal phase)
     */
    handleTriggerClick(e) {
        // Only handle main nav context in normal phase
        const navContainer = document.querySelector('nav');
        if (navContainer && navContainer.contains(e.target)) {
            this.handleNavClick(e);
        }
    }


    handleNavClick(e) {
        const context = this.contexts.get('nav');
        if (!context) return;

        for (const [submenuType, config] of Object.entries(context.submenuTypes)) {
            const trigger = e.target.closest(config.trigger);
            if (trigger) {
                console.log(`UniversalSubmenuManager: ${submenuType} trigger clicked in nav`);
                e.preventDefault();
                e.stopPropagation();
                this.showSubmenu('nav', submenuType);
                return;
            }
        }
    }

    /**
     * Handle clicks on submenu items
     */
    handleSubmenuItemClick(e) {
        for (const [contextName, context] of this.contexts) {
            const container = document.querySelector(context.container);
            if (!container || !container.contains(e.target)) continue;

            for (const [submenuType, config] of Object.entries(context.submenuTypes)) {
                const item = e.target.closest(config.items);
                if (item && container.contains(item)) {
                    console.log(`UniversalSubmenuManager: ${submenuType} item clicked in ${contextName}`);
                    this.handleSubmenuAction(contextName, submenuType, item);
                    this.hideSubmenu(contextName, submenuType);
                    return;
                }
            }
        }
    }

    /**
     * Handle clicks outside submenus
     */
    handleOutsideClick(e) {
        if (!this.activeSubmenu) return;

        const { context, type } = this.activeSubmenu;
        const contextConfig = this.contexts.get(context);
        const container = document.querySelector(contextConfig.container);
        
        if (!container || !container.contains(e.target)) {
            this.hideSubmenu(context, type);
        }
    }

    /**
     * Show submenu for specific context and type
     */
    showSubmenu(context, type) {
        console.log(`UniversalSubmenuManager: Showing ${type} submenu in ${context}`);
        
        // Hide any currently active submenu
        this.hideActiveSubmenu();

        const contextConfig = this.contexts.get(context);
        if (!contextConfig) {
            console.error(`UniversalSubmenuManager: Unknown context ${context}`);
            return;
        }

        const submenuConfig = contextConfig.submenuTypes[type];
        if (!submenuConfig) {
            console.error(`UniversalSubmenuManager: Unknown submenu type ${type} for context ${context}`);
            return;
        }

        // Context-specific logic
        if (context === 'nav') {
            this.showNavSubmenu(type, submenuConfig);
        } else if (context === 'overflow') {
            this.showOverflowSubmenu(type, submenuConfig);
        }

        this.activeSubmenu = { context, type };
    }

    /**
     * Show navigation dropdown submenu
     */
    showNavSubmenu(type, config) {
        const trigger = document.querySelector(config.trigger);
        if (trigger) {
            trigger.classList.add('open');
        }
    }

    /**
     * Show overflow menu submenu
     */
    showOverflowSubmenu(type, config) {
        const content = document.querySelector('.overflow-menu-content');
        const submenu = content.querySelector(config.submenu);
        const trigger = document.querySelector(`.overflow-menu ${config.trigger}`);
        const backButton = document.querySelector('.overflow-menu-back');
        
        if (content && submenu) {
            content.classList.add('submenu-active');
            submenu.classList.add('active');
            
            // Add active class to the trigger
            if (trigger) {
                trigger.classList.add('active');
            }
            
            // Show back button in header
            if (backButton) {
                backButton.style.display = 'flex';
            }
            
            // Language submenu active state is handled by localization manager
        }
    }


    /**
     * Hide submenu for specific context and type
     */
    hideSubmenu(context, type) {
        console.log(`UniversalSubmenuManager: Hiding ${type} submenu in ${context}`);
        
        const contextConfig = this.contexts.get(context);
        if (!contextConfig) return;

        const submenuConfig = contextConfig.submenuTypes[type];
        if (!submenuConfig) return;

        // Context-specific logic
        if (context === 'nav') {
            this.hideNavSubmenu(type, submenuConfig);
        } else if (context === 'overflow') {
            this.hideOverflowSubmenu(type, submenuConfig);
        }

        if (this.activeSubmenu && this.activeSubmenu.context === context && this.activeSubmenu.type === type) {
            this.activeSubmenu = null;
        }
    }

    /**
     * Hide navigation dropdown submenu
     */
    hideNavSubmenu(type, config) {
        const trigger = document.querySelector(config.trigger);
        if (trigger) {
            trigger.classList.remove('open');
        }
    }

    /**
     * Hide overflow menu submenu
     */
    hideOverflowSubmenu(type, config) {
        const content = document.querySelector('.overflow-menu-content');
        const submenu = content?.querySelector(config.submenu);
        const trigger = document.querySelector(`.overflow-menu ${config.trigger}`);
        
        if (content && submenu) {
            content.classList.remove('submenu-active');
            submenu.classList.remove('active');
            
            // Remove active class from the trigger
            if (trigger) {
                trigger.classList.remove('active');
            }
        }
    }

    /**
     * Hide any currently active submenu
     */
    hideActiveSubmenu() {
        if (this.activeSubmenu) {
            this.hideSubmenu(this.activeSubmenu.context, this.activeSubmenu.type);
        }
    }

    /**
     * Handle submenu item action (language change, tutorial start, etc.)
     */
    handleSubmenuAction(context, type, item) {
        if (type === 'language') {
            // Language submenu actions are handled directly by localization manager
            console.log(`UniversalSubmenuManager: Language submenu action handled by localization manager`);
        } else if (type === 'tutorial') {
            const tutorial = item.getAttribute('data-tutorial');
            console.log(`UniversalSubmenuManager: Dispatching tutorial start: ${tutorial}`);
            
            const event = new CustomEvent('submenu:tutorial:selected', {
                detail: { tutorial: tutorial }
            });
            document.dispatchEvent(event);
        }
    }

    /**
     * Handle back button clicks in overflow menu
     */
    handleBackButtonClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('UniversalSubmenuManager: Back button clicked');
        
        // Hide the submenu and return to main menu
        this.hideAllOverflowSubmenus();
    }

    /**
     * Hide all overflow submenus and return to main menu
     */
    hideAllOverflowSubmenus() {
        const content = document.querySelector('.overflow-menu-content');
        const backButton = document.querySelector('.overflow-menu-back');
        
        if (content) {
            // Remove submenu-active class to hide submenu column
            content.classList.remove('submenu-active');
            
            // Remove active classes from all submenu triggers
            const triggers = content.querySelectorAll('.nav-link.language-switcher, .nav-link.tutorial-switcher');
            triggers.forEach(trigger => {
                trigger.classList.remove('active');
            });
            
            // Hide all submenu content
            const submenus = content.querySelectorAll('.submenu-content');
            submenus.forEach(submenu => {
                submenu.classList.remove('active');
            });
            
            // Hide back button in header
            if (backButton) {
                backButton.style.display = 'none';
            }
            
            console.log('UniversalSubmenuManager: All overflow submenus hidden');
        }
    }

    /**
     * Register a new context
     */
    registerContext(name, config) {
        this.contexts.set(name, config);
    }

    /**
     * Get active submenu info
     */
    getActiveSubmenu() {
        return this.activeSubmenu;
    }
}
