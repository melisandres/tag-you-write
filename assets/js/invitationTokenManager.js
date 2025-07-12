import { eventBus } from './eventBus.js';

export class InvitationTokenManager {
    constructor(warningManager) {
        this.warningManager = warningManager;
        this.init();
    }

    init() {
        // Check for pending confirmations when the page loads
        this.checkPendingConfirmations();
    }

    async checkPendingConfirmations() {
        try {
            const response = await fetch(window.i18n.createUrl('GameInvitation/getPendingConfirmations'));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const responseText = await response.text();
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON:', parseError);
                return;
            }
            
            if (result.success && result.pendingConfirmations && result.pendingConfirmations.length > 0) {
                // Process each pending confirmation
                for (const confirmation of result.pendingConfirmations) {
                    await this.showConfirmationModal(confirmation);
                }
            }
        } catch (error) {
            console.error('Error checking pending confirmations:', error);
        }
    }

    async showConfirmationModal(confirmation) {
        const invitedEmail = confirmation.invited_email;
        const currentUserEmail = confirmation.current_user_email;
        const context = confirmation.context || 'post_login';
        const tokens = confirmation.tokens || [confirmation.token];
        
        // Create the message using translation keys based on context and count
        const isPlural = tokens.length > 1;
        const messageKey = context === 'visit' || context === 'manual-linking'
            ? (isPlural ? 'invitation.immediate_visit_message_plural' : 'invitation.immediate_visit_message')
            : (isPlural ? 'invitation.confirmation_message_plural' : 'invitation.confirmation_message');
        const messageParams = {
            invited_email: invitedEmail,
            current_user_email: currentUserEmail,
            count: tokens.length
        };
        
        return new Promise((resolve) => {
            this.warningManager.createWarningModal(
                messageKey,
                messageParams,
                async () => {
                    // User confirmed - link all invitations for this email
                    try {
                        for (const token of tokens) {
                            const result = await this.confirmInvitation(token, true);
                            if (!result.success) {
                                console.error('Failed to link invitation:', result.message);
                            }
                        }
                    } catch (error) {
                        console.error('Error confirming invitations:', error);
                    }
                    resolve();
                },
                async () => {
                    // User rejected - remove all tokens for this email
                    try {
                        for (const token of tokens) {
                            const result = await this.confirmInvitation(token, false);
                            if (!result.success) {
                                console.error('Failed to reject invitation:', result.message);
                            }
                        }
                    } catch (error) {
                        console.error('Error rejecting invitations:', error);
                    }
                    resolve();
                },
                'invitation.confirm_link',
                'invitation.reject_link'
            );
        });
    }

    async confirmInvitation(token, confirmed) {
        const endpoint = `GameInvitation/confirmInvitation/${token}/${confirmed ? 'true' : 'false'}`;
        const url = window.i18n.createUrl(endpoint);
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // If confirmation was successful and user confirmed (not rejected), remove the banner
        if (result.success && confirmed) {
            // Find the game element that has this token and remove its banner
            this.removeTemporaryAccessBannerForToken(token);

            // Call the method to update permissions using data from response
            if (result.game_id && result.root_id) {
                window.dataManager.handleEntireTreeUpdate(result.game_id, result.root_id);
            }
        }
        
        return result;
    }

    removeTemporaryAccessBannerForToken(token) {
        console.log('Attempting to remove banner for token:', token);
        // Find the button that has this token, then find its parent game element
        const button = document.querySelector(`[data-token="${token}"]`);
        console.log('Found button:', button);
        if (button) {
            // Find the parent .story element (the actual game container)
            const gameElement = button.closest('.story');
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
                console.log('No .story element found as parent of button');
            }
        } else {
            console.log('No button found with data-token:', token);
        }
    }
} 