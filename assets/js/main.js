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
import { TreeUpdateManager } from './treeUpdateManager.js';
import { SSEManager } from './sseManager.js';
import { ShelfUpdateManager } from './shelfUpdateManager.js';
import { ModalUpdateManager } from './modalUpdateManager.js';
import { IndexUpdateManager } from './indexUpdateManager.js';
import { AutoSaveManager } from './autoSaveManager.js';
import { eventBus } from './eventBus.js';
import { ValidationManager } from './validationManager.js';
import { ButtonUpdateManager } from './formButtonsUpdateManager.js';
import { PaginationManager } from './paginationManager.js';
import { GameListManager } from './gameListManager.js';
import { DataManager } from './dataManager.js';
import { UpdateManager } from './updateManager.js';
import { FilterManager } from './filterManager.js';
import { PollingManager } from './pollingManager.js';
import { GameUpdateHandler } from './gameUpdateHandler.js';
import { TreeShelfModalPollingUpdateManager } from './TreeShelfModalPollingUpdateManager.js';
// Make eventBus globally available immediately
window.eventBus = eventBus;


document.addEventListener("DOMContentLoaded", async () => {

  const path = window.location.origin + "/tag-you-write-repo/tag-you-write/";
  
  // Initialize DataManager first
  window.dataManager = DataManager.getInstance(path);

  const treeModal = document.querySelector('.modal-background');
  const warningManager = new WarningManager();
  new ToastManager();

  // Initialize Modal
  const modal = new Modal(treeModal, path);

  // Initialize SeenManager
  const seenManager= new SeenManager(path);



  // TreeVisualizer is initialized sends a custom event to StoryManager when a node is clicked (to show the story in the modal)
  new TreeVisualizer();

  // StoryManager is initialized with the modal and seenManager instances
  const storyManager = new StoryManager(path, modal, seenManager);
  const paginationManager = new PaginationManager(document.querySelector('[data-stories]'), storyManager);

  // Initialize UIManager with the storyManager and modal instances
  const uiManager = new UIManager(storyManager, modal);

  // Only initialize GameListManager if we're on the games list page
  //const gamesContainer = document.querySelector('.stories');
/*   if (gamesContainer) { */
/*       const gameListManager = new GameListManager( gamesContainer,  path, uiManager); */
/*   } */

  // Initialize GameManager
  new GameManager(path);

  // Initialize RefreshManager
  const autoSaveManager = new AutoSaveManager(path);


  // Initialize RefreshManager
  if (!window.refreshManager) {
      window.refreshManager = new RefreshManager(path, uiManager, storyManager, autoSaveManager);
  } else {
      console.warn('RefreshManager already exists. Using existing instance.');
  }

   // Trigger state restoration
   console.log('Triggering state restoration'); // Add this debug log
/*    eventBus.emit('restoringState'); */
   console.log('State restoration triggered'); // Add this debug log


  // Initialize VoteManager
  new VoteManager(path, warningManager);



  // Start Long Polling Manager
  new NotificationManager(path);

  // Initialize in UIManager or globally
  // const warningManager = new WarningManager();

  //And your forms need managing (!)
  // Buttons and forms listen for validation emitions... 
  new ButtonUpdateManager(autoSaveManager);
  new FormManager(autoSaveManager, path);
  new ValidationManager();

  // Initialize InstaPublishManager and InstaDeleteManager
  new InstaPublishManager(path, warningManager);
  new InstaDeleteManager(path);

  // Initialize UpdateManagers
  new ShelfUpdateManager(path);
  new TreeUpdateManager();
  new ModalUpdateManager(path);
  new IndexUpdateManager();


   // Check for pending toasts
   const pendingToast = localStorage.getItem('pendingToast');
   if (pendingToast) {
       const { message, type } = JSON.parse(pendingToast);
       eventBus.emit('showToast', { message, type });
       localStorage.removeItem('pendingToast');
   }

  // Initialize managers independently
  console.log('Initializing managers');
  const pollingManager = new PollingManager(path);
  const updateManager = new UpdateManager(path);
  updateManager.initialize();
  
  const gameListManager = new GameListManager(path, uiManager);
  const filterManager = new FilterManager();

  // No need for separate handleInitialState

  // Handle browser refresh by saving state before unload
  window.addEventListener('beforeunload', (event) => {
      console.log('beforeunload event triggered');
      refreshManager.saveState(); /* I'm also calling this while input is happening */
      refreshManager.saveCurrentPageUrl(); /* I only want to call when refreshing the page */
      // Only show the warning if there are unsaved changes
  });

  // Initialize GameListManager
/*   const gameListManager = new GameListManager(path, uiManager); */

  
  // Start polling if we're on the right page
/*   if (document.querySelector('.stories-page')) {  // Adjust selector as needed
      console.log('Starting game list polling...');
      gameListManager.startUpdateChecker();
  } */

  // Initialize update handling
  new TreeShelfModalPollingUpdateManager();
  const gameUpdateHandler = new GameUpdateHandler();
});