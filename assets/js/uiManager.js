/* import { StoryManager } from './storyManager.js';
import { Modal } from './modal.js';  */
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
        const svgType = element.getAttribute('data-svg');
        if(SVGManager[svgType + 'SVG']) {
          element.innerHTML = SVGManager[svgType + 'SVG'];
        } else {
          console.error(`Method ${svgType}SVG not found on SVGManager.`);
        }
      });
  }

  initEventListeners() {
    // checking for any UI changes comming from the ".stories" div 
    const storiesContainer = document.querySelector('[data-stories]');
    storiesContainer ? storiesContainer.addEventListener('click', (event) => this.handleStoriesRefresh(event)) : "";
  }

  handleStoriesRefresh(event) {
    const treeTarget = event.target.closest("[data-refresh-tree]");
    const shelfTarget = event.target.closest("[data-refresh-shelf]");
    const modalTarget = event.target.closest("[data-refresh-modal]");

    // a variable to hold keyword shelf if shelfTarget, modal if modalTarget, and tree if treeTarget
    let targetType;

    if (shelfTarget) {
        targetType = 'shelf';
    } else if (modalTarget) {
        targetType = 'modal';
    } else if (treeTarget) {
        targetType = 'tree';
    } else {
        targetType = 'none';  // Or any other default value
    }


    // if modalTarget
    if(modalTarget){
      this.handleModalRefresh(event);
      return;
    }

    // don't continue if you clicked neither button
    if (targetType === 'none'){
      return;
    }

    let container = document.querySelector('#showcase');
    const story = event.target.closest(".story");

    // grab the textId from the button clicked
    const targetElement = { tree: treeTarget, shelf: shelfTarget, modal: modalTarget }[targetType];
    const textId = targetElement ? targetElement.dataset.textId : null;

    // grab the textId from the showcase on screen, if there is one
    let previousTextId = null;
    container ? previousTextId = container.closest(".story").dataset.textId : "";

    // grab the type of view now onscreen
    let previousViewType = "none";
    container ? previousViewType = container.dataset.showcase : "";   

    // if you've opened the showcase area elsewhere, close it
    container ? container.remove() : "";

    // is this action to toggle off the view, or to get a new view
    if(previousViewType == targetType && textId == previousTextId){
      return;
    }

    // now create showcase container and append to the current story
    story.innerHTML += '<div id="showcase"></div>';
    container = document.querySelector('#showcase');

    // now fill it depending on the button (tree or shelf)
    if (treeTarget) {
      //const textId = treeTarget.dataset.textId;
      this.drawTree(textId, container);
    }

    if (shelfTarget) {
      //const textId = shelfTarget.dataset.textId;
      this.drawShelf(textId, container);
    }
  }

  // Call drawTree from the storyManager
  async drawTree(textId, container) {
    await this.storyManager.drawTree(textId, container);
  }

  // Call drawShelf from the storyManager
  async drawShelf(textId, container) {
    await this.storyManager.drawShelf(textId, container);
  }

  // Handle the showing of the story modal 
  // by getting the id via the click event
  handleModalRefresh(event){
    console.log('handleModalRefresh called');
    const modalTarget = event.target.closest("[data-refresh-modal]");
    const textId = modalTarget.dataset.textId;
    this.storyManager.showStoryInModal(textId);
  }

    // Handle the showing of the story modal
    // by being send the id directly. 
/*     drawTreeModal(textId){
      this.storyManager.showStoryInModal(textId)
    }
 */

  // To be accessed while doing automatic refreshes
  createShowcaseContainer(storyId) {
    let container = document.querySelector('#showcase');
    const story = document.querySelector(`[data-text-id="${storyId}"]`);

    if (container) {
      container.remove();
    }

    if (story) {
      story.innerHTML += '<div id="showcase"></div>';
      container = document.querySelector('#showcase');
    }

    return container;
  }
}
