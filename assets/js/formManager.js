import { SVGManager } from './svgManager.js';
import { WarningManager } from './warningManager.js';

export class FormManager {
    constructor(path) {
        this.path = path;
        this.form = document.querySelector('#main-form');
        this.statusField = this.form ? this.form.querySelector('[data-text-status]') : null;
        this.buttons = this.form ? this.form.querySelectorAll('[data-status]') : null;

        this.init();
    }

    // Initialize form functionality
    init() {
        this.addButtonEventListeners();
        this.injectSVGIcons();
    }

    // Add button event listeners
    addButtonEventListeners() {
        if (!this.form || !this.buttons) return; 

        this.buttons.forEach(element => {
            const myStatus = element.dataset.status;
            element.addEventListener('click', () => this.setStatusAndSubmit(myStatus));
        });
    }

    // Method to set the status and submit the form
    setStatusAndSubmit(status) {
        if (!this.form || !this.statusField) return;  

        switch(status) {
            case 'published':
                this.showPublishWarning();
                break;
            case 'draft':
                this.statusField.value = status;
                this.form.submit();
                break;
            case 'delete': 
            this.showDeleteWarning();
                break;
            case 'cancel':
                window.location.href=`${this.path}text`;
                break;
            default:
                console.log("button has not been given a purpose!");
          }
    }

    showPublishWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "Are you sure you want to publish this text? This action cannot be undone.",
            () => {
                this.statusField.value = 'published';
                this.form.submit();
            },
            () => console.log("Publish cancelled")
        );
    }

    showDeleteWarning() {
        const warningManager = new WarningManager();
        warningManager.createWarningModal(
            "Are you sure you want to delete this text? This action cannot be undone.",
            () => this.submitDelete(`${this.path}text/delete`),
            () => console.log("Delete cancelled")
        );
    }

    // Method to handle form deletion
    // I think this is because the delete is handled by a different form, so we need to set the action to the delete endpoint--this is in order to have the form buttons all coexist in one div. I think.
    submitDelete(deleteUrl) {
        this.form.action = deleteUrl;  // Set the action to the delete endpoint
        this.form.submit();  // Submit the form
    }

    // Method to inject SVGs into form buttons
    injectSVGIcons() {
        if (!this.form) return;

        const publishBtn = this.form.querySelector('.publish .icon');
        const saveBtn = this.form.querySelector('.save .icon');
        const deleteBtn = this.form.querySelector('.delete .icon');
        const cancelBtn = this.form.querySelector('.cancel .icon');

        if (publishBtn) publishBtn.innerHTML = SVGManager.publishSVG;
        if (saveBtn) saveBtn.innerHTML = SVGManager.saveSVG;
        if (deleteBtn) deleteBtn.innerHTML = SVGManager.deleteSVG;
        if (cancelBtn) cancelBtn.innerHTML = SVGManager.cancelSVG;
    }
}
