import { SVGManager } from './svgManager.js';
import { SeenManager } from './seenManager.js';
import { createColorScale } from './createColorScale.js'; // Import the utility function

export class ShelfVisualizer {
  constructor(container, path) {
    this.path = path;
    this.container = container;
    this.SeenManager = new SeenManager(path);
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

    // Re-apply event listeners and colors
    this.addEventListeners();
    this.applySVGColors(this.container);
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
    const author = node.permissions.isMyText ? 
    `<span class="author">by you</span>` : 
    `<span class="author">by ${node.firstName} ${node.lastName}</span>`;
    const isWinner = node.isWinner ? "isWinner" : "";
    const unread = node.text_seen !== "1" ? "unread" : "";
    const note = node.note ? `<div class="note"><p>P.S... </p>${node.note}</div>` : '';
    const noteDate = node.note_date ?  `<span class="date"> ${node.note_date}</span>` : '';

    return `
      <li class="node ${node.text_status === "published" ? "published" : "draft"}" data-story-id="${node.id}" style="--node-depth: ${depth}">
        <div class="node-headline ${isWinner}">
          <div class="arrow closed">▶</div>
          <div class="shelf-heart ${unread}"> ${this.getNumberOfVotes(node)}</div>
          <div class="headline-content">
            <h2 class="title">
              ${node.title || "Untitled"}
            </h2>
            <p class="author">
              ${author}
            </p>
          </div>
          <span class="status">${node.isWinner ? 'WINNER' : (this.getStatus(node) || '')}</span>
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
        arrow.textContent = '▼';
        arrow.classList.add('open');
      }
      
      this.addEventListeners(); // Re-add event listeners for the updated node
    }
  }

  getIterateForm(node) {
    return `
    <form action="${this.path}text/iterate" method="POST">
      <input type="hidden" name="id" value="${node.id}">
      <button type="submit" class="iterate">
        ${SVGManager.iterateSVG}
      </button>
    </form>
    `;
  }

  getEditForm(node) {
    return `
      <form action="${this.path}text/edit" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <input type="hidden" name="parent_id" value="${node.parent_id}">
        <button type="submit" class="edit" value="Edit">
          ${SVGManager.editSVG}
        </button>
      </form>
    `;
  }

  getNoteForm(node) {
    return `
      <form action="${this.path}text/edit" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <button type="submit" class="note" value="Edit">
          ${SVGManager.addNoteSVG}
        </button>
      </form>
    `;
  }

  getVoteButton(node) {
      return `
        <button class="vote ${node.hasVoted == 1? 'voted' : ''}" data-vote=${node.id}>
          ${SVGManager.voteSVG}
        </button>
    `;
  }

  getPublishForm(node) {
    return `
        <button data-text-id="${node.id}" 
        data-insta-publish-button class="publish">
          ${SVGManager.publishSVG}
        </button>
    `;
  }

  getDeleteForm(node) {
    return `
      <button
      data-insta-delete-button data-text-id="${node.id}" class="delete">
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

  getStatus(node){
    if(node.text_status !== "published"){
      console.log(node.text_status);
      return `
      <span data-status class="status ${node.text_status === "draft" || node.text_status === "incomplete_draft" ? "draft" : "published" }">
        ${node.text_status === "published" ? "published" : "draft"}
      </span>`;
    }else{
      return '';
    }
  }
  
  addEventListeners() {
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
          arrow.textContent = '▼';
          arrow.classList.remove('closed');
          arrow.classList.add('open');
          // Handle marking as "read"
          this.SeenManager.markAsSeen(text_id);
          this.SeenManager.updateReadStatus(text_id);
        } else {
          writingDiv.classList.add('hidden');
          writingDiv.classList.remove('visible');
          arrow.textContent = '▶';
          arrow.classList.remove('open');   
          arrow.classList.add('closed');
        }
      });
    });
  }
}






/*  ${node.permissions.canDelete ? this.getDeleteForm(node) : ''}  */
