export class WarningManager {
    constructor() {
      this.modalsContainer = document.createElement('div');
      this.modalsContainer.classList.add('warnings-modals-container');
    }
  
    createWarningModal(message, onConfirm, onCancel) {
      document.body.appendChild(this.modalsContainer);
      
      const modal = document.createElement('div');
      modal.classList.add('warning-modal');
      modal.innerHTML = `
        <div class="warning-content">
          <p>${message}</p>
          <button class="confirm-button">Confirm</button>
          <button class="cancel-button">Cancel</button>
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
  