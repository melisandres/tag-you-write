/**
 * Simple localization system for language-aware routing
 */
export class Localization {
  constructor(path) {
    this.basePath = path || ''; // Use provided base path
    this.currentLanguage = 'en'; // Default language
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
    console.log('PARSED BASE PATH:', basePath);
    
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
      console.log('URL language setting current language:', this.currentLanguage);
    }
    
    // Load translations for current language
    await this.loadTranslations(this.currentLanguage);
    
    // Initialize language switcher if it exists
    this.initLanguageSwitcher();
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
    
    // Get the translation or fall back to the key itself
    let translation = this.translations[lang][key] || key;
    
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
    
    languageSwitchers.forEach(switcher => {
      const currentLanguageElement = switcher.querySelector('.current-language');
      const languageLinks = switcher.querySelectorAll('.language-dropdown a[data-language]');
      
      // Toggle dropdown when clicking the current language
      if (currentLanguageElement) {
        // Add console log to verify this code is running
        console.log('Adding click listener to language element', currentLanguageElement);
        
        currentLanguageElement.addEventListener('click', (e) => {
          e.stopPropagation();
          console.log('Language clicked, toggling dropdown');
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
      
      // Close dropdown when clicking outside
      document.addEventListener('click', () => {
        switcher.classList.remove('open');
      });
    });
  }

  /**
   * Switch the current language
   */
  async switchLanguage(lang) {
    // Exit if the lang isn't supported or hasn't changed
    if (!this.supportedLanguages.includes(lang) || lang === this.currentLanguage) {
        console.log('Language not supported or no change');
        return;
    }
    
    // Save current language
    const previousLanguage = this.currentLanguage;
    
    // Update current language
    this.currentLanguage = lang;
    
    try {
      // Load translations for new language
      await this.loadTranslations(lang);
      
      // Update all translations on the page
      this.updatePageTranslations();
      
      // Update all URLs on the page
      this.updatePageUrls(previousLanguage, lang);
      
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
        
        // Keep the query parameters and hash
        window.history.pushState({}, '', currentUrl.toString());
      }
      
      // Update language switcher UI
      this.updateLanguageSwitcherUI(lang);
      
      // Emit an event that language has changed
      if (window.eventBus) {
        window.eventBus.emit('languageChanged', { 
          from: previousLanguage, 
          to: lang 
        });
      }
    } catch (error) {
      console.error('Error switching language:', error);
      // Revert to previous language on error
      this.currentLanguage = previousLanguage;
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
  }

  /**
   * Update the language switcher UI
   */
  updateLanguageSwitcherUI(lang) {
    const languageSwitchers = document.querySelectorAll('.language-switcher');
    
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
  }

  /**
   * Update all elements with data-i18n attributes
   */
  updatePageTranslations() {
    // Update all translations
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      
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
      
      if (hasHtmlParams) {
        // Apply all parameters to the translation
        Object.keys(params).forEach(param => {
          translation = translation.replace(
            new RegExp(`{${param}}`, 'g'), 
            params[param]
          );
        });
        
        // Set as HTML
        element.innerHTML = translation;
      } else {
        // Standard text translation
        element.textContent = this.translate(key, params);
      }
    });
    
    // Then update all links when language changes
    this.updatePageUrls(this.previousLanguage, this.currentLanguage);
  }
}
