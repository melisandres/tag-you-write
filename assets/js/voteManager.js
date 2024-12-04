import { eventBus } from './eventBus.js';

export class VoteManager {
    constructor(path, warningManager) {
        this.path = path;
        this.init();
        this.warningManager = warningManager;
    }

    init() {
        // Use event delegation on the parent element
        const modalBtns = document.querySelector('.modal-btns');
        const dataStories = document.querySelector('[data-stories]');

        if (modalBtns) {
            modalBtns.addEventListener('click', this.handleVoteButtonClick.bind(this));
        }

        if (dataStories) {
            dataStories.addEventListener('click', this.handleVoteButtonClick.bind(this));
        }
    }

    async handleVoteButtonClick(event) {
        const button = event.target.closest('[data-vote]');
        if (button) {
            const textId = button.getAttribute('data-vote');
            try {
                let result = await this.voteUnvote(textId, false);
                if (result.confirmationRequired) {
                    this.warningManager.createWarningModal(
                        "This vote confirms the grand winner and ends the game. Are you sure?",
                        async () => {
                            result = await this.voteUnvote(textId, true);
                            // Send a "Win!" event to the tree, shelf and modal update managers
                            eventBus.emit('chooseWinner', { textId });
                        },
                        () => {
                            // Cancelled vote (upon confirmation)
                            return;
                        }
                    );
                } else {
                    // Send a "Vote!" event to the tree, shelf and modal update managers
                    eventBus.emit('voteToggle', {  
                        data: { 
                            /* textId,  */
                            id: textId,
                            voteCount: result.voteCount, 
                            playerCountMinusOne: result.playerCountMinusOne, 
                            hasVoted: result.voted 
                        } 
                    });
                }
            } catch (error) {
                console.error('Error toggling vote:', error);
            }
        }
    }
          

    async voteUnvote(id, isConfirmed) {
        const url = `${this.path}vote/voteToggle/${id}/${isConfirmed}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Error toggling vote: ${response.status}`);
        }

        return await response.json();
    }
}

   