export class MenuManager {
    constructor() {
        this.menuContainer = document.querySelector('.menu-container');
        if (!this.menuContainer) {
            return;
        }
        this.menus = [
            {
                name: 'search',
                order: 1,
                element: document.querySelector('.search-menu'),
                height: 'var(--filters-height)'
            },
            {
                name: 'filter',
                order: 2,
                element: document.querySelector('.filter-menu'),
                height: 'var(--filters-height)'
            }
        ];
    }

    toggleMenu(menuName) {
        const menu = this.menus.find(m => m.name === menuName);
        if (!menu) {
            console.error('Menu not found:', menuName);
            return;
        }

        const isVisible = menu.element.classList.contains('visible');
        
        if (isVisible) {
            this.closeMenu(menu);
        } else {
            this.openMenu(menu);
        }
    }

    openMenu(menu) {
        // Add visible class to new menu
        menu.element.classList.add('visible');
        
        // Update container height
        this.updateContainerHeight();
        
        // Position menus based on their order
        this.updateMenuPositions();
    }

    closeMenu(menu) {
        // Remove visible class from just this menu
        menu.element.classList.remove('visible');
        
        // Update container height
        this.updateContainerHeight();
        
        // Ensure ALL menus are properly positioned, even closed ones
        this.updateAllMenuPositions();
    }

    updateContainerHeight() {
        // Get currently visible menus
        const visibleMenus = this.menus.filter(m => 
            m.element.classList.contains('visible')
        );

        // Calculate new height
        const filterHeight = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--filters-height'));
        
        // Container height only includes visible menus
        const containerHeight = visibleMenus.length * filterHeight;
        this.menuContainer.style.height = `${containerHeight}px`;

        // Main content margin includes nav height plus visible menus
        const mainElement = document.querySelector('main');
        if (mainElement) {
            const totalMargin = filterHeight + containerHeight; // nav height + menu height
            mainElement.style.marginTop = `${totalMargin}px`;
        }
    }

    updateMenuPositions() {
        // Sort visible menus by order
        const visibleMenus = this.menus
            .filter(m => m.element.classList.contains('visible'))
            .sort((a, b) => a.order - b.order);

        // Position each menu
        const filterHeight = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--filters-height'));
            
        visibleMenus.forEach((menu, index) => {
            menu.element.style.transform = `translateY(${index * filterHeight}px)`;
        });
    }

    updateAllMenuPositions() {
        const filterHeight = parseInt(getComputedStyle(document.documentElement)
            .getPropertyValue('--filters-height'));
            
        // Position ALL menus, not just visible ones
        this.menus.forEach(menu => {
            if (menu.element.classList.contains('visible')) {
                const visibleIndex = this.menus
                    .filter(m => m.element.classList.contains('visible'))
                    .findIndex(m => m.name === menu.name);
                menu.element.style.transform = `translateY(${visibleIndex * filterHeight}px)`;
            } else {
                // Ensure closed menus are properly hidden above
                menu.element.style.transform = 'translateY(-100%)';
            }
        });
    }
}