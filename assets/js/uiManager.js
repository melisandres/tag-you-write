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

    let wrapper = document.querySelector('#showcase-wrapper');
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
    wrapper ? previousTextId = wrapper.closest(".story").dataset.textId : "";

    // Grab the type of view now onscreen
    let previousViewType = "none";
    wrapper ? previousViewType = wrapper.dataset.showcase : "";   

    // If you've opened the showcase area elsewhere, close it
    wrapper ? wrapper.remove() : "";

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

    // now create showcase wrapper and container, append to the current story
    story.innerHTML += '<div id="showcase-wrapper"><div id="showcase"></div></div>';
    wrapper = document.querySelector('#showcase-wrapper');
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
    // Create tabs before drawing content
    this.createShowcaseTabs(textId, container, 'tree');
    await this.storyManager.drawTree(textId, container);
  }

  // Call drawShelf from the storyManager
  async drawShelf(textId, container) {
    // Create tabs before drawing content
    this.createShowcaseTabs(textId, container, 'shelf');
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

  // New method to create showcase tabs
  createShowcaseTabs(textId, container, activeType) {
    const wrapper = this.getShowcaseWrapper(container);
    if (!wrapper) return;
    
    const tabsContainer = this.ensureTabsContainer(wrapper, textId, container);
    this.updateActiveTab(tabsContainer, activeType);
    wrapper.dataset.showcase = activeType;
  }

  // Helper: Get and validate wrapper
  getShowcaseWrapper(container) {
    const wrapper = container.parentElement;
    if (!wrapper || wrapper.id !== 'showcase-wrapper') {
      console.error('Showcase wrapper not found');
      return null;
    }
    return wrapper;
  }

  // Helper: Ensure tabs container exists
  ensureTabsContainer(wrapper, textId, showcaseContainer) {
    let tabsContainer = wrapper.querySelector('.showcase-tabs');
    
    if (!tabsContainer) {
      tabsContainer = this.createTabsContainer(textId);
      wrapper.insertBefore(tabsContainer, showcaseContainer);
    }
    
    return tabsContainer;
  }

  // Helper: Create the actual tabs container with tabs
  createTabsContainer(textId) {
    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'showcase-tabs';
    
    const showcaseTypes = [
      { type: 'tree', svg: this.SVGManager.treeSVG, labelKey: 'general.showcase_tree_tab' },
      { type: 'shelf', svg: this.SVGManager.shelfSVG, labelKey: 'general.showcase_shelf_tab' }
    ];
    
    showcaseTypes.forEach(({ type, svg, labelKey }) => {
      const tab = this.createTab(type, textId, svg, labelKey);
      tabsContainer.appendChild(tab);
    });
    
    return tabsContainer;
  }

  // Helper: Create individual tab
  createTab(type, textId, svg, labelKey) {
    const tab = document.createElement('button');
    tab.className = 'showcase-tab';
    tab.dataset.showcaseType = type;
    tab.dataset.textId = textId;
    
    // Better internationalization - let the i18n system handle updates
    const fallbackLabel = type.charAt(0).toUpperCase() + type.slice(1);
    tab.innerHTML = `${svg} <span data-i18n="${labelKey}">${window.i18n?.translate(labelKey) || fallbackLabel}</span>`;
    
    // Use event delegation instead of direct listeners
    tab.addEventListener('click', (e) => this.handleTabClick(e));
    
    return tab;
  }

  // Helper: Update active tab state
  updateActiveTab(tabsContainer, activeType) {
    const tabs = tabsContainer.querySelectorAll('.showcase-tab');
    tabs.forEach(tab => {
      tab.classList.toggle('active', tab.dataset.showcaseType === activeType);
    });
  }

  // Handle tab clicks
  handleTabClick(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const tab = event.currentTarget;
    const showcaseType = tab.dataset.showcaseType;
    const textId = tab.dataset.textId;
    const container = document.querySelector('#showcase');
    
    // Don't do anything if clicking the already active tab
    if (tab.classList.contains('active')) {
      return;
    }
    
    // Clear only the showcase content (tabs are in wrapper, so they'll remain)
    container.innerHTML = '';
    
    // Draw the new content type
    if (showcaseType === 'tree') {
      this.drawTree(textId, container);
    } else if (showcaseType === 'shelf') {
      this.drawShelf(textId, container);
    }
    
    // Emit showcase type changed event
    eventBus.emit('showcaseTypeChanged', {
      type: showcaseType,
      rootStoryId: textId
    });
  }

  // To be accessed while doing automatic refreshes
  createShowcaseContainer(rootStoryId, clearExisting = true) {
    let wrapper = document.querySelector('#showcase-wrapper');
    let container = document.querySelector('#showcase');
    const story = document.querySelector(`.story[data-text-id="${rootStoryId}"]`);

    if (wrapper && clearExisting) {
      wrapper.remove();
      this.dataManager.setCurrentViewedRootStoryId(null);
      eventBus.emit('showcaseChanged', null);
    }

    if (story && !wrapper) {
      story.innerHTML += '<div id="showcase-wrapper"><div id="showcase"></div></div>';
      wrapper = document.querySelector('#showcase-wrapper');
      container = document.querySelector('#showcase');
      
      // Set current root story ID when creating new showcase
      this.dataManager.setCurrentViewedRootStoryId(rootStoryId);
      
      const { type } = this.showcaseManager.getShowcaseParams();
      const showcaseType = type || 'tree'; // Default to tree if no type specified
      
      // Create tabs for the showcase
      this.createShowcaseTabs(rootStoryId, container, showcaseType);
      
      eventBus.emit('showcaseChanged', rootStoryId);
    } else if (wrapper && !clearExisting) {
      // Wrapper exists and we're not clearing - just ensure the rootStoryId is set
      this.dataManager.setCurrentViewedRootStoryId(rootStoryId);
      
      const { type } = this.showcaseManager.getShowcaseParams();
      if (type) {
          // Update existing tabs if they exist
          const existingTabs = wrapper.querySelector('.showcase-tabs');
          if (existingTabs) {
            this.createShowcaseTabs(rootStoryId, container, type);
          }
      }
    }

    return container;
  }
}
