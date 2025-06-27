import { eventBus } from './eventBus.js';

/**
 * Manages recent collaborators and user search functionality for invitee input system.
 * 
 * Responsibilities:
 * - Fetch recent collaborators from backend
 * - Search users as user types (debounced)
 * - Display both lists in suggestion dropdown with sticky headers
 * - Handle collaborator/user selection for invitee input
 * - Coordinate with InviteInputManager and ValidationManager
 */
export class RecentCollaboratorsManager {
    constructor() {
        this.collaborators = [];
        this.searchUsers = [];
        this.isLoadingCollaborators = false;
        this.isLoadingSearch = false;
        this.hasLoadedCollaborators = false;
        this.selectedCollaboratorIds = new Set(); // Track selected collaborators
        this.lastScrollPosition = 0; // Track scroll position
        this.searchDebounceTimer = null;
        this.currentSearchTerm = '';
        
        // DOM elements
        this.suggestionsContainer = null;
        this.inviteeInput = document.getElementById('invitees-input');
        this.inviteInputManager = null; // Will be set when available
        
        if (this.inviteeInput) {
            this.init();
            // Make this instance available globally
            window.recentCollaboratorsManagerInstance = this;
        }
    }

    init() {
        this.createSuggestionsContainer();
        this.setupEventListeners();
        this.setupInviteInputIntegration();
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
            if (this.hasLoadedCollaborators) {
                this.showSuggestions();
            } else {
                // If not loaded yet, trigger load and then show
                this.loadCollaborators().then(() => {
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
            
            // Update current search term immediately for consistent filtering
            this.currentSearchTerm = inputValue;
            
            // Trigger debounced search for users
            this.debouncedUserSearch(inputValue);
            
            // Re-render with current filtered data (both recent collaborators and search results)
            this.renderCurrentState();
        });
    }

    /**
     * Debounced search for users
     */
    debouncedUserSearch(searchTerm) {
        // Clear existing timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // Set new timer
        this.searchDebounceTimer = setTimeout(() => {
            this.searchUsersApi(searchTerm);
        }, 200); // 200ms debounce - faster response
    }

    /**
     * Search users via API
     */
    async searchUsersApi(searchTerm) {
        // Store the search term we're about to search for
        const currentSearchAttempt = searchTerm;
        this.currentSearchTerm = searchTerm;

        // Clear search results if term is too short
        if (!searchTerm || searchTerm.length < 2) {
            this.searchUsers = [];
            this.isLoadingSearch = false;
            this.renderCurrentState();
            return;
        }

        this.isLoadingSearch = true;
        this.renderCurrentState(); // Use renderCurrentState instead of showSearchLoadingState

        try {
            const endpoint = 'gameInvitation/searchUsers';
            const url = window.i18n.createUrl(endpoint) + '?q=' + encodeURIComponent(searchTerm);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('User not authenticated for user search');
                    this.searchUsers = [];
                } else {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return;
            }

            const data = await response.json();
            
            // Only update if this is still the current search term
            if (data.success && data.users && currentSearchAttempt === this.currentSearchTerm) {
                this.searchUsers = data.users;
            } else {
                console.warn('Failed to search users:', data.error);
                this.searchUsers = [];
            }

        } catch (error) {
            console.error('Error searching users:', error);
            this.searchUsers = [];
        } finally {
            // Only clear loading state if this is still the current search attempt
            if (currentSearchAttempt === this.currentSearchTerm) {
                this.isLoadingSearch = false;
                this.renderCurrentState();
            }
        }
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
     * Fetch recent collaborators from the backend
     */
    async loadCollaborators() {
        if (this.isLoadingCollaborators || this.hasLoadedCollaborators) return;

        this.isLoadingCollaborators = true;
        this.showCollaboratorsLoadingState();

        try {
            const endpoint = 'gameInvitation/getRecentCollaborators';
            const url = window.i18n.createUrl(endpoint);
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin'
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('User not authenticated for recent collaborators');
                    this.showErrorState('User not authenticated');
                    return;
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.collaborators) {
                this.collaborators = data.collaborators;
                this.hasLoadedCollaborators = true;
                
                // Render but keep hidden unless input is focused
                this.renderCurrentState();
                this.hideSuggestions();
            } else {
                console.warn('Failed to load collaborators:', data.error);
            }

        } catch (error) {
            console.error('Error loading recent collaborators:', error);
            this.showErrorState();
        } finally {
            this.isLoadingCollaborators = false;
        }
    }

    /**
     * Show loading state for collaborators
     */
    showCollaboratorsLoadingState() {
        this.suggestionsContainer.innerHTML = `
            <div class="suggestions-loading">
                <span>${window.i18n ? window.i18n.translate('cr_it_ed.loading') : 'Loading...'}</span>
            </div>
        `;
        this.suggestionsContainer.style.display = 'block';
    }

    /**
     * Show loading state for search
     */
    showSearchLoadingState() {
        // Only show if we're currently displaying suggestions
        if (this.suggestionsContainer.style.display === 'block') {
            this.renderCurrentState();
        }
    }

    /**
     * Show error state in suggestions container
     */
    showErrorState(message) {
        this.suggestionsContainer.innerHTML = `
            <div class="suggestions-error">
                <span>${message || (window.i18n ? window.i18n.translate('cr_it_ed.error_loading_collaborators') : 'Error loading collaborators')}</span>
            </div>
        `;
        this.suggestionsContainer.style.display = 'block';
    }

    /**
     * Show the suggestions container
     */
    showSuggestions() {
        if (this.collaborators.length > 0 || this.searchUsers.length > 0 || this.currentSearchTerm.length >= 2) {
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
        [...this.collaborators, ...this.searchUsers].forEach(user => {
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
     * Get filtered recent collaborators based on current input
     */
    getFilteredCollaborators() {
        const inputValue = this.currentSearchTerm.toLowerCase();
        
        if (!inputValue) {
            return this.collaborators;
        }
        
        return this.collaborators.filter(collaborator => {
            const fullName = collaborator.fullName.toLowerCase();
            const firstName = collaborator.firstName.toLowerCase();
            const lastName = collaborator.lastName.toLowerCase();
            
            return fullName.includes(inputValue) || 
                   firstName.includes(inputValue) || 
                   lastName.includes(inputValue);
        });
    }

    /**
     * Get filtered search users based on current input
     * Excludes users that are already in recent collaborators
     */
    getFilteredSearchUsers() {
        const inputValue = this.currentSearchTerm.toLowerCase();
        
        // Get IDs of recent collaborators to exclude duplicates
        const recentCollaboratorIds = new Set(this.collaborators.map(collab => collab.id));
        
        // Filter search users to exclude recent collaborators
        let filteredUsers = this.searchUsers.filter(user => !recentCollaboratorIds.has(user.id));
        
        // Further filter based on input text if provided
        if (inputValue) {
            filteredUsers = filteredUsers.filter(user => {
                const fullName = user.fullName.toLowerCase();
                const firstName = user.firstName.toLowerCase();
                const lastName = user.lastName.toLowerCase();
                
                return fullName.includes(inputValue) || 
                       firstName.includes(inputValue) || 
                       lastName.includes(inputValue);
            });
        }
        
        return filteredUsers;
    }

    /**
     * Render the current state with filtered data
     */
    renderCurrentState() {
        const filteredCollaborators = this.getFilteredCollaborators();
        const filteredSearchUsers = this.getFilteredSearchUsers();
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
        const collaborators = collaboratorsToShow !== null ? collaboratorsToShow : this.getFilteredCollaborators();
        const searchUsers = searchUsersToShow !== null ? searchUsersToShow : this.getFilteredSearchUsers();
        let suggestionsHTML = '';

        // Recent Collaborators Section
        if (collaborators.length > 0) {
            suggestionsHTML += `
                <div class="suggestions-header recent-collaborators-header">
                    <span>${window.i18n ? window.i18n.translate('cr_it_ed.recent_collaborators') : 'Recent Collaborators'}</span>
                </div>
                <div class="suggestions-list recent-collaborators-list">
                    ${collaborators.map(collaborator => this.createUserSuggestion(collaborator)).join('')}
                </div>
            `;
        }

        // Search Results Section
        if (this.currentSearchTerm.length >= 2) {
            suggestionsHTML += `
                <div class="suggestions-header search-users-header">
                    <span>${window.i18n ? window.i18n.translate('cr_it_ed.other_users') : 'Other Users'}</span>
                </div>
            `;

            if (this.isLoadingSearch) {
                suggestionsHTML += `
                    <div class="suggestions-loading">
                        <span>${window.i18n ? window.i18n.translate('cr_it_ed.loading') : 'Loading...'}</span>
                    </div>
                `;
            } else if (searchUsers.length > 0) {
                suggestionsHTML += `
                    <div class="suggestions-list search-users-list">
                        ${searchUsers.map(user => this.createUserSuggestion(user)).join('')}
                    </div>
                `;
            } else {
                suggestionsHTML += `
                    <div class="suggestions-empty">
                        <span>${window.i18n ? window.i18n.translate('cr_it_ed.no_users_found') : 'No users found'}</span>
                    </div>
                `;
            }
        } else if (this.currentSearchTerm.length > 0) {
            suggestionsHTML += `
                <div class="suggestions-header search-users-header">
                    <span>${window.i18n ? window.i18n.translate('cr_it_ed.other_users') : 'Other Users'}</span>
                </div>
                <div class="suggestions-empty">
                    <span>${window.i18n ? window.i18n.translate('cr_it_ed.type_to_search') : 'Type to search for users...'}</span>
                </div>
            `;
        }

        // Show empty state if nothing to display
        if (!suggestionsHTML) {
            suggestionsHTML = `
                <div class="suggestions-empty">
                    <span>${window.i18n ? window.i18n.translate('cr_it_ed.no_collaborators_found') : 'No collaborators found'}</span>
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
            this.currentSearchTerm = '';
            this.searchUsers = [];
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
        const filteredCollaborators = this.getFilteredCollaborators();
        const filteredSearchUsers = this.getFilteredSearchUsers();
        const allUsers = [...filteredCollaborators, ...filteredSearchUsers];
        
        // Remove duplicates by ID
        const uniqueUsers = allUsers.filter((user, index, arr) => 
            arr.findIndex(u => u.id === user.id) === index
        );
        return uniqueUsers;
    }

    /**
     * Refresh collaborators data
     */
    refreshCollaborators() {
        this.hasLoadedCollaborators = false;
        this.loadCollaborators();
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
} 