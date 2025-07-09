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
        
        // Create the message using translation keys
        const messageKey = 'invitation.confirmation_message';
        const messageParams = {
            invited_email: invitedEmail,
            current_user_email: currentUserEmail
        };
        
        // Get the translated message
        console.log('About to translate:', messageKey, messageParams);
        const message = window.i18n.translate(messageKey, messageParams);
        console.log('Translation result:', message);
        
        return new Promise((resolve) => {
            this.warningManager.createWarningModal(
                message,
                async () => {
                    // User confirmed - link the invitation
                    try {
                        const result = await this.confirmInvitation(confirmation.token, true);
                        if (!result.success) {
                            console.error('Failed to link invitation:', result.message);
                        }
                    } catch (error) {
                        console.error('Error confirming invitation:', error);
                    }
                    resolve();
                },
                async () => {
                    // User rejected - remove the token
                    try {
                        const result = await this.confirmInvitation(confirmation.token, false);
                        if (!result.success) {
                            console.error('Failed to reject invitation:', result.message);
                        }
                    } catch (error) {
                        console.error('Error rejecting invitation:', error);
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

        return await response.json();
    }
} 