/**
 * TextSwitcherManager - Handles animated switching between text versions
 * Creates distortion effects and smooth transitions between v1 and v2 texts
 */
export class TextSwitcherManager {
    constructor() {
        this.options = {
            transitionDuration: 1000, // 1 second transition
            distortionIntensity: 0.4, // How strong the distortion effect is
        };
        
        this.currentVersion = 1;
        this.isTransitioning = false;
        this.elements = []; // Array of DOM elements
        this.elementData = new Map(); // Store element metadata
        
        this.init();
    }
    
    init() {
        this.findElements();
        this.setupEventListeners();
        this.animateEntry();
    }
    
    findElements() {
        // Find all elements with data-switchable attribute
        const elements = document.querySelectorAll('[data-switchable="true"]');
        
        elements.forEach(element => {
            const i18nKey = element.getAttribute('data-i18n');
            if (i18nKey && i18nKey.includes('home_index')) {
                // Create version 2 key by adding '2' to the end
                const v2Key = i18nKey + '2';
                
                // Store the element
                this.elements.push(element);
                
                // Store element metadata
                this.elementData.set(element, {
                    v1Key: i18nKey,
                    v2Key: v2Key,
                    originalContent: element.textContent.trim()
                });
            }
        });
        
        // console.log(`TextSwitcher: Found ${this.elements.length} switchable elements`);
    }
    
    setupEventListeners() {
        // Find the parent container with data-text-switcher="true"
        const container = document.querySelector('[data-text-switcher="true"]');
        
        if (container) {
            // Click to switch
            container.addEventListener('click', () => {
                this.switchVersion();
            });
            
            // Hover enter to switch (not exit)
            container.addEventListener('mouseenter', () => {
                this.switchVersion();
            });
        }
        
        // Listen for language changes to trigger animation
        this.setupLanguageChangeListener();
    }
    
    setupLanguageChangeListener() {
        // Listen for language changes
        if (window.eventBus) {
            window.eventBus.on('languageChanged', () => {
                const ourElements = document.querySelectorAll('[data-switchable="true"]');
                if (ourElements.length > 0) {
                    this.triggerLanguageChangeAnimation(ourElements);
                    // Update all our elements to current version
                    ourElements.forEach(element => {
                        this.updateElementToCurrentVersion(element);
                    });
                }
            });
        }
    }
    
    updateElementToCurrentVersion(element) {
        // Get the original key from our element data
        const elementData = this.elementData.get(element);
        // console.log('updateElementToCurrentVersion:', element, elementData, 'currentVersion:', this.currentVersion);
        
        if (elementData) {
            const targetKey = this.currentVersion === 1 ? elementData.v1Key : elementData.v2Key;
            // console.log('Setting targetKey:', targetKey);
            element.setAttribute('data-i18n', targetKey);
            this.updateElementContent(element, targetKey);
        } else {
            console.warn('Element not found in element data:', element);
        }
    }
    
    triggerLanguageChangeAnimation(elements) {
        this.applyDistortionEffect(elements, () => {
            // Update elements to current version after language change
            elements.forEach(element => {
                this.updateElementToCurrentVersion(element);
            });
        });
    }
    
    animateEntry() {
        // Animate elements on page load with staggered distortion effect
        this.elements.forEach((element, index) => {
            // Start hidden and distorted
            element.style.opacity = '0';
            element.style.transform = 'translateY(30px) scale(0.9)';
            element.style.filter = 'blur(3px)';
            
            // Stagger the animations
            setTimeout(() => {
                // Apply distortion effect
                element.classList.add('text-switcher-distorting');
                this.applyRandomDistortion(element);
                
                // Animate to visible state
                element.style.transition = 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
                element.style.opacity = '1';
                element.style.transform = 'translateY(0) scale(1)';
                element.style.filter = 'blur(0)';
                
                // Settle the distortion
                setTimeout(() => {
                    element.classList.remove('text-switcher-distorting');
                    element.classList.add('text-switcher-settling');
                    this.resetDistortion(element);
                }, 400);
                
                // Clean up
                setTimeout(() => {
                    element.classList.remove('text-switcher-settling');
                }, 800);
                
            }, 200 + (index * 150));
        });
    }
    
    switchVersion() {
        if (this.isTransitioning) return;
        
        // console.log('switchVersion called, currentVersion before:', this.currentVersion);
        this.isTransitioning = true;
        this.currentVersion = this.currentVersion === 1 ? 2 : 1;
        // console.log('switchVersion called, currentVersion after:', this.currentVersion);
        
        // Apply distortion effect and switch content
        this.applyDistortionEffect(this.elements, () => {
            this.updateContent();
            this.removeDistortionEffect();
        });
    }
    
    applyDistortionEffect(elements, callback) {
        elements.forEach(element => {
            element.classList.add('text-switcher-distorting');
            this.applyRandomDistortion(element);
        });
        
        // Wait for distortion to complete, then execute callback
        setTimeout(() => {
            if (callback) callback();
        }, this.options.transitionDuration / 2);
    }
    
    applyRandomDistortion(element) {
        // Add random distortion values
        const intensity = this.options.distortionIntensity;
        const randomX = (Math.random() - 0.5) * intensity * 10;
        const randomY = (Math.random() - 0.5) * intensity * 10;
        const randomRotation = (Math.random() - 0.5) * intensity * 5;
        const randomScale = 1 + (Math.random() - 0.5) * intensity * 0.2;
        
        element.style.setProperty('--distort-x', `${randomX}px`);
        element.style.setProperty('--distort-y', `${randomY}px`);
        element.style.setProperty('--distort-rotation', `${randomRotation}deg`);
        element.style.setProperty('--distort-scale', randomScale);
    }
    
    resetDistortion(element) {
        element.style.setProperty('--distort-x', '0px');
        element.style.setProperty('--distort-y', '0px');
        element.style.setProperty('--distort-rotation', '0deg');
        element.style.setProperty('--distort-scale', '1');
    }
    
    updateContent() {
        // console.log('updateContent called, currentVersion:', this.currentVersion, 'elements count:', this.elements.length);
        this.elements.forEach(element => {
            const elementData = this.elementData.get(element);
            if (elementData) {
                const targetKey = this.currentVersion === 1 ? elementData.v1Key : elementData.v2Key;
                // console.log('Updating element:', element, 'with key:', targetKey);
                
                // Update the data-i18n attribute
                element.setAttribute('data-i18n', targetKey);
                
                // Update the content using the existing translation system
                this.updateElementContent(element, targetKey);
            }
        });
    }
    
    updateElementContent(element, key) {
        // console.log('updateElementContent called with key:', key, 'element:', element);
        
        // Use the existing translation system if available
        if (window.i18n && window.i18n.translate) {
            const translation = window.i18n.translate(key);
            // console.log('Translation result:', translation);
            element.textContent = translation;
        } else if (window.eventBus) {
            // console.log('Using eventBus for translation');
            // Try using the event bus system
            window.eventBus.emit('requestTranslation', {
                element: element,
                key: key
            });
        } else {
            // console.log('Using fallback translation');
            // Fallback: try to trigger translation manually
            this.triggerExistingTranslation(element, key);
        }
    }
    

    
    removeDistortionEffect() {
        this.elements.forEach(element => {
            element.classList.remove('text-switcher-distorting');
            element.classList.add('text-switcher-settling');
            this.resetDistortion(element);
        });
        
        // Remove settling class after animation
        setTimeout(() => {
            this.elements.forEach(element => {
                element.classList.remove('text-switcher-settling');
            });
            this.isTransitioning = false;
        }, this.options.transitionDuration / 2);
    }
    
    // Public API methods
    setVersion(version) {
        if (version === this.currentVersion || this.isTransitioning) return;
        
        this.currentVersion = version;
        this.switchVersion();
    }
    
    getCurrentVersion() {
        return this.currentVersion;
    }
    
    destroy() {
        this.elements = [];
        this.elementData.clear();
    }
}

// Export for use in main.js
