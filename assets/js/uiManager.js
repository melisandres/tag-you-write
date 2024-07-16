import { StoryManager } from './storyManager.js';
import { Modal } from './modal.js';
import { SVGManager } from './svgManager.js';

export class UIManager {
  constructor(storyManager, modal) {
    this.storyManager = storyManager;
    this.modal = modal;
    this.SVGManager = SVGManager;
    this.initSvgs();
    this.initEventListeners();
    this.stories = document.querySelector(".stories");
  }

  initSvgs(){
    const svgContainers = document.querySelectorAll('[data-svg]');
    svgContainers.forEach(element => {
/*       requestAnimationFrame(() => { */
        const svgType = element.getAttribute('data-svg');
        if(SVGManager[svgType + 'SVG']) {
          element.innerHTML = SVGManager[svgType + 'SVG'];
        } else {
          console.error(`Method ${svgType}SVG not found on SVGManager.`);
        }
      });
/*     }); */

  }

  initEventListeners() {
    /* checking for any UI changes comming from the ".stories" div */
    const storiesContainer = document.querySelector('[data-stories]');
    storiesContainer ? storiesContainer.addEventListener('click', (event) => this.handleStoriesRefresh(event)) : "";
  }

  handleStoriesRefresh(event) {
    const treeTarget = event.target.closest("[data-refresh-tree]");
    const shelfTarget = event.target.closest("[data-refresh-shelf]");
    const modalTarget = event.target.closest("[data-refresh-modal]");

    /* if modalTarget */
    if(modalTarget){
      this.handleModalRefresh(event);
      return;
    }

    /* don't continue if you clicked neither button */
    if (!treeTarget && !shelfTarget){
      return;
    }

    let container = document.querySelector('#showcase');
    const story = event.target.closest(".story");

    /* if you've opened the showcase area elsewhere, close it */
    container ? container.remove() : "";

    /* now create showcase container and append to the current story */
    story.innerHTML += '<div id="showcase"></div>';
    container = document.querySelector('#showcase');

    /* now fill it depending on the button (tree or shelf) */
    if (treeTarget) {
      const textId = treeTarget.dataset.textId;
      this.storyManager.drawTree(textId, container);
    }

    if (shelfTarget) {
      const textId = shelfTarget.dataset.textId;
      this.storyManager.drawShelf(textId, container);
    }
  }

  handleModalRefresh(event){
    const modalTarget = event.target.closest("[data-refresh-modal]");
    const textId = modalTarget.dataset.textId;
    this.storyManager.showStoryInModal(textId)
  }
}
