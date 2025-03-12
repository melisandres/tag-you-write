import { SVGManager } from '../svgManager.js';
export class HomePageManager {
    constructor() {
        this.page = document.querySelector('.home-container');
        if (!this.page) {
            return;
        }
        this.setBackgroundSVG();

    }

    setBackgroundSVG() {
/*         const backgroundSVG = document.querySelector('.background-svg');
        backgroundSVG.innerHTML = SVGManager.heartSVG; */
    }
}