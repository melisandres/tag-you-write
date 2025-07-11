import { SVGManager } from './svgManager.js';
import { eventBus } from './eventBus.js';

export class InvitationLinkManager {
    constructor() {
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // Listen for clicks on link buttons
        document.addEventListener('click', (event) => {
            if (event.target.closest('[data-action="link-invitation"]')) {
                event.preventDefault();
                this.handleLinkInvitation(event.target.closest('[data-action="link-invitation"]'));
            }
        });
    }

    async handleLinkInvitation(button) {
        const gameId = button.getAttribute('data-game-id');
        if (!gameId) {
            console.error('No game ID found for invitation linking');
            return;
        }

        try {
            // Disable button to prevent multiple clicks
            button.disabled = true;
            button.style.opacity = '0.6';
            
            // Get the token from the button's data attribute
            const token = button.getAttribute('data-token');
            if (!token) {
                console.error('No invitation token found');
                eventBus.emit('showToast', {
                    message: 'toast.invitation.no_token',
                    type: 'error'
                });
                return;
            }

            // Create endpoint using the established pattern
            const endpoint = `GameInvitation/processLoggedInInvitation/${token}`;
            const url = window.i18n.createUrl(endpoint);
            
            // Make API call to link invitation
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            
            if (result.success) {
                // Remove the banner and update the game
                this.removeTemporaryAccessBanner(gameId);
                
                // Show success message using toast system
                eventBus.emit('showToast', {
                    message: result.toastMessage || 'toast.invitation.link_success',
                    type: 'success'
                });
                
            } else if (result.needsConfirmation) {
                // Trigger the confirmation modal system
                if (window.invitationTokenManager) {
                    window.invitationTokenManager.checkPendingConfirmations();
                }
            } else {
                // Show error using toast system
                eventBus.emit('showToast', {
                    message: result.toastMessage || 'toast.invitation.link_failed',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Error linking invitation:', error);
            eventBus.emit('showToast', {
                message: 'toast.invitation.link_failed',
                type: 'error'
            });
        } finally {
            // Re-enable button
            button.disabled = false;
            button.style.opacity = '1';
        }
    }

    removeTemporaryAccessBanner(gameId) {
        console.log('Attempting to remove banner for game ID:', gameId);
        // Find the game element and remove the banner
        const gameElement = document.querySelector(`[data-game-id="${gameId}"]`);
        console.log('Found game element:', gameElement);
        if (gameElement) {
            const banner = gameElement.querySelector('.temporary-access-banner');
            console.log('Found banner:', banner);
            if (banner) {
                banner.remove();
                // Remove the has-temporary-access class
                gameElement.classList.remove('has-temporary-access');
                console.log('Banner removed successfully');
            } else {
                console.log('No banner found in game element');
            }
        } else {
            console.log('No game element found with data-game-id:', gameId);
        }
    }


} 