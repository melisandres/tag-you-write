import { SVGManager } from './svgManager.js';

export class ShelfVisualizer {
  constructor(container, path) {
    this.path = path;
    this.container = container;
  }

  drawShelf(data) {
    // Clear any existing content
    this.container.innerHTML = '';
    this.container.classList.add("with-shelf");

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
    let author = node.permissions.isMyText ? 
    `<span class="author">by you</span>` : 
    `<span class="author">by ${node.firstName} ${node.lastName}</span>`;
    console.log(node);

    let drawerHTML = `
      <li class="node" style="--node-depth: ${depth}">
        <div class="node-title">
          <h2>
            <span class="arrow">▶</span>
            <span class="title">${node.title}</span>
            ${author}
            <span>${this.getNumberOfVotes(node)}</span>
          </h2>
        </div>
        <div class="writing hidden">
          <div class="node-buttons">
            ${node.permissions.canIterate ? this.getIterateForm(node) : ''}
            ${node.permissions.canEdit ? this.getEditForm(node) : ''}
            ${node.permissions.canVote ? this.getVoteButton(node) : ''}
          </div>
          <p>
            ${node.writing}
          </p>
          <span class="date"> ${node.date}</span>
        </div>
    `;

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

/*   getVoteForm(node) {
    return `
      <form action="${this.path}vote/voteToggle" method="POST">
        <input type="hidden" name="id" value="${node.id}">
        <input type="hidden" name="parent_id" value="${node.parent_id}">
        <button type="submit" class="vote" value="Vote" data-vote=${node.id}>
          ${SVGManager.voteSVG}
        </button>
      </form>
    `;
  } */  

  getVoteButton(node) {
      return `
        <button class="vote ${node.hasVoted == 1? 'voted' : ''}" data-vote=${node.id}>
          ${SVGManager.voteSVG}
        </button>
    `;
  }

  getNumberOfVotes(node) {
    return `
        <i>
          ${SVGManager.votesSVG}
        </i>
        <span class="small"  data-vote-count=${node.voteCount} data-player-count=${node.playerCount - 1}>
          ${node.voteCount}/${node.playerCount - 1}
        </span>
    `;
  }
  

  addEventListeners() {
    const titles = this.container.querySelectorAll('.node-title');
    titles.forEach(title => {
      title.addEventListener('click', () => {
        const writingDiv = title.nextElementSibling;
        const arrow = title.querySelector('.arrow');
        if (writingDiv.classList.contains('hidden')) {
          writingDiv.classList.remove('hidden');
          arrow.textContent = '▼';
        } else {
          writingDiv.classList.add('hidden');
          arrow.textContent = '▶';
        }
      });
    });
  }
}




/*  ${node.permissions.canDelete ? this.getDeleteForm(node) : ''}  */


