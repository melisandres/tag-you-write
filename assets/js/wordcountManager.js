export class WordCountManager {
    constructor() {
        // Initialize properties
        this.textElement = document.querySelector('textarea[name="writing"]');
        this.parentTextElement = null;
        this.wordCountDisplayElement = null;
        this.maxWords = 50;
        // Call init to set up the manager
        this.init();
    }

    // Initialize the manager and set up event listeners
    init() {
        // If there's no text element, exit early
        if (!this.textElement ) return;

        // Assign the other elements only if textElement is present
        this.wordCountDisplayElement = document.querySelector('[data-wordCountDisplay]');
        this.parentTextElement = document.querySelector('input[name="parentWriting"]');

        // Set up event listeners only if elements exist
        if (this.textElement) {
            // TODO: this next line may be what you replace... calling it from the validation manager  
            this.textElement.addEventListener('input', () => this.updateWordCount());
            this.updateWordCount(); // Initial call to set up the initial count
        }
    }

    // Count the number of words in a given text
    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    // Update the word count and UI
    updateWordCount() {
        if(!this.textElement) return;
        const parentText = this.parentTextElement ? this.parentTextElement.value : '';
        const userText = this.textElement.value;

        const parentWordCount = this.countWords(parentText);
        const userWordCount = this.countWords(userText);

        const totalWordCount = userWordCount;
        const remainingWords = this.maxWords - (userWordCount - parentWordCount);

        // Update the display with the calculated word counts
        if (this.wordCountDisplayElement) {
            //this.wordCountDisplayElement.textContent = `Words left: ${remainingWords} (Total: ${totalWordCount} words)`;
            if(remainingWords >= 0){
                this.wordCountDisplayElement.textContent = `(add max ${remainingWords} word${remainingWords != 1 ? 's' : ''})`;
            }else{
                this.wordCountDisplayElement.textContent = `(you are ${-remainingWords} word${remainingWords != -1 ? 's' : ''} over the limit)`;
            }

            // TODO: rewrite this so that you are adding a "warning" class, which you are managing wia CSS
            // Change color to red if the word count exceeds the limit
            this.wordCountDisplayElement.style.color = remainingWords < 0 ? 'red' : 'black';
        }
    }
}