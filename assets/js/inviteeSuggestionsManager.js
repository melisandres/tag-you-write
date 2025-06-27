import { eventBus } from './eventBus.js';
import { InviteeServices } from './inviteeServices.js';

/**
 * Manages the UI for invitee suggestions and user search functionality.
 * 
 * Responsibilities:
 * - Handle UI interactions and DOM manipulation
 * - Display suggestions in dropdown with sticky headers
 * - Handle collaborator/user selection for invitee input
 * - Manage visual feedback for selected users
 * - Coordinate with InviteInputManager and ValidationManager
 * 
 * Uses InviteeServices for all data operations.
 */
export class InviteeSuggestionsManager {
    constructor() {
        this.selectedCollaboratorIds = new Set(); // Track selected collaborators
        this.lastScrollPosition = 0; // Track scroll position
        
        // DOM elements
        this.suggestionsContainer = null;
        this.inviteeInput = document.getElementById('invitees-input');
        this.inviteInputManager = null; // Will be set when available
        
        // Initialize service
        this.inviteeServices = new InviteeServices();
        
        if (this.inviteeInput) {
            this.init();
            // Make this instance available globally
            window.inviteeSuggestionsManagerInstance = this;
            // Legacy support
            window.recentCollaboratorsManagerInstance = this;
        }
    }

    init() {
        this.setupServiceCallbacks();
        this.createSuggestionsContainer();
        this.setupEventListeners();
        this.setupInviteInputIntegration();
    }

    /**
     * Set up callbacks for service events
     */
    setupServiceCallbacks() {
        this.inviteeServices.setEventCallbacks({
            onCollaboratorsLoaded: (collaborators) => {
                this.renderCurrentState();
            },
            onSearchResultsUpdated: (searchUsers) => {
                this.renderCurrentState();
            },
            onLoadingStateChanged: (loadingState) => {
                this.renderCurrentState();
            },
            onError: (error) => {
                this.showErrorState(error);
            }
        });
    }

    /**
     * Create the suggestions container if it doesn't exist
     */
    createSuggestionsContainer() {
        // Check if container already exists
        this.suggestionsContainer = document.getElementById('collaborators-suggestions');
        
        if (!this.suggestionsContainer) {
            this.suggestionsContainer = document.createElement('div');
            this.suggestionsContainer.id = 'collaborators-suggestions';
            this.suggestionsContainer.className = 'collaborators-suggestions';
            this.suggestionsContainer.style.display = 'none'; // Ensure hidden by default
            
            // Insert after the invitee input
            if (this.inviteeInput.parentNode) {
                this.inviteeInput.parentNode.insertBefore(
                    this.suggestionsContainer, 
                    this.inviteeInput.nextSibling
                );
            }
        }
    }

    /**
     * Set up event listeners for user interaction
     */
    setupEventListeners() {
        // Show suggestions when input is focused
        this.inviteeInput.addEventListener('focus', () => {
            if (this.inviteeServices.isCollaboratorsLoaded()) {
                this.showSuggestions();
            } else {
                // If not loaded yet, trigger load and then show
                this.inviteeServices.loadCollaborators().then(() => {
                    this.showSuggestions();
                });
            }
        });

        // Hide suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.suggestionsContainer.contains(e.target) && 
                !this.inviteeInput.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // Listen for input changes to filter suggestions and trigger search
        this.inviteeInput.addEventListener('input', () => {
            const inputValue = this.inviteeInput.value.trim();
            
            console.log(this.inviteeServices);
            // Update search term in service and trigger search
            this.inviteeServices.searchUsers(inputValue);
            
            // Re-render with current filtered data
            this.renderCurrentState();
        });
    }

    /**
     * Set up integration with InviteInputManager
     */
    setupInviteInputIntegration() {
        // Wait for InviteInputManager to be available
        const checkForInviteManager = () => {
            // Find the InviteInputManager instance
            if (window.inviteInputManagerInstance) {
                this.inviteInputManager = window.inviteInputManagerInstance;
                this.setupInviteInputListeners();
            } else {
                // Try to find it via the input element
                setTimeout(checkForInviteManager, 100);
            }
        };
        checkForInviteManager();
    }

    /**
     * Set up listeners for InviteInputManager events
     */
    setupInviteInputListeners() {
        if (!this.inviteInputManager) return;

        // Listen for invitee changes to update visual feedback
        eventBus.on('inviteesChanged', () => {
            this.updateSelectedCollaborators();
        });
    }

    /**
     * Update the set of selected collaborator IDs based on current invitees
     */
    updateSelectedCollaborators() {
        if (!this.inviteInputManager) return;

        const currentInvitees = this.inviteInputManager.getInvitees();
        const newSelectedIds = new Set(
            currentInvitees
                .filter(invitee => invitee.userId)
                .map(invitee => invitee.userId)
        );
        
        // Find IDs that changed state
        const previouslySelected = new Set(this.selectedCollaboratorIds);
        
        // Handle newly selected
        for (const id of newSelectedIds) {
            if (!previouslySelected.has(id)) {
                this.updateUserVisualState(id, true);
            }
        }
        
        // Handle newly deselected
        for (const id of previouslySelected) {
            if (!newSelectedIds.has(id)) {
                this.updateUserVisualState(id, false);
            }
        }
        
        // Update our tracking
        this.selectedCollaboratorIds = newSelectedIds;
    }

    /**
     * Show loading state for collaborators
     */
    showCollaboratorsLoadingState() {
        this.suggestionsContainer.innerHTML = `
            <div class="suggestions-loading">
                <span data-i18n="cr_it_ed.loading">${window.i18n ? window.i18n.translate('cr_it_ed.loading') : 'Loading...'}</span>
            </div>
        `;
        this.suggestionsContainer.style.display = 'block';
    }

    /**
     * Show error state in suggestions container
     */
    showErrorState(message) {
        this.suggestionsContainer.innerHTML = `
            <div class="suggestions-error">
                <span data-i18n="cr_it_ed.error_loading_collaborators">${message || (window.i18n ? window.i18n.translate('cr_it_ed.error_loading_collaborators') : 'Error loading collaborators')}</span>
            </div>
        `;
        this.suggestionsContainer.style.display = 'block';
    }

    /**
     * Show the suggestions container
     */
    showSuggestions() {
        const filteredCollaborators = this.inviteeServices.getFilteredCollaborators();
        const filteredSearchUsers = this.inviteeServices.getFilteredSearchUsers();
        const currentSearchTerm = this.inviteeServices.getCurrentSearchTerm();
        
        if (filteredCollaborators.length > 0 || filteredSearchUsers.length > 0 || currentSearchTerm.length >= 2) {
            this.suggestionsContainer.style.display = 'block';
            this.renderCurrentState();
            
            // Apply correct styling based on current hidden field state
            this.syncVisualStateWithHiddenField();
        }
    }

    /**
     * Sync visual state with current hidden field contents (called on focus)
     */
    syncVisualStateWithHiddenField() {
        if (!this.inviteInputManager) return;

        // Get current invitees from the manager
        const currentInvitees = this.inviteInputManager.getInvitees();
        const currentSelectedIds = new Set(
            currentInvitees
                .filter(invitee => invitee.userId)
                .map(invitee => invitee.userId)
        );

        // Update our tracking
        this.selectedCollaboratorIds = currentSelectedIds;

        // Apply visual state to all users (collaborators and search results)
        const allUsers = [
            ...this.inviteeServices.getCollaborators(), 
            ...this.inviteeServices.getSearchUsers()
        ];
        allUsers.forEach(user => {
            const isSelected = currentSelectedIds.has(user.id);
            this.updateUserVisualState(user.id, isSelected);
        });
    }

    /**
     * Hide the suggestions container
     */
    hideSuggestions() {
        this.suggestionsContainer.style.display = 'none';
    }

    /**
     * Render the current state with filtered data
     */
    renderCurrentState() {
        const filteredCollaborators = this.inviteeServices.getFilteredCollaborators();
        const filteredSearchUsers = this.inviteeServices.getFilteredSearchUsers();
        this.renderSuggestions(filteredCollaborators, filteredSearchUsers);
    }

    /**
     * Filter suggestions based on current input (legacy method for backward compatibility)
     */
    filterSuggestions() {
        this.renderCurrentState();
    }

    /**
     * Render the suggestions list with both collaborators and search results
     */
    renderSuggestions(collaboratorsToShow = null, searchUsersToShow = null) {
        const collaborators = collaboratorsToShow !== null ? collaboratorsToShow : this.inviteeServices.getFilteredCollaborators();
        const searchUsers = searchUsersToShow !== null ? searchUsersToShow : this.inviteeServices.getFilteredSearchUsers();
        const currentSearchTerm = this.inviteeServices.getCurrentSearchTerm();
        const isLoadingSearch = this.inviteeServices.isLoadingSearchData();
        
        let suggestionsHTML = '';

        // Recent Collaborators Section
        if (collaborators.length > 0) {
            suggestionsHTML += `
                <div class="suggestions-header recent-collaborators-header">
                    <span data-i18n="cr_it_ed.recent_collaborators">${window.i18n ? window.i18n.translate('cr_it_ed.recent_collaborators') : 'Recent Collaborators'}</span>
                </div>
                <div class="suggestions-list recent-collaborators-list">
                    ${collaborators.map(collaborator => this.createUserSuggestion(collaborator)).join('')}
                </div>
            `;
        }

        // Always show Other Users section
        suggestionsHTML += `
            <div class="suggestions-header search-users-header">
                <span data-i18n="cr_it_ed.other_users">${window.i18n ? window.i18n.translate('cr_it_ed.other_users') : 'Other Users'}</span>
            </div>
        `;

        // Search Results or Messages Section
        if (isLoadingSearch) {
            suggestionsHTML += `
                <div class="suggestions-loading">
                    <span data-i18n="cr_it_ed.loading">${window.i18n ? window.i18n.translate('cr_it_ed.loading') : 'Loading...'}</span>
                </div>
            `;
        } else if (searchUsers.length > 0) {
            suggestionsHTML += `
                <div class="suggestions-list search-users-list">
                    ${searchUsers.map(user => this.createUserSuggestion(user)).join('')}
                </div>
            `;
        } else if (currentSearchTerm.length >= 2) {
            suggestionsHTML += `
                <div class="suggestions-empty">
                    <span data-i18n="cr_it_ed.no_users_found">${window.i18n ? window.i18n.translate('cr_it_ed.no_users_found') : 'No users found'}</span>
                </div>
            `;
        } else {
            suggestionsHTML += `
                <div class="suggestions-empty">
                    <span data-i18n="cr_it_ed.type_to_search">${window.i18n ? window.i18n.translate('cr_it_ed.type_to_search') : 'Type to search for users...'}</span>
                </div>
            `;
        }

        // Show empty state if nothing to display
        if (!suggestionsHTML) {
            suggestionsHTML = `
                <div class="suggestions-empty">
                    <span data-i18n="cr_it_ed.no_collaborators_found">${window.i18n ? window.i18n.translate('cr_it_ed.no_collaborators_found') : 'No collaborators found'}</span>
                </div>
            `;
        }

        this.suggestionsContainer.innerHTML = suggestionsHTML;
        this.suggestionsContainer.style.display = 'block';
        
        // Set up click handlers after rendering
        this.setupUserClickHandlers();
        
        // Restore scroll position
        this.restoreScrollPosition();
    }

    /**
     * Create HTML for a single user suggestion (works for both collaborators and search results)
     */
    createUserSuggestion(user) {
        const isSelected = this.selectedCollaboratorIds.has(user.id);
        const buttonIcon = isSelected ? '✓' : '+';
        const buttonClass = isSelected ? 'selected' : '';
        const buttonTitle = isSelected ? 
            (window.i18n ? window.i18n.translate('cr_it_ed.collaborator_selected') : 'Already selected') :
            (window.i18n ? window.i18n.translate('cr_it_ed.add_collaborator') : 'Add collaborator');

        return `
            <div class="collaborator-suggestion ${isSelected ? 'selected' : ''}" data-user-id="${user.id}">
                <div class="collaborator-info">
                    <span class="collaborator-name">${user.fullName}</span>
                </div>
                <button type="button" class="add-collaborator-btn ${buttonClass}" 
                        data-user-id="${user.id}"
                        data-user-name="${user.fullName}"
                        data-i18n-title="${isSelected ? 'cr_it_ed.collaborator_selected' : 'cr_it_ed.add_collaborator'}"
                        title="${buttonTitle}">
                    ${buttonIcon}
                </button>
            </div>
        `;
    }

    /**
     * Update visual state of a single user suggestion (works for both collaborators and search results)
     */
    updateUserVisualState(userId, isSelected) {
        const suggestionElement = this.suggestionsContainer.querySelector(
            `.collaborator-suggestion[data-user-id="${userId}"]`
        );
        
        if (!suggestionElement) return;

        // Update suggestion row class
        suggestionElement.classList.toggle('selected', isSelected);

        // Update button
        const button = suggestionElement.querySelector('.add-collaborator-btn');
        if (button) {
            button.classList.toggle('selected', isSelected);
            button.innerHTML = isSelected ? '✓' : '+';
            button.title = isSelected ? 
                (window.i18n ? window.i18n.translate('cr_it_ed.collaborator_selected') : 'Already selected') :
                (window.i18n ? window.i18n.translate('cr_it_ed.add_collaborator') : 'Add collaborator');
        }
    }

    /**
     * Handle user selection/deselection
     */
    selectUser(userId, userName) {
        if (!this.inviteInputManager) {
            console.warn('InviteInputManager not available');
            return;
        }

        const isCurrentlySelected = this.selectedCollaboratorIds.has(userId);

        // Check if already selected - if so, deselect
        if (isCurrentlySelected) {
            this.deselectUser(userId, userName);
            return;
        }

        // Add using the InviteInputManager's method with user data
        const success = this.inviteInputManager.addInviteeWithData(userName, userId, 'username');
        
        if (success) {
            // Update our tracking
            this.selectedCollaboratorIds.add(userId);
            
            // Update just this user's visual state
            this.updateUserVisualState(userId, true);
            
            // Clear the input and search results
            this.inviteeInput.value = '';
            this.inviteeServices.clearSearch();
            this.renderCurrentState();
            
            // Emit event for other components
            eventBus.emit('collaboratorSelected', { id: userId, name: userName });
        }
    }

    /**
     * Handle user deselection
     */
    deselectUser(userId, userName) {
        if (!this.inviteInputManager) {
            console.warn('InviteInputManager not available');
            return;
        }

        // Remove from InviteInputManager by finding the matching invitee
        const currentInvitees = this.inviteInputManager.getInvitees();
        const inviteeToRemove = currentInvitees.find(inv => inv.userId === userId);
        
        if (inviteeToRemove) {
            this.inviteInputManager.removeInvitee(inviteeToRemove.input);
            
            // Update our tracking
            this.selectedCollaboratorIds.delete(userId);
            
            // Update just this user's visual state
            this.updateUserVisualState(userId, false);
            
            // Emit event for other components
            eventBus.emit('collaboratorDeselected', { id: userId, name: userName });
        }
    }

    /**
     * Save current scroll position
     */
    saveScrollPosition() {
        if (this.suggestionsContainer) {
            this.lastScrollPosition = this.suggestionsContainer.scrollTop;
        }
    }

    /**
     * Restore scroll position after rendering
     */
    restoreScrollPosition() {
        if (this.suggestionsContainer && this.lastScrollPosition > 0) {
            setTimeout(() => {
                this.suggestionsContainer.scrollTop = this.lastScrollPosition;
            }, 0);
        }
    }

    /**
     * Set up click handlers for user suggestions
     */
    setupUserClickHandlers() {
        const addButtons = this.suggestionsContainer.querySelectorAll('.add-collaborator-btn');
        
        addButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const userId = button.dataset.userId;
                const userName = button.dataset.userName;
                this.selectUser(userId, userName);
            });
        });

        // Also allow clicking on the entire suggestion row
        const suggestions = this.suggestionsContainer.querySelectorAll('.collaborator-suggestion');
        
        suggestions.forEach(suggestion => {
            suggestion.addEventListener('click', (e) => {
                if (!e.target.classList.contains('add-collaborator-btn')) {
                    const button = suggestion.querySelector('.add-collaborator-btn');
                    const userId = button.dataset.userId;
                    const userName = button.dataset.userName;
                    this.selectUser(userId, userName);
                }
            });
        });
    }

    /**
     * Get combined list of all users (for validation purposes)
     * Returns both filtered collaborators and search results
     */
    getAllUsers() {
        return this.inviteeServices.getAllFilteredUsers();
    }

    /**
     * Refresh collaborators data
     */
    refreshCollaborators() {
        return this.inviteeServices.refreshCollaborators();
    }

    /**
     * Load collaborators if not already loaded
     */
    loadCollaborators() {
        return this.inviteeServices.loadCollaborators();
    }

    // === Service delegation methods ===
    
    /**
     * Get current collaborators from service
     */
    getCollaborators() {
        return this.inviteeServices.getCollaborators();
    }

    /**
     * Get current search users from service
     */
    getSearchUsers() {
        return this.inviteeServices.getSearchUsers();
    }

    /**
     * Get current search term from service
     */
    getCurrentSearchTerm() {
        return this.inviteeServices.getCurrentSearchTerm();
    }

    // === Legacy methods for backward compatibility ===
    
    /**
     * @deprecated Use selectUser instead
     */
    selectCollaborator(collaboratorId, collaboratorName) {
        this.selectUser(collaboratorId, collaboratorName);
    }

    /**
     * @deprecated Use deselectUser instead  
     */
    deselectCollaborator(collaboratorId, collaboratorName) {
        this.deselectUser(collaboratorId, collaboratorName);
    }

    /**
     * Legacy getter for collaborators (for backward compatibility)
     */
    get collaborators() {
        return this.inviteeServices.getCollaborators();
    }

    /**
     * Legacy getter for search users (for backward compatibility)
     */
    get searchUsers() {
        return this.inviteeServices.getSearchUsers();
    }

    /**
     * Legacy getter for current search term (for backward compatibility)
     */
    get currentSearchTerm() {
        return this.inviteeServices.getCurrentSearchTerm();
    }

    /**
     * Legacy getter for loading state (for backward compatibility)
     */
    get isLoadingCollaborators() {
        return this.inviteeServices.isLoadingCollaboratorsData();
    }

    /**
     * Legacy getter for loading state (for backward compatibility)
     */
    get isLoadingSearch() {
        return this.inviteeServices.isLoadingSearchData();
    }

    /**
     * Legacy getter for loaded state (for backward compatibility)
     */
    get hasLoadedCollaborators() {
        return this.inviteeServices.isCollaboratorsLoaded();
    }
} 