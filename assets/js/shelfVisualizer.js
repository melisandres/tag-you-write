import { SVGManager } from './svgManager.js';
import { SeenManager } from './seenManager.js';

export class ShelfVisualizer {
  constructor(container, path) {
    this.path = path;
    this.container = container;
    this.SeenManager = new SeenManager(path);
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
    const unread = node.text_seen == "0" ? "unread" : "";
    const note = node.note ? `<p class="note">P.S... ${node.note}</p>` : '';
    const noteDate = node.note_date ?  `<span class="date"> ${node.note_date}</span>` : '';

    return `
      <li class="node ${unread} ${node.text_status === "published" ? "published" : "draft"}" data-story-id="${node.id}" style="--node-depth: ${depth}">
        <div class="node-title ${isWinner}">
          <h2>
            <span class="arrow">▶</span>
            <span class="title">${node.title || "Untitled"}</span>
            ${author}
            ${this.getStatus(node)}
          </h2>
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

      }
      
      this.addEventListeners(); // Re-add event listeners for the updated node
    }
  }

  /*
  getDeleteForm(node) {
    const disabled = node.permissions.isParent || node.permissions.canIterate;
    return `
      <form action="${this.path}text/delete" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <input type="hidden" name="parent_id" value="${node.parent_id}">
        <input type="hidden" name="writer_id" value="${node.writer_id}">
        <input type="submit" value="Delete" ${disabled ? 'disabled title="Cannot be deleted. Other texts iterate on it."' : ''}>
      </form>
    `;
  } */

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
    return `
    <span>
      <i>
        ${SVGManager.votesSVG}
      </i>
      <span class="small"  data-vote-count=${node.voteCount} data-player-count=${node.playerCount - 1}>
        ${node.voteCount}/${node.playerCount - 1}
      </span>
    </span>
`   ;
  }

  getStatus(node){
    if(node.text_status === "published"){
      return this.getNumberOfVotes(node); 
    }else{
      return `
      <span class="status ${node.text_status === "draft" || node.text_status === "incomplete_draft" ? "draft" : "published" }">
        ${node.text_status === "published" ? "published" : "draft"}
      </span>`;
    }
  }
  
  addEventListeners() {
    const titles = this.container.querySelectorAll('.node-title');
    titles.forEach(title => {
      title.addEventListener('click', () => {
        const text_id = title.closest('[data-story-id]').dataset.storyId;
        const writingDiv = title.nextElementSibling;
        const arrow = title.querySelector('.arrow');
        if (writingDiv.classList.contains('hidden')) {
          writingDiv.classList.remove('hidden');
          writingDiv.classList.add('visible');
          arrow.textContent = '▼';
          // Handle marking as "read"
          this.SeenManager.markAsSeen(text_id);
          this.SeenManager.updateReadStatus(text_id);
        } else {
          writingDiv.classList.add('hidden');
          writingDiv.classList.remove('visible');
          arrow.textContent = '▶';
        }
      });
    });
  }
}




/*  ${node.permissions.canDelete ? this.getDeleteForm(node) : ''}  */