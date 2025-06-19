import { Modal } from './modal.js';
import { StoryManager } from './storyManager.js';
import { UIManager } from './uiManager.js';
import { VoteManager } from './voteManager.js'; 
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
import { GameListUpdateManager } from './gameListUpdateManager.js';
import { AutoSaveManager } from './autoSaveManager.js';
import { eventBus } from './eventBus.js';
import { ValidationManager } from './validationManager.js';
import { ButtonUpdateManager } from './formButtonsUpdateManager.js';
import { PaginationManager } from './paginationManager.js';
import { GameSearchFilterManager } from './gameSearchFilterManager.js';
import { DataManager } from './dataManager.js';
import { UpdateManager } from './updateManager.js';
import { FilterManager } from './filterManager.js';
import { MenuManager } from './menuManager.js';
import { SearchManager } from './searchManager.js';
import { SearchHighlighter } from './searchHighlighter.js';
import { PollingManager } from './pollingManager.js';
import { GamesModifiedHandler } from './gamesModifiedHandler.js';
import { NodesModifiedHandler } from './NodesModifiedHandler.js';
import { NotificationsMenuManager } from './notificationsMenuManager.js';
import { Localization } from './localization.js';
import { TooltipManager } from './tooltipManager.js';
import { CurrentActivityManager } from './currentActivityManager.js';
import { ActivityIndicator } from './activityIndicator.js';
import { UserActivityDataManager } from './userActivityDataManager.js';
import { GhostTreeManager } from './GhostTreeManager.js';
import { GameListRenderer } from './gameListRenderer.js';
import { GameSubscriptionManager } from './gameSubscriptionManager.js';
import { TextFormGameActivityIndicator } from './textFormGameActivityIndicator.js';

// Make eventBus globally available immediately
window.eventBus = eventBus;

document.addEventListener("DOMContentLoaded", async () => {
  // Get the BASE_URL from a data attribute in your HTML
  const path = document.querySelector('[data-base-url]').dataset.baseUrl;
  window.i18n = new Localization(path);
  await window.i18n.init(); // It's async, so we need to call it here

  // Initialize DataManager first
  window.dataManager = DataManager.getInstance();

  const treeModal = document.querySelector('.modal-background');
  const warningManager = new WarningManager();
  window.warningManager = warningManager; // Make warningManager globally available
  new ToastManager();

  // Initialize Modal
  const modal = new Modal(treeModal);

  // Initialize SeenManager
  const seenManager= new SeenManager();


  // TreeVisualizer is initialized sends a custom event to StoryManager when a node is clicked (to show the story in the modal)
  const treeVisualizer = new TreeVisualizer();

  // StoryManager is initialized with the modal and seenManager instances
  const storyManager = new StoryManager(modal, seenManager);
  const paginationManager = new PaginationManager(document.querySelector('[data-stories]'), storyManager);

  // Initialize UIManager with the storyManager and modal instances
  const uiManager = new UIManager(storyManager, modal);

  // Initialize NotificationsMenuManager and make it globally available
  window.notificationsMenuManager = new NotificationsMenuManager();

  // Only initialize GameListManager if we're on the games list page
  //const gamesContainer = document.querySelector('.stories');
/*   if (gamesContainer) { */
/*       const gameListManager = new GameListManager( gamesContainer, uiManager); */
/*   } */

  // Initialize RefreshManager
  const autoSaveManager = new AutoSaveManager();


  // Initialize RefreshManager
  if (!window.refreshManager) {
      window.refreshManager = new RefreshManager(uiManager, storyManager, autoSaveManager);
  } else {
      console.warn('RefreshManager already exists. Using existing instance.');
  }

   // Trigger state restoration
   console.log('Triggering state restoration'); // Add this debug log
/*    eventBus.emit('restoringState'); */
   console.log('State restoration triggered'); // Add this debug log


  // Initialize VoteManager
  new VoteManager(warningManager);



  // Start Long Polling Manager
  window.notificationManager = new NotificationManager();

  // Initialize in UIManager or globally
  // const warningManager = new WarningManager();

  //And your forms need managing (!)
  // Buttons and forms listen for validation emitions... 
  new ButtonUpdateManager(autoSaveManager);
  new FormManager(autoSaveManager);
  new ValidationManager();

  // Initialize InstaPublishManager and InstaDeleteManager
  new InstaPublishManager(warningManager);
  new InstaDeleteManager(warningManager);

  // Initialize UpdateManagers
  new ShelfUpdateManager();
  window.treeUpdateManagerInstance = new TreeUpdateManager(treeVisualizer);
  new ModalUpdateManager();
  window.gameListUpdateManager = new GameListUpdateManager();

    // Initialize TooltipManager
    new TooltipManager();


   // Check for pending toasts
   const pendingToast = localStorage.getItem('pendingToast');
   if (pendingToast) {
       const { message, type } = JSON.parse(pendingToast);
       eventBus.emit('showToast', { message, type });
       localStorage.removeItem('pendingToast');
   }

  // Initialize GameSubscriptionManager FIRST (before SSE/UpdateManager need it)
  window.gameSubscriptionManager = new GameSubscriptionManager();

  // Initialize managers independently
  console.log('Initializing managers');
  const pollingManager = new PollingManager();
  const sseManager = new SSEManager();
  console.log('SSEManager instance created:', sseManager);
  const updateManager = new UpdateManager();
  updateManager.initialize();
  
  window.menuManager = new MenuManager();

  const gameSearchFilterManager = new GameSearchFilterManager(uiManager);
  const filterManager = new FilterManager();
  window.searchHighlighter = new SearchHighlighter();
  const searchManager = new SearchManager();

  // Initialize CurrentActivityManager
  window.currentActivityManager = new CurrentActivityManager();

              // Initialize UserActivityDataManager (User-centric activity tracking)
  window.userActivityDataManager = new UserActivityDataManager();

  // Initialize GhostTreeManager
  window.ghostTreeManager = new GhostTreeManager();

  // Initialize ActivityIndicator
  window.activityIndicator = new ActivityIndicator();
  
  // Initialize TextFormGameActivityIndicator (only on text form pages)
  window.textFormGameActivityIndicator = new TextFormGameActivityIndicator();

  // No need for separate handleInitialState

  // Handle browser refresh by saving state before unload
  window.addEventListener('beforeunload', (event) => {
      console.log('beforeunload event triggered');
      refreshManager.saveState(); /* I'm also calling this while input is happening */
      refreshManager.saveCurrentPageUrl(); /* I only want to call when refreshing the page */
      // Only show the warning if there are unsaved changes
  });

  // Initialize GameListManager
/*   const gameListManager = new GameListManager(uiManager); */

  
  // Start polling if we're on the right page
/*   if (document.querySelector('.stories-page')) {  // Adjust selector as needed
      console.log('Starting game list polling...');
      gameListManager.startUpdateChecker();
  } */

  // Initialize update handling
  new NodesModifiedHandler();
  const gamesModifiedHandler = new GamesModifiedHandler();

});