/**
 * Service layer for managing invitee-related data operations.
 * 
 * Responsibilities:
 * - Fetch recent collaborators from backend
 * - Search users via API with debouncing
 * - Manage data state and caching
 * - Handle API errors and loading states
 * - Provide filtered data to UI components
 */
export class InviteeServices {
    constructor() {
        this.collaborators = [];
        this.usersMatchingSearch = [];
        this.isLoadingCollaborators = false;
        this.isLoadingSearch = false;
        this.hasLoadedCollaborators = false;
        this.currentSearchTerm = '';
        this.searchDebounceTimer = null;
        
        // Event callbacks for UI updates
        this.onCollaboratorsLoaded = null;
        this.onSearchResultsUpdated = null;
        this.onLoadingStateChanged = null;
        this.onError = null;
    }

    /**
     * Set event callbacks for UI updates
     */
    setEventCallbacks({
        onCollaboratorsLoaded = null,
        onSearchResultsUpdated = null,
        onLoadingStateChanged = null,
        onError = null
    } = {}) {
        this.onCollaboratorsLoaded = onCollaboratorsLoaded;
        this.onSearchResultsUpdated = onSearchResultsUpdated;
        this.onLoadingStateChanged = onLoadingStateChanged;
        this.onError = onError;
    }

    /**
     * Get current collaborators
     */
    getCollaborators() {
        return this.collaborators;
    }

    /**
     * Get current search users
     */
    getSearchUsers() {
        return this.usersMatchingSearch;
    }

    /**
     * Get current search term
     */
    getCurrentSearchTerm() {
        return this.currentSearchTerm;
    }

    /**
     * Check if collaborators are loaded
     */
    isCollaboratorsLoaded() {
        return this.hasLoadedCollaborators;
    }

    /**
     * Check if currently loading collaborators
     */
    isLoadingCollaboratorsData() {
        return this.isLoadingCollaborators;
    }

    /**
     * Check if currently loading search results
     */
    isLoadingSearchData() {
        return this.isLoadingSearch;
    }

    /**
     * Get filtered recent collaborators based on search term
     */
    getFilteredCollaborators(searchTerm = null) {
        const term = (searchTerm !== null ? searchTerm : this.currentSearchTerm).toLowerCase();
        
        if (!term) {
            return this.collaborators;
        }
        
        return this.collaborators.filter(collaborator => {
            const fullName = collaborator.fullName.toLowerCase();
            const firstName = collaborator.firstName.toLowerCase();
            const lastName = collaborator.lastName.toLowerCase();
            
            return fullName.includes(term) || 
                   firstName.includes(term) || 
                   lastName.includes(term);
        });
    }

    /**
     * Get filtered search users based on search term
     * Excludes users that are already in recent collaborators
     */
    getFilteredSearchUsers(searchTerm = null) {
        const term = (searchTerm !== null ? searchTerm : this.currentSearchTerm).toLowerCase();
        
        // Get IDs of recent collaborators to exclude duplicates
        const recentCollaboratorIds = new Set(this.collaborators.map(collab => collab.id));
        
        // Filter search users to exclude recent collaborators
        let filteredUsers = this.usersMatchingSearch.filter(user => !recentCollaboratorIds.has(user.id));
        
        // Further filter based on input text if provided
        if (term) {
            filteredUsers = filteredUsers.filter(user => {
                const fullName = user.fullName.toLowerCase();
                const firstName = user.firstName.toLowerCase();
                const lastName = user.lastName.toLowerCase();
                
                return fullName.includes(term) || 
                       firstName.includes(term) || 
                       lastName.includes(term);
            });
        }
        
        return filteredUsers;
    }

    /**
     * Get combined list of all filtered users
     */
    getAllFilteredUsers(searchTerm = null) {
        const filteredCollaborators = this.getFilteredCollaborators(searchTerm);
        const filteredSearchUsers = this.getFilteredSearchUsers(searchTerm);
        const allUsers = [...filteredCollaborators, ...filteredSearchUsers];
        
        // Remove duplicates by ID
        const uniqueUsers = allUsers.filter((user, index, arr) => 
            arr.findIndex(u => u.id === user.id) === index
        );
        return uniqueUsers;
    }

    /**
     * Load recent collaborators from the backend
     */
    async loadCollaborators() {
        if (this.isLoadingCollaborators || this.hasLoadedCollaborators) {
            return { success: true, collaborators: this.collaborators };
        }

        this.isLoadingCollaborators = true;
        this.notifyLoadingStateChanged();

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
                    const error = 'User not authenticated';
                    this.notifyError(error);
                    return { success: false, error };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success && data.collaborators) {
                this.collaborators = data.collaborators;
                this.hasLoadedCollaborators = true;
                this.notifyCollaboratorsLoaded(this.collaborators);
                return { success: true, collaborators: this.collaborators };
            } else {
                const error = data.error || 'Failed to load collaborators';
                console.warn('Failed to load collaborators:', error);
                this.notifyError(error);
                return { success: false, error };
            }

        } catch (error) {
            console.error('Error loading recent collaborators:', error);
            this.notifyError(error.message);
            return { success: false, error: error.message };
        } finally {
            this.isLoadingCollaborators = false;
            this.notifyLoadingStateChanged();
        }
    }

    /**
     * Search users with debouncing
     */
    searchUsers(searchTerm) {
        // Update current search term immediately
        this.currentSearchTerm = searchTerm;
        
        // Clear existing timer
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }

        // Set new timer for debounced search
        this.searchDebounceTimer = setTimeout(() => {
            this.performUserSearch(searchTerm);
        }, 200); // 200ms debounce
    }

    /**
     * Perform the actual user search via API
     */
    async performUserSearch(searchTerm) {
        // Store the search term we're about to search for
        const currentSearchAttempt = searchTerm;

        // Clear search results if term is too short
        if (!searchTerm || searchTerm.length < 2) {
            this.usersMatchingSearch = [];
            this.isLoadingSearch = false;
            this.notifySearchResultsUpdated();
            this.notifyLoadingStateChanged();
            return { success: true, users: [] };
        }

        this.isLoadingSearch = true;
        this.notifyLoadingStateChanged();

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
                    this.usersMatchingSearch = [];
                    this.notifySearchResultsUpdated();
                    return { success: false, error: 'User not authenticated' };
                }
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            // Only update if this is still the current search term
            if (data.success && data.users && currentSearchAttempt === this.currentSearchTerm) {
                this.usersMatchingSearch = data.users;
                this.notifySearchResultsUpdated();
                return { success: true, users: this.usersMatchingSearch };
            } else if (!data.success) {
                const error = data.error || 'Failed to search users';
                console.warn('Failed to search users:', error);
                this.usersMatchingSearch = [];
                this.notifySearchResultsUpdated();
                this.notifyError(error);
                return { success: false, error };
            }

        } catch (error) {
            console.error('Error searching users:', error);
            this.usersMatchingSearch = [];
            this.notifySearchResultsUpdated();
            this.notifyError(error.message);
            return { success: false, error: error.message };
        } finally {
            // Only clear loading state if this is still the current search attempt
            if (currentSearchAttempt === this.currentSearchTerm) {
                this.isLoadingSearch = false;
                this.notifyLoadingStateChanged();
            }
        }
    }

    /**
     * Clear search results and reset search term
     */
    clearSearch() {
        this.currentSearchTerm = '';
        this.usersMatchingSearch = [];
        this.isLoadingSearch = false;
        
        // Clear any pending search
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
            this.searchDebounceTimer = null;
        }
        
        this.notifySearchResultsUpdated();
        this.notifyLoadingStateChanged();
    }

    /**
     * Refresh collaborators data (force reload)
     */
    async refreshCollaborators() {
        this.hasLoadedCollaborators = false;
        this.collaborators = [];
        return await this.loadCollaborators();
    }

    /**
     * Update search term without triggering search (for filtering only)
     */
    updateSearchTerm(searchTerm) {
        this.currentSearchTerm = searchTerm;
    }

    // === Notification methods for UI callbacks ===

    notifyCollaboratorsLoaded(collaborators) {
        if (this.onCollaboratorsLoaded) {
            this.onCollaboratorsLoaded(collaborators);
        }
    }

    notifySearchResultsUpdated() {
        if (this.onSearchResultsUpdated) {
            this.onSearchResultsUpdated(this.usersMatchingSearch);
        }
    }

    notifyLoadingStateChanged() {
        if (this.onLoadingStateChanged) {
            this.onLoadingStateChanged({
                isLoadingCollaborators: this.isLoadingCollaborators,
                isLoadingSearch: this.isLoadingSearch
            });
        }
    }

    notifyError(error) {
        if (this.onError) {
            this.onError(error);
        }
    }
} 