/**
 * Simple localization system for language-aware routing
 */
export class Localization {
  constructor(path) {
    this.basePath = path || ''; // Use provided base path
    this.currentLanguage = 'en'; // Default language
    this.previousLanguage = 'en'; // Default language
    this.translations = {}; // Will hold all loaded translations
    this.supportedLanguages = ['en', 'fr']; // Add your supported languages
  }

  /**
   * Initialize the localization system
   */
  async init() {
    // Get language from URL path, accounting for base path
    const fullPath = window.location.pathname;
    
    // Parse the base path to get just the path portion
    let basePath = '';
    if (this.basePath) {
      try {
        const baseUrl = new URL(this.basePath);
        basePath = baseUrl.pathname;
      } catch (e) {
        // If URL parsing fails, use the basePath as is
        basePath = this.basePath.replace(/^https?:\/\/[^\/]+/, '');
      }
    }
    
    // Remove the base path to get the application-specific path
    let appPath = fullPath;
    if (basePath && fullPath.startsWith(basePath)) {
      appPath = fullPath.substring(basePath.length);
    }
    
    // Now extract language from the app path
    const pathSegments = appPath.split('/').filter(Boolean);
    const urlLang = pathSegments[0];
    
    if (this.supportedLanguages.includes(urlLang)) {
      this.currentLanguage = urlLang;
    }
    
    // Load translations for current language
    await this.loadTranslations(this.currentLanguage);
    
    // Initialize language switcher if it exists
    this.initLanguageSwitcher();

    // Add this to the init() method in Localization class
    eventBus.on('requestTranslation', (data) => {
      if (data.element && data.key) {
        data.element.textContent = this.translate(data.key);
      }
    });
  }

  /**
   * Load translations for a specific language
   */
  async loadTranslations(lang) {
    try {
      // Use the language controller to fetch translations
      const response = await fetch(`${this.basePath}/language/translations/${lang}`);
      if (!response.ok) throw new Error(`Failed to load ${lang} translations`);
      this.translations[lang] = await response.json();
    } catch (error) {
      console.error('Error loading translations:', error);
      // Fallback to empty translations object
      this.translations[lang] = {};
    }
  }

  /**
   * Get a translated string
   */
  translate(key, replacements = {}) {
    const lang = this.currentLanguage;
    
    // Check if translations for this language exist
    if (!this.translations[lang]) {
      console.warn(`No translations loaded for ${lang}`);
      return key;
    }
    
    // Handle nested keys like "header.home"
    let translation = key;
    if (key.includes('.')) {
      const parts = key.split('.');
      let current = this.translations[lang];
      
      // Navigate through the nested structure
      for (const part of parts) {
        if (current && typeof current === 'object' && part in current) {
          current = current[part];
        } else {
          // If any part of the path doesn't exist, return the key
          console.warn(`Translation key not found: ${key}`);
          return key;
        }
      }
      
      translation = current;
    } else {
      // Handle flat keys for backward compatibility
      translation = this.translations[lang][key] || key;
    }
    
    // Handle replacements (e.g., "Hello, {name}" -> "Hello, John")
    Object.keys(replacements).forEach(placeholder => {
      translation = translation.replace(
        new RegExp(`{${placeholder}}`, 'g'), 
        replacements[placeholder]
      );
    });
    
    return translation;
  }

  /**
   * Initialize language switcher UI
   */
  initLanguageSwitcher() {
    // Find all language switcher elements
    const languageSwitchers = document.querySelectorAll('.language-switcher');
    if (languageSwitchers.length === 0) return;
    
    // Also find all submenu language links (overflow menu)
    const submenuLanguageLinks = document.querySelectorAll('.submenu-content.language-submenu a[data-language]');
    
    languageSwitchers.forEach(switcher => {
      const currentLanguageElement = switcher.querySelector('.current-language');
      const languageLinks = switcher.querySelectorAll('.language-dropdown a[data-language]');
      
      // Toggle dropdown when clicking the current language
      if (currentLanguageElement) {
        currentLanguageElement.addEventListener('click', (e) => {
          e.stopPropagation();
          switcher.classList.toggle('open');
        });
      }
      
      // Update active state based on current language
      languageLinks.forEach(link => {
        const lang = link.getAttribute('data-language');
        
        // Add active class to current language
        if (lang === this.currentLanguage) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
        
        // Add click event listener
        link.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.switchLanguage(lang);
          switcher.classList.remove('open'); // Close dropdown after selection
        });
      });
    });
      
    // Close dropdowns when clicking outside (single listener for all switchers)
    if (languageSwitchers.length > 0) {
      document.addEventListener('click', (e) => {
        languageSwitchers.forEach(switcher => {
          if (!switcher.contains(e.target)) {
        switcher.classList.remove('open');
          }
        });
      });
    }
    
    // Handle submenu language links (overflow menu)
    submenuLanguageLinks.forEach(link => {
      const lang = link.getAttribute('data-language');
      
      // Add active class to current language
      if (lang === this.currentLanguage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
      
      // Add click event listener
      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.switchLanguage(lang);
      });
    });

    // Language submenu clicks are handled directly above, no need for event listeners
  }

  /**
   * Switch the current language
   */
  async switchLanguage(lang) {
    // Exit if the lang isn't supported or hasn't changed
    if (!this.supportedLanguages.includes(lang) || lang === this.currentLanguage) {
        return;
    }
    
    // Check if we're on a form page that's editing an existing text
    const form = document.querySelector('[data-form-type][data-form-activity="editing"]');
    const textId = form ? document.querySelector('[data-id]')?.value : null;
    
    // Save current language
    this.previousLanguage = this.currentLanguage;
    
    // Update current language
    this.currentLanguage = lang;
    
    try {
        // Load translations for new language
        await this.loadTranslations(lang);
        
        // Update all translations on the page
        this.updatePageTranslations();
        
        // Update the page title
        this.updatePageTitle();
        
        // Update all URLs on the page
        this.updatePageUrls(this.previousLanguage, lang);

        // Update tooltips
        this.updateTooltips();
        
        // Update URL without reloading the page
        const currentUrl = new URL(window.location.href);
        const pathParts = currentUrl.pathname.split('/');
        
        // Find the language segment index (usually after the base path)
        let langIndex = -1;
        for (let i = 0; i < pathParts.length; i++) {
            if (this.supportedLanguages.includes(pathParts[i])) {
                langIndex = i;
                break;
            }
        }
        
        // Replace the language segment if found
        if (langIndex !== -1) {
            pathParts[langIndex] = lang;
            currentUrl.pathname = pathParts.join('/');
            
            // If we're on an editing form, add the text_id as a query parameter
            if (form && textId) {
                currentUrl.searchParams.set('id', textId);
            }
            
            // Keep the query parameters and hash
            window.history.pushState({}, '', currentUrl.toString());
        }
        
        // Update language switcher UI
        this.updateLanguageSwitcherUI(lang);
        
        // Emit an event that language has changed
        if (window.eventBus) {
            window.eventBus.emit('languageChanged', { 
                from: this.previousLanguage, 
                to: this.currentLanguage 
            });
        }
    } catch (error) {
        console.error('Error switching language:', error);
        // Revert to previous language on error
        this.currentLanguage = this.previousLanguage;
    }
  }

  /**
   * Update all URLs on the page to use the new language
   */
  updatePageUrls(oldLang, newLang) {
    // Update all links on the page
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      
      // Only update links that contain the old language code
      if (href && href.includes(`/${oldLang}/`)) {
        const newHref = href.replace(`/${oldLang}/`, `/${newLang}/`);
        link.setAttribute('href', newHref);
      }
    });
    
    // Add this new code to update form action URLs
    document.querySelectorAll('form[action]').forEach(form => {
      const action = form.getAttribute('action');
      
      // Only update actions that contain the old language code
      if (action && action.includes(`/${oldLang}/`)) {
        const newAction = action.replace(`/${oldLang}/`, `/${newLang}/`);
        form.setAttribute('action', newAction);
      }
    });
  }

  /**
   * Update the language switcher UI
   */
  updateLanguageSwitcherUI(lang) {
    const languageSwitchers = document.querySelectorAll('.language-switcher');
    const submenuLanguageLinks = document.querySelectorAll('.submenu-content.language-submenu a[data-language]');
    
    languageSwitchers.forEach(switcher => {
      const currentLanguageElement = switcher.querySelector('.current-language');
      const languageLinks = switcher.querySelectorAll('.language-dropdown a[data-language]');
      
      // Update current language display text
      if (currentLanguageElement) {
        currentLanguageElement.textContent = lang.toUpperCase();
      }
      
      // Update active state for language links
      languageLinks.forEach(link => {
        const linkLang = link.getAttribute('data-language');
        
        if (linkLang === lang) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
      
      // Close the dropdown
      switcher.classList.remove('open');
    });
    
    // Update submenu language links (overflow menu)
    submenuLanguageLinks.forEach(link => {
      const linkLang = link.getAttribute('data-language');
      
      if (linkLang === lang) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  /**
   * Update all elements with data-i18n attributes
   * @param {HTMLElement} container - Optional container to limit translation scope
   */
  updatePageTranslations(container = document) {
    // In the container provided is null, exit.
    if (!container) {
      return;
    }
    // Update all translations within the specified container
    container.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const isHtml = element.hasAttribute('data-i18n-html') && 
                      element.getAttribute('data-i18n-html') === 'true';
        
        // Check if there are parameters for this translation
        let params = {};
        if (element.hasAttribute('data-i18n-params')) {
            try {
                params = JSON.parse(element.getAttribute('data-i18n-params'));
            } catch (e) {
                console.error('Error parsing i18n params:', e);
            }
        }
        
        // Get the translation with placeholders
        let translation = this.translate(key);
        
        // Check if any parameter contains HTML (like links)
        const hasHtmlParams = Object.values(params).some(value => 
            typeof value === 'string' && value.includes('<')
        );
        
        if (isHtml || hasHtmlParams) {
            // Apply all parameters to the translation
            Object.keys(params).forEach(param => {
                translation = translation.replace(
                    new RegExp(`{${param}}`, 'g'), 
                    params[param]
                );
            });
            
            // Set as HTML
            element.innerHTML = translation;

            // After updating the translation, check for SVGs that need to be inserted
            this.updateSVGsInTranslatedContent(element);

            // Update tooltips
            this.updateTooltips();
        } else {
            // Standard text translation
            element.textContent = this.translate(key, params);
        }
    });
    
    // Update all title attributes that need translation within the container
    container.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.setAttribute('title', this.translate(key));
    });
    
    // Update all placeholder attributes that need translation within the container
    container.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translation = this.translate(key);
        
        // Set the placeholder attribute on the original element
        element.setAttribute('placeholder', translation);
        
        // Find and update the CKEditor placeholder if it exists
        // First, look for the CKEditor container that follows this textarea
        const editorContainer = element.nextElementSibling?.classList.contains('ck-editor') 
            ? element.nextElementSibling 
            : null;
        
        if (editorContainer) {
            // Find the placeholder element within the CKEditor container
            const placeholderElement = editorContainer.querySelector('.ck-placeholder[data-placeholder]');
            if (placeholderElement) {
                placeholderElement.setAttribute('data-placeholder', translation);
            }
        }
    });
    
    // Then update all links when language changes
    this.updatePageUrls(this.previousLanguage, this.currentLanguage);
    this.handleInnerTranslations();
  }

  /**
   * Update the page title if it has a translation key
   */
  updatePageTitle() {
    const titleElement = document.querySelector('title[data-i18n-title]');
    if (titleElement) {
      const titleKey = titleElement.getAttribute('data-i18n-title');
      titleElement.textContent = this.translate(titleKey);
    }
  }

  /**
   * Update all tooltips on the page
   */
  updateTooltips() {
    const tooltipElements = document.querySelectorAll('[data-i18n-tooltip]');
    tooltipElements.forEach(element => {
      const key = element.getAttribute('data-i18n-tooltip');
      element.setAttribute('data-tooltip-text', this.translate(key));
    });
  }

  handleInnerTranslations() {
    const innerElements = document.querySelectorAll('[data-i18n-inner]');
    innerElements.forEach(innerElement => {
      const key = innerElement.getAttribute('data-i18n-inner');
      innerElement.textContent = this.translate(key);
    });
  }

  /**
   * Update SVGs within translated content
   * This specifically targets elements with data-i18n-svg attribute
   */
  updateSVGsInTranslatedContent(translatedElement) {
    // Find all elements with data-i18n-svg within the translated content
    const svgElements = translatedElement.querySelectorAll('[data-svg]');
    
    if (svgElements.length > 0) {
      // Import SVGManager if not already available
      import('./svgManager.js').then(module => {
        const SVGManager = module.SVGManager;
        
        svgElements.forEach(element => {
          const svgType = element.getAttribute('data-svg');
          if (SVGManager[svgType + 'SVG']) {
            element.innerHTML = SVGManager[svgType + 'SVG'];
          } else {
            console.error(`Method ${svgType}SVG not found on SVGManager.`);
          }
        });
      }).catch(error => {
        console.error('Error loading SVGManager:', error);
      });
    }
  }

   /**
   * Create an element with i18n attributes
   */
   createI18nElement(tagName, key, params = null, isHtml = false) {
    const element = document.createElement(tagName);
    element.setAttribute('data-i18n', key);
    
    if (params) {
      element.setAttribute('data-i18n-params', JSON.stringify(params));
    }
    
    if (isHtml) {
      element.setAttribute('data-i18n-html', 'true');
    }
    
    return element;
  }
  
  /**
   * Create a translated message with multiple parts
   */
  createTranslatedMessage(container, parts) {
    // Clear container
    container.innerHTML = '';
    
    // Add each part to the container
    parts.forEach(part => {
      const { key, params, isHtml } = part;
      const span = this.createI18nElement('span', key, params, isHtml);
      container.appendChild(span);
    });
    
    // Translate the container
    this.updatePageTranslations(container);
    
    return container;
  }

  // Add to your Localization class
  createUrl(path, queryParams = {}) {
    // Ensure path doesn't start with a slash
    const cleanPath = path.replace(/^\/+/, '');
    
    // Create URL with current language
    let url = `${this.basePath}${this.currentLanguage}/${cleanPath}`;
    
    // Add query parameters if any
    const params = new URLSearchParams(queryParams);
    if (params.toString()) {
        url += `?${params.toString()}`;
    }
    
    return url;
  }

  getCurrentLocale() {
    return this.currentLanguage;
  }
}
