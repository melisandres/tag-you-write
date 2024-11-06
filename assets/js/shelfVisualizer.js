import { SVGManager } from './svgManager.js';
import { SeenManager } from './seenManager.js';
import { createColorScale } from './createColorScale.js'; // Import the utility function

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
    this.applySVGColors(this.container);
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
      <li class="node ${node.text_status === "published" ? "published" : "draft"}" data-story-id="${node.id}" style="--node-depth: ${depth}">
        <div class="node-headline ${isWinner}">
          <div class="arrow">▶</div>
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
    if (node.text_status === "published") {
      const maxVotes = node.playerCount - 1; 
      const colorScale = createColorScale(maxVotes); 
      const fillColor = colorScale(node.voteCount);

      return `
      <div class="votes" data-fill-color="${fillColor}">
        <i>
          ${node.isWinner ? SVGManager.starSVG : SVGManager.votesSVG}
        </i>
        <span class="small vote-count" data-vote-count=${node.voteCount} data-player-count=${node.playerCount - 1}>
          ${node.voteCount}/${node.playerCount - 1} votes
        </span>
      </div>
    `;
    } else {
      // if the story isn't published, you need a placeholder for the heart icon.
      return `
        <div class="votes" data-fill-color="">
          <i>
            ${SVGManager.votesSVG}
          </i>
          <span class="small vote-count hidden" data-vote-count=${node.voteCount} data-player-count=${node.playerCount - 1}>
          </span>
        </div>
      
      `;
    }
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
