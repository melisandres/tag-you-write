export class GameManager {
    constructor(path) {
      this.path = path;
    }

    async startGame() {
        const url = `${this.path}game/start`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Error fetching tree data: ${response.status}`);
        }
        return await response.json();
    }

    initGame () {

    }

    startGame () {

    }

    checkVotes () {

    }

    addPlayer () {

    }

}