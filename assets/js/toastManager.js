import { eventBus } from './eventBus.js';

export class ToastManager {
    constructor() {
        this.container = this.createContainer();
        this.initEventListener();
    }
    
    // create a container for the toast
    createContainer() {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    initEventListener() {
        eventBus.on('showToast', ({ message, type }) => {
            this.show(message, type);
        });
    }

    // show a toast
    show(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        this.container.appendChild(toast);

        // Trigger reflow to enable transition
        toast.offsetHeight;

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                this.container.removeChild(toast);
            }, { once: true });
        }, 3000);
    }
}