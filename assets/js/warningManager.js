import { SVGManager } from './svgManager.js';

export class WarningManager {
    constructor() {
      this.modalsContainer = document.createElement('div');
      this.modalsContainer.classList.add('warnings-modals-container');
    }
  
    /**
     * Create a warning modal with internationalization support
     * @param {string|object} message - i18n key or string message
     * @param {Function} onConfirm - Callback for confirmation
     * @param {Function} onCancel - Callback for cancellation
     */
    createWarningModal(message, onConfirm, onCancel) {
      document.body.appendChild(this.modalsContainer);
      
      const modal = document.createElement('div');
      modal.classList.add('warning-modal-wrapper');

      // Check if the message is HTML content
      const isHtml = typeof message === 'string' && message.includes('<');
      
      // Translate the message and the buttons
      const translatedText = isHtml ? message : window.i18n.translate(message);
      const confirmText = window.i18n.translate('warning.confirm');
      const cancelText = window.i18n.translate('warning.cancel');
      
      // Create the modal structure
      modal.innerHTML = `
        <div class="warning-modal">
          <div class="warning-content">
            <div class="warning-message" ${isHtml ? '' : `data-i18n="${message}"`}>${translatedText}</div>
            <div class="warning-buttons">
              <button class="confirm-button">
                <span class="button-svg confirm-svg">${SVGManager.checkmarkSVG}</span>
                <span data-i18n="warning.confirm">${confirmText}</span>
              </button>
              <button class="cancel-button">
                <span class="button-svg cancel-svg">${SVGManager.xSVG}</span>
                <span data-i18n="warning.cancel">${cancelText}</span>
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
