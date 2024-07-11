import { Modal } from './modal.js';
import { StoryManager } from './storyManager.js';
import { UIManager } from './uiManager.js';

document.addEventListener("DOMContentLoaded", () => {
  const path = window.location.origin + "/tag-you-write-repo/tag-you-write/";
/*   const controllerPath = window.location.origin + "/tag-you-write-repo/tag-you-write/controller/"; */
  const treeModal = document.querySelector('.modal-background');

  // Initialize Modal
  const modal = new Modal(treeModal, path);

  // Initialize StoryManager with the modal instance
  const storyManager = new StoryManager(path, modal);

  // Initialize UIManager with the storyManager and modal instances
  new UIManager(storyManager, modal);
});
