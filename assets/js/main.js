import { Modal } from './modal.js';
import { StoryManager } from './storyManager.js';
import { UIManager } from './uiManager.js';
import { VoteManager } from './voteManager.js'; 
import { GameManager } from './gameManager.js';
import { RefreshManager } from './refreshManager.js';
import { SeenManager } from './seenManager.js';

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.origin + "/tag-you-write-repo/tag-you-write/";
/*   const controllerPath = window.location.origin + "/tag-you-write-repo/tag-you-write/controller/"; */
  const treeModal = document.querySelector('.modal-background');

  // Initialize Modal
  const modal = new Modal(treeModal, path);

  // Initialize StoryManager with the modal instance
  const storyManager = new StoryManager(path, modal);

  // Initialize UIManager with the storyManager and modal instances
  const uiManager = new UIManager(storyManager, modal);

  // Initialize GameManager
  new GameManager(path);

  // Initialize SeenManager
  new SeenManager(path);

  // Initialize RefreshManager
  const refreshManager = new RefreshManager(uiManager);

  // Initialize VoteManager
  new VoteManager(path, refreshManager);

  // Restore state on initial load
  refreshManager.restoreState();
  window.refreshManager = refreshManager;

  // Handle browser refresh by saving state before unload
  window.addEventListener('beforeunload', () => {
      refreshManager.saveState();
  });
});
