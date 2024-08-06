import { ShelfVisualizer } from './shelfVisualizer.js';
import { WarningManager } from './warningManager.js';

export class VoteManager {
    constructor(path, refreshManager) {
        this.path = path;
        this.init();
        this.refreshManager = refreshManager;
        //this.warningManager = new WarningManager;
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

/*     async handleVoteButtonClick(event) {
        const button = event.target.closest('[data-vote]');
        if (button) {
            const textId = button.getAttribute('data-vote');
            try {
                let result = await this.voteUnvote(textId, false);
                //console.log("get confirmation", result)
                if (result.confirmationRequired) {
                    if (confirm("This vote will end the game. Are you sure?")) {
                        result = await this.voteUnvote(textId, true);
                        console.log("confirmed", result)
                        //this.updateVoteButton(button, result);
                        await this.refreshManager.fetchDataAndRefresh()
                    }else{
                        // cancelled vote (upon confirmation)
                        return;
                    }
                }else{
                    // confirmation not required
                    this.updateVoteButton(button, result);
                    //await this.refreshManager.fetchDataAndRefresh()
                }
            } catch (error) {
                console.error('Error toggling vote:', error);
            }
        }
    } */

    async handleVoteButtonClick(event) {
        const button = event.target.closest('[data-vote]');
        if (button) {
            const textId = button.getAttribute('data-vote');
            try {
            let result = await this.voteUnvote(textId, false);
            if (result.confirmationRequired) {
                this.warningManager = new WarningManager;
                this.warningManager.createWarningModal(
                "This vote confirms the grand winner and ends the game. Are you sure?",
                async () => {
                    result = await this.voteUnvote(textId, true);
                    await this.refreshManager.fetchDataAndRefresh();
                },
                () => {
                    // Cancelled vote (upon confirmation)
                    return;
                }
                );
            } else {
                this.updateVoteButton(button, result);
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

    updateVoteButton(button, data) {
        if (!data || typeof data.voteCount === 'undefined' || typeof data.playerCountMinusOne === 'undefined') {
            console.error('Invalid data received:', data);
            return;
        }
    
        let resultsSpan;
        if (button.closest(".node")) {
            // Case for shelf visualization
            resultsSpan = button.closest(".node").querySelector('[data-vote-count]');
        } else {
            // Case for modal visualization
            resultsSpan = button.closest(".modal-with-btns").querySelector('.vote-info .small');

            // Update the shelf view underneath if applicable
            // TODO: I may need a similar logic to handle D3 tree visualization, around votes.
            if (data.textId) {
                const shelfNode = document.querySelector(`.node[data-story-id="${data.textId}"]`);
                if (shelfNode) {
                    const shelfResultsSpan = shelfNode.querySelector('[data-vote-count]');
                    const shelfVoteButton = shelfNode.querySelector(`.vote[data-vote="${data.textId}"]`);
    
                    // Update the vote count and button appearance for the shelf view
                    shelfResultsSpan.innerHTML = `${data.voteCount} / ${data.playerCountMinusOne}`;
                    shelfResultsSpan.setAttribute('data-vote-count', data.voteCount);
    
                    if (data.voted) {
                        shelfVoteButton.classList.add('voted');
                    } else {
                        shelfVoteButton.classList.remove('voted');
                    }
                }
            }
        }
    
        const numberOfVotes = data.voteCount;
        const numberOfPlayers = data.playerCountMinusOne;
    
        if (data.voted) {
            button.classList.add('voted');
        } else {
            button.classList.remove('voted');
        }
    
        resultsSpan.innerHTML = `${numberOfVotes} / ${numberOfPlayers}`;
        resultsSpan.setAttribute('data-vote-count', numberOfVotes);
    }
    

   /*  updateVoteButton(button, data) {
        if (!data || typeof data.voteCount === 'undefined' || typeof data.playerCountMinusOne === 'undefined') {
            console.error('Invalid data received:', data);
            return;
        }

        let resultsSpan;
        if (button.closest(".node")) {
            // Case for shelf visualization
            resultsSpan = button.closest(".node").querySelector('[data-vote-count]');
        } else {
            // Case for modal visualization
            resultsSpan = button.closest(".modal-with-btns").querySelector('.vote-info .small');
        }
        const numberOfVotes = data.voteCount;
        const numberOfPlayers = data.playerCountMinusOne;

        if (data.voted == true) {
            button.classList.add('voted');
        } else {
            button.classList.remove('voted');
        }

        resultsSpan.innerHTML = `${numberOfVotes} / ${numberOfPlayers}`;
        resultsSpan.setAttribute('data-vote-count', numberOfVotes);
    } */

    
}

   