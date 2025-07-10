import { SVGManager } from './svgManager.js';

export class WarningManager {
    constructor() {
      this.modalsContainer = document.createElement('div');
      this.modalsContainer.classList.add('warnings-modals-container');
    }
  
    /**
     * Create a warning modal with internationalization support
     * @param {string|object} messageKey - i18n key or string message
     * @param {object} messageParams - Parameters for the translation (optional)
     * @param {Function} onConfirm - Callback for confirmation
     * @param {Function} onCancel - Callback for cancellation
     */
    createWarningModal(messageKey, messageParams = null, onConfirm, onCancel, confirmTextKey = "warning.confirm", cancelTextKey = "warning.cancel") {
      document.body.appendChild(this.modalsContainer);
      
      const modal = document.createElement('div');
      modal.classList.add('warning-modal-wrapper');

      // Check if the message is HTML content or already translated
      const isHtml = typeof messageKey === 'string' && messageKey.includes('<');
      const isAlreadyTranslated = typeof messageKey === 'string' && !messageKey.includes('.') && !isHtml;
      
      // Translate the message and the buttons
      const translatedText = isHtml || isAlreadyTranslated ? messageKey : window.i18n.translate(messageKey, messageParams || {});
      const confirmText = window.i18n.translate(confirmTextKey);
      const cancelText = window.i18n.translate(cancelTextKey);
      
      // Create the modal structure
      modal.innerHTML = `
        <div class="warning-modal">
          <div class="warning-content">
            <div class="warning-message" ${isHtml || isAlreadyTranslated ? '' : `data-i18n="${messageKey}"`}>${translatedText}</div>
            <div class="warning-buttons">
              <button class="confirm-button">
                <span class="button-svg confirm-svg">${SVGManager.checkmarkSVG}</span>
                <span data-i18n="${confirmTextKey}">${confirmText}</span>
              </button>
              <button class="cancel-button">
                <span class="button-svg cancel-svg">${SVGManager.xSVG}</span>
                <span data-i18n="${cancelTextKey}">${cancelText}</span>
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
