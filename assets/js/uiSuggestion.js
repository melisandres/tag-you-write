import { SVGManager } from './svgManager.js';

export class UIManager {
  constructor(storyManager, actionManagers, updateManagers) {
    this.storyManager = storyManager;
    this.actionManagers = actionManagers;
    this.updateManagers = updateManagers;
    this.currentView = this.determineCurrentView();
    this.initSvgs();
    this.initEventListeners();
  }

  determineCurrentView() {
    // Determine the current view based on the presence of certain elements
    if (document.querySelector('#main-form')) {
      return 'form';
    } else if (document.querySelector('[data-stories]')) {
      return 'index';
    } else {
      console.error('Unable to determine current view');
      return 'unknown';
    }
  }

  initSvgs() {
    const svgContainers = document.querySelectorAll('[data-svg]');
    svgContainers.forEach(element => {
      const svgType = element.getAttribute('data-svg');
      if (SVGManager[svgType + 'SVG']) {
        element.innerHTML = SVGManager[svgType + 'SVG'];
      } else {
        console.error(`Method ${svgType}SVG not found on SVGManager.`);
      }
    });
  }

  initEventListeners() {
    // Common event listeners
    this.initCommonEventListeners();

    // View-specific event listeners
    if (this.currentView === 'form') {
      this.initFormViewEventListeners();
    } else if (this.currentView === 'index') {
      this.initIndexViewEventListeners();
    }
  }

  initCommonEventListeners() {
    // Global listeners that apply to all views
    document.addEventListener('click', this.handleGlobalClick.bind(this));
  }

  initFormViewEventListeners() {
    const mainForm = document.querySelector('#main-form');
    if (mainForm) {
      mainForm.addEventListener('click', this.handleFormClick.bind(this));
    }
  }

  initIndexViewEventListeners() {
    const storiesContainer = document.querySelector('[data-stories]');
    if (storiesContainer) {
      storiesContainer.addEventListener('click', this.handleStoriesClick.bind(this));
    }

    const modalBackground = document.querySelector('.modal-background');
    if (modalBackground) {
      modalBackground.addEventListener('click', this.handleModalClick.bind(this));
    }
  }

  handleStoriesClick(event) {
    const treeTarget = event.target.closest("[data-refresh-tree]");
    const shelfTarget = event.target.closest("[data-refresh-shelf]");
    const modalTarget = event.target.closest("[data-refresh-modal]");

    if (modalTarget) {
      this.handleModalRefresh(event);
    } else if (treeTarget || shelfTarget) {
      this.handleShowcaseRefresh(event, treeTarget, shelfTarget);
    }
  }

  handleModalClick(event) {
    if (event.target.classList.contains('close-modal')) {
      this.actionManagers.modal.closeModal();
    }
  }

  handleFormClick(event) {
    const statusButton = event.target.closest('[data-status]');
    if (statusButton) {
      const status = statusButton.dataset.status;
      this.actionManagers.form.setStatusAndSubmit(status);
    }
  }

  handleGlobalClick(event) {
    const instaPublishButton = event.target.closest('[data-insta-publish-button]');
    const instaDeleteButton = event.target.closest('[data-insta-delete-button]');
    const voteButton = event.target.closest('[data-vote]');

    if (instaPublishButton) {
      const textId = instaPublishButton.dataset.textId;
      this.actionManagers.instaPublish.showPublishWarning(textId);
    } else if (instaDeleteButton) {
      const textId = instaDeleteButton.dataset.textId;
      this.actionManagers.instaDelete.showDeleteWarning(textId);
    } else if (voteButton) {
      const textId = voteButton.dataset.vote;
      this.actionManagers.vote.handleVoteButtonClick(event);
    }
  }

  handleModalRefresh(event) {
    const modalTarget = event.target.closest("[data-refresh-modal]");
    const textId = modalTarget.dataset.textId;
    this.storyManager.showStoryInModal(textId);
  }

  handleShowcaseRefresh(event, treeTarget, shelfTarget) {
    let targetType = treeTarget ? 'tree' : (shelfTarget ? 'shelf' : 'none');
    if (targetType === 'none') return;

    const story = event.target.closest(".story");
    const targetElement = treeTarget || shelfTarget;
    const textId = targetElement.dataset.textId;

    let container = document.querySelector('#showcase');
    const previousTextId = container ? container.closest(".story").dataset.textId : null;
    const previousViewType = container ? container.dataset.showcase : "none";

    if (container) container.remove();

    if (previousViewType === targetType && textId === previousTextId) return;

    story.innerHTML += '<div id="showcase"></div>';
    container = document.querySelector('#showcase');

    if (targetType === 'tree') {
      this.drawTree(textId, container);
    } else if (targetType === 'shelf') {
      this.drawShelf(textId, container);
    }
  }

  async drawTree(textId, container) {
    await this.storyManager.drawTree(textId, container);
  }

  async drawShelf(textId, container) {
    await this.storyManager.drawShelf(textId, container);
  }

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