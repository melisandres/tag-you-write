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
        const messageKey = context === 'visit' 
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

        return await response.json();
    }
} 