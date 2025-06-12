import { SVGManager } from './svgManager.js';
import { SeenManager } from './seenManager.js';
import { createColorScale } from './createColorScale.js'; // Import the utility function
import { eventBus } from './eventBus.js';

export class ShelfVisualizer {
  constructor(container) {
    this.container = container;
    this.SeenManager = new SeenManager();
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('newNodesDiscovered', this.handleNewNodes.bind(this));
  }

  handleNewNodes(nodes) {
    nodes.forEach(node => {
      this.handleNewNode(node);
    });
  }

  handleNewNode(newNode) {
    console.log("newNodeDiscovered", newNode);
    const parentElement = this.container.querySelector(`li[data-story-id="${newNode.parent_id}"]`);
    if (!parentElement) return;

    const parentDepth = parseInt(parentElement.style.getPropertyValue('--node-depth'));
    const newNodeDepth = parentDepth + 1;

    // Find or create the ordered list for children
    let childrenOl = parentElement.querySelector(':scope > ol');
    if (!childrenOl) {
        childrenOl = document.createElement('ol');
        parentElement.appendChild(childrenOl);
    }

    // Create the new node HTML
    const newNodeHtml = this.drawSingleNode(newNode, newNodeDepth);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = newNodeHtml;
    const newNodeElement = tempDiv.firstElementChild;

    // Append the new node to the children's list
    childrenOl.appendChild(newNodeElement);

    // Get the actually inserted element from the DOM
    const insertedNode = childrenOl.querySelector(`li[data-story-id="${newNode.id}"]`);
    
    // Apply search highlighting if there's an active search
    const searchTerm = window.dataManager?.getSearch();
    if (searchTerm && insertedNode) {
        // Trigger the search highlighting for this specific node
        eventBus.emit('shelfDrawComplete', insertedNode);
    }

    // Re-apply event listeners and colors
    this.addEventListeners();
    this.applySVGColors(insertedNode);
  }

  drawShelf(data) {
    // Clear any existing content
    this.container.innerHTML = '';
    this.container.classList.add("with-shelf");
    this.container.dataset.showcase = 'shelf';

    // Remove the class .story-has-showcase
    const previousStory = document.querySelector('.story-has-showcase')
    if(previousStory){
      previousStory.classList.remove('story-has-showcase');
    }

    // Add the class .story-has-showcase
    const storyElement = this.container.closest('.story');
    if (storyElement) {
      storyElement.classList.add('story-has-showcase');
    }

    this.container.innerHTML += `<ol>${this.drawDrawer(data, 0)}</ol>`;
    this.addEventListeners();
    this.applySVGColors(this.container);

    // Emit event after shelf is fully drawn. This is used to highlight search matches.
    eventBus.emit('shelfDrawComplete', this.container);
  }

  drawDrawer(node, depth) {
    let drawerHTML = this.drawSingleNode(node, depth);

    if (node.children && node.children.length > 0) {
      drawerHTML += '<ol>';
      node.children.forEach(child => {
        drawerHTML += this.drawDrawer(child, depth + 1);
      });
      drawerHTML += '</ol>';
    }

    drawerHTML += '</li>';
    return drawerHTML;
  }

  drawSingleNode(node, depth) {
    const isWinner = node.isWinner ? "isWinner" : "";
    const unread = node.text_seen !== "1" ? "unread" : "";
    const note = node.note ? `<div class="note"><p>P.S... </p>${node.note}</div>` : '';
    const noteDate = node.note_date ?  `<span class="date"> ${node.note_date}</span>` : '';

    const untitledText = window.i18n ? window.i18n.translate("general.untitled") : "Untitled";

    return `
      <li class="node ${node.text_status === "published" ? "published" : "draft"}" data-story-id="${node.id}" style="--node-depth: ${depth}">
        <div class="node-headline ${isWinner}">
          <div class="arrow closed arrow-right"></div>
          <div class="shelf-heart ${unread}"> ${this.getNumberOfVotes(node)}</div>
          <div class="headline-content">
            <h2 class="title" ${node.title == "" ? "data-i18n='general.untitled'" : ""}>
              ${node.title || untitledText}
            </h2>
            <p class="author">
              <span class="activity-dot"></span>
              ${this.getAuthor(node)}
              <span class="activity-text">(adding a note)</span>
            </p>
          </div>
          <span class="status">${(this.getStatus(node) || '')}</span>
        </div>
        <div class="writing hidden ${isWinner}">
          <div class="node-buttons">
            ${node.permissions.canIterate ? this.getIterateForm(node) : ''}
            ${node.permissions.canEdit ? this.getEditForm(node) : ''}
            ${node.permissions.canAddNote ? this.getNoteForm(node) : ''}
            ${node.permissions.canVote ? this.getVoteButton(node) : ''}
            ${node.permissions.canPublish ? this.getPublishForm(node) : ''}
            ${node.permissions.canDelete ? this.getDeleteForm(node) : ''}
          </div>
          <p>
            ${node.writing}
          </p>
          <span class="date"> ${node.date}</span>
          ${note}
          ${noteDate}
        </div>
    `;
  }

  updateOneDrawer(data){
    const drawer = this.container.querySelector(`[data-story-id="${data.id}"]`);
    if (drawer) {
      const depth = parseInt(drawer.style.getPropertyValue('--node-depth'));
      drawer.outerHTML = this.drawSingleNode(data, depth);
      
      // Find the newly rendered node
      const updatedDrawer = this.container.querySelector(`[data-story-id="${data.id}"]`);
      if (updatedDrawer) {
        const writingDiv = updatedDrawer.querySelector('.writing');
        const arrow = updatedDrawer.querySelector('.arrow');
        
        // Open the node
        writingDiv.classList.remove('hidden');
        writingDiv.classList.add('visible');
        arrow.classList.add('open');
      }
      
      this.addEventListeners(); // Re-add event listeners for the updated node
    }
  }

  getIterateForm(node) {
    const endpoint = `text/iterate`;

    // add language to the endpoint
    const actionUrl = window.i18n.createUrl(endpoint);

    // translate the "title"
    const iterateTitle = window.i18n.translate('general.iterate');

    return `
    <form action="${actionUrl}" method="POST">
      <input type="hidden" name="id" value="${node.id}">
      <button type="submit" class="iterate" data-i18n-title="general.iterate" title="${iterateTitle}">
        ${SVGManager.iterateSVG}
      </button>
    </form>
    `;
  }

  getEditForm(node) {
    const endpoint = `text/edit`;

    // add language to the endpoint
    const actionUrl = window.i18n.createUrl(endpoint);

    // translate the "title"
    const editTitle = window.i18n.translate('general.edit');

    return `
      <form action="${actionUrl}" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <input type="hidden" name="parent_id" value="${node.parent_id}">
        <button type="submit" class="edit" value="Edit" data-i18n-title="general.edit" title="${editTitle}">
          ${SVGManager.editSVG}
        </button>
      </form>
    `;
  }

  getNoteForm(node) {
    const endpoint = `text/edit`;

    // add language to the endpoint
    const actionUrl = window.i18n.createUrl(endpoint);

    // translate the "title"
    const addNoteTitle = window.i18n.translate('general.add_note');

    return `
      <form action="${actionUrl}" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <button type="submit" class="note" value="Edit" data-i18n-title="general.add_note" title="${addNoteTitle}">
          ${SVGManager.addNoteSVG}
        </button>
      </form>
    `;
  }

  getVoteButton(node) {
    const voteTitle = window.i18n.translate('general.vote');

    return `
      <button class="vote ${node.hasVoted == 1? 'voted' : ''}" data-vote=${node.id} data-i18n-title="general.vote" title="${voteTitle}">
        ${SVGManager.voteSVG}
      </button>
    `;
  }

  getPublishForm(node) {
    const publishTitle = window.i18n.translate('general.publish');

    return `
        <button data-text-id="${node.id}" 
        data-insta-publish-button class="publish" data-i18n-title="general.publish" title="${publishTitle}">
          ${SVGManager.publishSVG}
        </button>
    `;
  }

  getDeleteForm(node) {
    const deleteTitle = window.i18n.translate('general.delete');

    return `
      <button
      data-insta-delete-button data-text-id="${node.id}" class="delete" data-i18n-title="general.delete" title="${deleteTitle}">
        ${SVGManager.deleteSVG}
      </button>
    `;
  }

  getNumberOfVotes(node) {
/*     if (node.text_status === "published") { */
      const maxVotes = node.playerCount - 1; 
      const colorScale = createColorScale(maxVotes); 
      const fillColor = colorScale(node.voteCount);
      const published = node.text_status == 'published';

      return `
      <div class="votes" data-fill-color="${published ? fillColor : ''}">
        <i>
          ${node.isWinner ? SVGManager.starSVG : SVGManager.votesSVG}
        </i>
        <span class="small vote-count ${published ? '' : 'hidden'}" data-vote-count=${node.voteCount} data-player-count=${node.playerCount - 1}>
          ${node.voteCount}/${node.playerCount - 1} votes
        </span>
      </div>
    `;
  }

  applySVGColors(container) {
    const voteElements = container.querySelectorAll('.votes');
    voteElements.forEach(voteElement => {
      const fillColor = voteElement.dataset.fillColor;
      const svgPath = voteElement.querySelector('svg path');
      if (svgPath) {
        svgPath.setAttribute('fill', fillColor);
      }
      if (fillColor == ""){
        svgPath.setAttribute('stroke', 'none');
        svgPath.setAttribute('fill', 'none');
      }
    });
  }

  getAuthor(node) {
    // Create a proper JSON string for the parameters
    const authorParams = JSON.stringify({
      firstName: node.firstName || '',
      lastName: node.lastName || ''
    });
    
    const byYouText = window.i18n ? window.i18n.translate("general.by_you") : 'by you';
    const byOtherText = window.i18n ? window.i18n.translate("general.by_other", {
      firstName: node.firstName || '', 
      lastName: node.lastName || ''
    }) : `by ${node.firstName} ${node.lastName}`;
    
    // Return the appropriate author HTML based on permissions
    return node.permissions.isMyText ? 
      `<span class="author" data-i18n="general.by_you">${byYouText}</span>` : 
      `<span class="author" data-i18n="general.by_other" data-i18n-params='${authorParams}'>${byOtherText}</span>`;
  }

  getStatus(node){
    if(node.isWinner){
      // translate the string
      const status = window.i18n ? window.i18n.translate("general.winner") : "winner";

      return `
      <span data-status class="status winner" data-i18n="general.winner"}>
        ${status}
      </span>`;
    }
    else if(node.text_status !== "published"){
      // translate the string
      const status = window.i18n ? window.i18n.translate("general.draft") : "draft";
      return `
      <span data-status class="status draft" data-i18n="general.draft"}>
        ${status}
      </span>`;
    }else{
      return '';
    }
  }
  
  addEventListeners() {
    // First, remove existing event listeners to prevent duplicates
    const oldTitles = this.container.querySelectorAll('.node-headline');
    oldTitles.forEach(title => {
      // Clone and replace only the node-headline, not any SVG content inside buttons
      const clone = title.cloneNode(true);
      title.parentNode.replaceChild(clone, title);
    });
    
    // Now add fresh event listeners
    const titles = this.container.querySelectorAll('.node-headline');
    titles.forEach(title => {
      title.addEventListener('click', () => {
        const text_id = title.closest('[data-story-id]').dataset.storyId; 
        console.log("text_id", text_id);
        const writingDiv = title.closest('.node').querySelector('.writing'); 
        const arrow = title.querySelector('.arrow');
        if (writingDiv.classList.contains('hidden')) {
          writingDiv.classList.remove('hidden');
          writingDiv.classList.add('visible');
          arrow.classList.remove('arrow-right');
          arrow.classList.add('arrow-down'); 
          arrow.classList.remove('closed');
          arrow.classList.add('open');
          // Handle marking as "read"
          this.SeenManager.markAsSeen(text_id);
          this.SeenManager.updateReadStatus(text_id);
          
          // Emit shelf node opened event for activity tracking
          eventBus.emit('shelfNodeOpened', text_id);
        } else {
          writingDiv.classList.add('hidden');
          writingDiv.classList.remove('visible');
          arrow.classList.remove('open');   
          arrow.classList.add('closed');
          arrow.classList.remove('arrow-down');
          arrow.classList.add('arrow-right');
          
          // Emit shelf node closed event for activity tracking
          eventBus.emit('shelfNodeClosed', text_id);
        }
      });
    });
    
    // Re-apply SVG colors to ensure proper rendering
    this.applySVGColors(this.container);
  }
}






/*  ${node.permissions.canDelete ? this.getDeleteForm(node) : ''}  */
