export class SSEManager {
    constructor(path) {
        this.path = path;
        this.lastId = 0;
        this.initPolling();
    }

    initPolling() {
        console.log("Initializing polling...");
        this.pollForUpdates();
    }

    pollForUpdates() {
        console.log("Polling for updates...");
        fetch(`${this.path}sse/stream?lastId=${this.lastId}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.text();
            })
            .then(text => {
                console.log("Received response:", text);
                const events = text.split('\n\n');
                events.forEach(event => {
                    if (event.startsWith('event: newGame')) {
                        const dataLine = event.split('\n')[1];
                        if (dataLine && dataLine.startsWith('data: ')) {
                            const data = JSON.parse(dataLine.substring(6));
                            console.log("New game received!", data);
                            // Handle the new game data here
                        }
                    } else if (event.startsWith('id:')) {
                        this.lastId = parseInt(event.substring(3).trim());
                    }
                });
            })
            .catch(error => console.error('Polling error:', error))
            .finally(() => {
                // Poll again after a short delay
                setTimeout(() => this.pollForUpdates(), 5000);
            });
    }
}