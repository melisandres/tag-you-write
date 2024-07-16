import { ShelfVisualizer } from './shelfVisualizer.js';

export class VoteManager {
    constructor(path) {
        this.path = path;
        this.init();
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
                const result = await this.voteUnvote(textId);
                console.log(result);
                this.updateVoteButton(button, result.voted);
            } catch (error) {
                console.error('Error toggling vote:', error);
            }
        }
    }

    async voteUnvote(id) {
        const url = `${this.path}vote/voteToggle/${id}`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error toggling vote: ${response.status}`);
        }
        return await response.json();
    }

    updateVoteButton(button, voted) {
        console.log(button);
        const resultsSpan = button.closest(".node").querySelector('[data-vote-count]');
        const numberOfVotes = resultsSpan.getAttribute('data-vote-count');
        const numberOfPlayers = resultsSpan.getAttribute('data-player-count');
        let newVoteCount;
      
        if (voted) {
            button.classList.add('voted');
            newVoteCount = parseInt(numberOfVotes, 10) + 1;
            //button.textContent = 'Unvote'; // Change the button text to indicate unvoting
        } else {
            button.classList.remove('voted');
            newVoteCount = parseInt(numberOfVotes, 10) - 1;
            //button.textContent = 'Vote'; // Change the button text to indicate voting
        }
    
        // Update the vote count
        resultsSpan.innerHTML = `${newVoteCount} / ${numberOfPlayers}`;
        resultsSpan.setAttribute('data-vote-count', newVoteCount);
    }
    
}
