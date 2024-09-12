import { Modal } from './modal.js';
import { StoryManager } from './storyManager.js';
import { UIManager } from './uiManager.js';
import { VoteManager } from './voteManager.js'; 
import { GameManager } from './gameManager.js';
import { RefreshManager } from './refreshManager.js';
import { SeenManager } from './seenManager.js';
import { WarningManager } from './warningManager.js';
import { NotificationManager } from './notificationManager.js';
import { WordCountManager } from './wordcountManager.js';
import { FormManager } from './formManager.js';
import { TreeVisualizer } from './treeVisualizer.js';
import { InstaPublishManager } from './instaPublishManager.js';
import { InstaDeleteManager } from './instaDeleteManager.js';
import { ShelfVisualizer } from './shelfVisualizer.js';
import { ToastManager } from './toastManager.js';


document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.origin + "/tag-you-write-repo/tag-you-write/";
/*   const controllerPath = window.location.origin + "/tag-you-write-repo/tag-you-write/controller/"; */
  const treeModal = document.querySelector('.modal-background');

  // Initialize Modal
  const modal = new Modal(treeModal, path);

  // Initialize SeenManager
  const seenManager= new SeenManager(path);

  // TreeVisualizer is initialized sends a custom event to StoryManager when a node is clicked (to show the story in the modal)
  const treeVisualizer = new TreeVisualizer();

  // StoryManager is initialized with the modal and seenManager instances
  const storyManager = new StoryManager(path, modal, seenManager);

  // Initialize GameManager
  new GameManager(path);

  // Initialize UIManager with the storyManager and modal instances
  const uiManager = new UIManager(storyManager, modal);

  // Initialize RefreshManager
  const refreshManager = new RefreshManager(uiManager, storyManager);

  // Initialize VoteManager
  new VoteManager(path, refreshManager);

  // Restore state on initial load
  refreshManager.restoreState();
  //window.refreshManager = refreshManager;

  // Start Long Polling Manager
  new NotificationManager(path);

  // Activate word count if writing
  new WordCountManager;

  // Initialize in UIManager or globally
  // const warningManager = new WarningManager();

  //And your forms need managing (!)
  new FormManager(path);

  // Initialize InstaPublishManager and InstaDeleteManager
  new InstaPublishManager(path, storyManager, refreshManager);
  new InstaDeleteManager(path, storyManager, refreshManager);

  // Initialize ToastManager
  new ToastManager();


  // Handle browser refresh by saving state before unload
  window.addEventListener('beforeunload', () => {
      refreshManager.saveState();
  });
});