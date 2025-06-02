import { eventBus } from './eventBus.js';

/**
 * PageTypeManager - Phase 1 of Activity Detection
 * 
 * Responsible for determining:
 * 1. What type of page the user is currently on (page_type)
 * 2. What activity they're performing based on that page (activity_type)
 * 
 * This information drives how CurrentActivityManager extracts context IDs in Phase 2.
 */
export class PageTypeManager {
    /**
     * Detect the current page type based on DOM elements
     * @returns {string} One of: 'game_list', 'text_form', 'collab_page', 'home', 'other'
     */
    static getCurrentPageType() {
        if (document.querySelector('[data-stories]')) return 'game_list';
        if (document.querySelector('[data-form-type="root"]')) return 'text_form';
        if (document.querySelector('[data-form-type="iteration"]')) return 'text_form';
        if (document.querySelector('[data-form-type="addingNote"]')) return 'text_form';
        if (document.querySelector('[data-one-story]')) return 'collab_page';
        if (document.querySelector('.home-container')) return 'home';
        return 'other';
    }

    /**
     * Determine the user's activity type based on the page type
     * @param {string} pageType - The page type from getCurrentPageType()
     * @returns {string} One of: 'browsing', 'starting_game', 'editing', 'other'
     */
    static getActivityTypeForPageType(pageType) {
        switch (pageType) {
            case 'game_list':
            case 'collab_page':
            case 'home':
                return 'browsing';
            case 'text_form':
                if (document.querySelector('[data-form-type="root"]')) return 'starting_game';
                if (document.querySelector('[data-form-type="addingNote"]')) return 'adding_note';
                return 'iterating';
            default:
                return 'other';
        }
    }
}