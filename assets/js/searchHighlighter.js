import { eventBus } from './eventBus.js';

export class SearchHighlighter {
    constructor() {
        console.log('SearchHighlighter constructor called');
        if (SearchHighlighter.instance) {
            console.log('Returning existing instance');
            return SearchHighlighter.instance;
        }
        
        console.log('Creating new SearchHighlighter instance');
        SearchHighlighter.instance = this;
        
        this.initEventListeners();
    }

    initEventListeners() {
        console.log('Initializing SearchHighlighter event listeners');
        eventBus.on('highlightSearchMatches', ({ container, searchTerm }) => {
            console.log('highlightSearchMatches event received:', { container, searchTerm });
            this.highlightContainer(container, searchTerm);
        });
        
        eventBus.on('removeSearchHighlights', (container) => {
            console.log('removeSearchHighlights event received:', container);
            this.removeAllHighlights(container);
        });
    }

    // This is being used to highlight search matches in the game list
    highlightContainer(container, searchTerm) {
        console.log('Highlighting container:', { container, searchTerm });
        if (!searchTerm) return;
        
        // For game list
        if (container.classList.contains('stories')) {
            console.log('Processing games list container');
            const gameElements = container.querySelectorAll('.story');
            gameElements.forEach(gameElement => {
                const titleElement = gameElement.querySelector('.story-title h2 a');
                const promptElement = gameElement.querySelectorAll('.story-prompt p');
                
                if (titleElement) {
                    titleElement.innerHTML = this.highlightText(titleElement.textContent, searchTerm);
                }
                if (promptElement.length > 0) {
                    for (let i = 0; i < promptElement.length; i++) {
                        promptElement[i].innerHTML = this.highlightText(promptElement[i].textContent, searchTerm);
                    }
                }
            });
        }
    }

    highlightText(text, searchTerm) {
        if (!searchTerm) return text;
        
        // Escape special characters in search term
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        
        return text.replace(regex, '<mark>$1</mark>');
    }

    removeAllHighlights(container = document) {
        const highlights = container.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.textContent = parent.textContent; // This removes the span and preserves the text
        });
    }
}
