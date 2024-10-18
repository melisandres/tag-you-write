import { SVGManager } from './svgManager.js';

export class WarningManager {
    constructor() {
      this.modalsContainer = document.createElement('div');
      this.modalsContainer.classList.add('warnings-modals-container');
    }
  
    createWarningModal(message, onConfirm, onCancel) {
      document.body.appendChild(this.modalsContainer);
      
      const modal = document.createElement('div');
      modal.classList.add('warning-modal-wrapper');
      modal.innerHTML = `
        <div class="warning-modal">
          <div class="warning-content">
            <p>${message}</p>
            <div class="warning-buttons">
              <button class="confirm-button">
                <span class="button-svg confirm-svg">${SVGManager.checkmarkSVG}</span>
                Confirm
              </button>
              <button class="cancel-button">
                <span class="button-svg cancel-svg">${SVGManager.xSVG}</span>
                Cancel
              </button>
            </div>
          </div>
        </div>
      `;
  
      modal.querySelector('.confirm-button').addEventListener('click', () => {
        onConfirm();
        this.closeModal(modal);
      });
  
      modal.querySelector('.cancel-button').addEventListener('click', () => {
        onCancel();
        this.closeModal(modal);
      });
  
      this.modalsContainer.appendChild(modal);
    }
  
    closeModal(modal) {
      modal.remove();
      this.modalsContainer.remove();
    }
  }
