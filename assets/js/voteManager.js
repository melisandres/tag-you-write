import { ShelfVisualizer } from './shelfVisualizer.js';

export class VoteManager {
    constructor(path, refreshManager) {
        this.path = path;
        this.init();
        this.refreshManager = refreshManager;
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
                console.log("get confirmation", result)
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

        const resultsSpan = button.closest(".node").querySelector('[data-vote-count]');
        const numberOfVotes = data.voteCount;
        const numberOfPlayers = data.playerCountMinusOne;

        if (data.voted == true) {
            button.classList.add('voted');
        } else {
            button.classList.remove('voted');
        }

        resultsSpan.innerHTML = `${numberOfVotes} / ${numberOfPlayers}`;
        resultsSpan.setAttribute('data-vote-count', numberOfVotes);
    }
}

   