import { SVGManager } from './svgManager.js';
import { ShowcaseManager } from './showcaseManager.js';

export class UIManager {
  constructor(storyManager, modal) {
    this.storyManager = storyManager;
    this.modal = modal;
    this.SVGManager = SVGManager;
    this.showcaseManager = new ShowcaseManager();
    this.initSvgs();
    this.initEventListeners();
    this.stories = document.querySelector(".stories");
    this.oneStory = document.querySelector('[data-one-story]');
    if (!this.stories && this.oneStory){
      this.stories = this.oneStory;
    }
    this.dataManager = window.dataManager;

    // Listen for events from ShowcaseManager
    eventBus.on('createShowcaseContainer', ({ rootStoryId, showcaseType }) => {
      const container = this.createShowcaseContainer(rootStoryId);
      if (showcaseType === 'tree') {
        this.drawTree(rootStoryId, container);
      } else if (showcaseType === 'shelf') {
        this.drawShelf(rootStoryId, container);
      }
    });

    eventBus.on('showStoryInModal', (textId) => {
      this.storyManager.showStoryInModal(textId);
    });
  }

  initSvgs(){
    const svgContainers = document.querySelectorAll('[data-svg]');
    this.populateSvgs(svgContainers);
  }

  // Helper method to populate SVGs for a collection of elements
  populateSvgs(elements) {
    elements.forEach(element => {
        const svgType = element.getAttribute('data-svg');
        if(SVGManager[svgType + 'SVG']) {
          element.innerHTML = SVGManager[svgType + 'SVG'];
        } else {
          console.error(`Method ${svgType}SVG not found on SVGManager.`);
        }
      });
  }

  // Helper method to populate SVGs for a specific container (useful after dynamic rendering)
  populateSvgsInContainer(container) {
    const svgContainers = container.querySelectorAll('[data-svg]');
    this.populateSvgs(svgContainers);
  }

  initEventListeners() {
    // Checking for any UI changes comming from the ".stories" div 
    const storiesContainer = document.querySelector('[data-stories]');
    const oneStoryContainer = document.querySelector('[data-one-story]');

    storiesContainer ? storiesContainer.addEventListener('click', (event) => this.handleStoriesRefresh(event)) : "";
    oneStoryContainer ? oneStoryContainer.addEventListener('click', (event) => this.handleStoriesRefresh(event)) : "";
  }

  handleStoriesRefresh(event) {
    const treeTarget = event.target.closest("[data-refresh-tree]");
    const shelfTarget = event.target.closest("[data-refresh-shelf]");
    const storyTitleTarget = event.target.closest(".story-title");
    const promptTitleTarget = event.target.closest(".story-writing");

    // A variable to hold keyword shelf if shelfTarget, modal if modalTarget, and tree if treeTarget
    let targetType;

    if (shelfTarget) {
        targetType = 'shelf';
    } else if (storyTitleTarget || promptTitleTarget) {
        targetType = 'default';
    } else if (treeTarget) {
        targetType = 'tree';
    } else {
        targetType = 'none';  // Or any other default value
    }

    // Don't continue if you clicked neither button
    if (targetType === 'none'){
      return;
    }

    let container = document.querySelector('#showcase');
    const story = event.target.closest(".story");

    // Grab the textId from the button clicked, story title, or prompt title
    let textId;
    if (targetType === 'default') {
      if (storyTitleTarget) {
        textId = storyTitleTarget.dataset.textId || story.dataset.textId;
      } else if (promptTitleTarget) {
        textId = story.dataset.textId;
      }
    } else {
      const targetElement = { tree: treeTarget, shelf: shelfTarget }[targetType];
      textId = targetElement ? targetElement.dataset.textId : null;
    }

    // Grab the textId from the showcase on screen, if there is one
    let previousTextId = null;
    container ? previousTextId = container.closest(".story").dataset.textId : "";

    // Grab the type of view now onscreen
    let previousViewType = "none";
    container ? previousViewType = container.dataset.showcase : "";   

    // If you've opened the showcase area elsewhere, close it
    container ? container.remove() : "";

    // check if the action to toggle off the view, or to get a new view
    if (
      // Close if clicking the same view type on the same story
      (previousViewType === targetType && textId === previousTextId) ||
      // Close if clicking default when any showcase is already open for this story
      (targetType === 'default' && previousTextId === textId && previousViewType !== 'none')
    ) {
      story.classList.remove('story-has-showcase');
      // Clear the current root story ID when closing showcase
      this.dataManager.setCurrentViewedRootStoryId(null);
      eventBus.emit('showcaseChanged', null);
      return;
    }

    // Set the new root story ID before creating showcase
    this.dataManager.setCurrentViewedRootStoryId(textId);

    // Emit both the showcase change and type
    //TODO: can I delete this?
    //eventBus.emit('showcaseChanged', textId);
    if (targetType !== 'none') {
      console.log('emitting showcaseTypeChanged');
      console.log('targetType:', targetType);
      console.log('textId:', textId);

        eventBus.emit('showcaseTypeChanged', {
            type: targetType,
            rootStoryId: textId
        });
    }

    // now create showcase container and append to the current story
    story.innerHTML += '<div id="showcase"></div>';
    container = document.querySelector('#showcase');

    // now fill it depending on the button (tree or shelf)
    if (targetType == 'tree') {
      //const textId = treeTarget.dataset.textId;
      this.drawTree(textId, container);
    }

    if (targetType == 'shelf') {
      //const textId = shelfTarget.dataset.textId;
      this.drawShelf(textId, container);
    } 
    if (storyTitleTarget || promptTitleTarget) {
      // for now, just draw the tree
      this.handleDefaultRefresh(textId, container);
    }

  }

  // Call drawTree from the storyManager
  async drawTree(textId, container) {
    await this.storyManager.drawTree(textId, container);
  }

  // Call drawShelf from the storyManager
  async drawShelf(textId, container) {
    await this.storyManager.drawShelf(textId, container);
    
    // TODO: make sure this is good Restore drawers if available in state
    const savedState = JSON.parse(localStorage.getItem('pageState'));
    if (savedState?.showcase?.drawers?.length > 0) {
        window.refreshManagerInstance.restoreDrawers(savedState);
    }
  }

  // TODO: when clicking on the title... we could open the game, and give an option to view as tree or shelf... OR... as I'm doing here, just draw the tree
  handleDefaultRefresh(textId, container){
    this.drawTree(textId, container);
  }

  // To be accessed while doing automatic refreshes
  createShowcaseContainer(rootStoryId, clearExisting = true) {
    let container = document.querySelector('#showcase');
    const story = document.querySelector(`.story[data-text-id="${rootStoryId}"]`);

    if (container && clearExisting) {
      container.remove();
      this.dataManager.setCurrentViewedRootStoryId(null);
      eventBus.emit('showcaseChanged', null);
    }

    if (story && !container) {
      story.innerHTML += '<div id="showcase"></div>';
      container = document.querySelector('#showcase');
      
      // Set current root story ID when creating new showcase
      this.dataManager.setCurrentViewedRootStoryId(rootStoryId);
      
      const { type } = this.showcaseManager.getShowcaseParams();
      if (type) {
          container.dataset.showcase = type;
      }
      
      eventBus.emit('showcaseChanged', rootStoryId);
    } else if (container && !clearExisting) {
      // Container exists and we're not clearing - just ensure the rootStoryId is set
      this.dataManager.setCurrentViewedRootStoryId(rootStoryId);
      
      const { type } = this.showcaseManager.getShowcaseParams();
      if (type) {
          container.dataset.showcase = type;
      }
    }

    return container;
  }
}
