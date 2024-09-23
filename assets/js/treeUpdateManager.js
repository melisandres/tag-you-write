import { eventBus } from './eventBus.js';

export class TreeUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('chooseWinner', this.handleChooseWinner.bind(this));
    eventBus.on('voteToggle', this.handleVoteToggle.bind(this));
  }

  handleInstaPublish({ textId, newStatus }) {
    const circle = document.querySelector(`circle[data-id="${textId}"]`);

    if (!circle) {
      return;
    }

    const nodeGroup = circle.closest('g');

    if (nodeGroup) {
      // Update circle
      d3.select(circle)
        .classed('tree-node-draft', newStatus === 'draft')
        .classed('tree-node-draft', newStatus === 'incomplete_draft')
        .classed('tree-node-published', newStatus === 'published');

      // Update title
      const titleText = nodeGroup.querySelector('text:not(.text-by)');
      d3.select(titleText)
        .classed('tree-title-draft', newStatus === 'draft')
        .classed('tree-title-draft', newStatus === 'incomplete_draft')
        .classed('tree-title-published', newStatus === 'published');

      // Update author text
      const authorText = nodeGroup.querySelector('text.text-by');
      d3.select(authorText)
        .classed('tree-author-draft', newStatus === 'draft')
        .classed('tree-author-draft', newStatus === 'incomplete_draft')
        .classed('tree-author-published', newStatus === 'published');

      // Update the "DRAFT" text in the author line if necessary
      if (authorText) {
        let authorContent = authorText.textContent;
        if ((newStatus === 'draft' || newStatus === 'incomplete_draft') && !authorContent.startsWith('DRAFT')) {
          authorText.textContent = 'DRAFT ' + authorContent;
        } else if (newStatus === 'published' && authorContent.startsWith('DRAFT')) {
          authorText.textContent = authorContent.replace('DRAFT ', '');
        }
      }
    } else {
      console.log('Node group not found');
    }
  }

  handleInstaDelete({ textId }) {
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (container) {
      const node = container.querySelector(`circle[data-id="${textId}"]`);
      const nodeGroup = node.closest('g');
      if (nodeGroup) {
          d3.select(nodeGroup)
          .classed('display-none', true);
      } 
      const link = container.querySelector(`path[data-id="${textId}"]`);
      if (link) {
          d3.select(link)
          .classed('display-none', true);
      }
    }
  }

  handleChooseWinner({ textId }) {
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (container) {
      const circle = container.querySelector(`circle[data-id="${textId}"]`);
      console.log("circle", circle)
      if (circle) {
        const nodeGroup = circle.closest('g');
        console.log("nodeGroup", nodeGroup)
        if (nodeGroup) {
          // Remove the existing circle
          circle.remove();


          // Create and add the star
          const star = document.createElementNS("http://www.w3.org/2000/svg", "path");
          star.setAttribute("d", d3.symbol().type(d3.symbolStar).size(200)());
          star.setAttribute("class", "star read");
          star.setAttribute("data-id", textId);
          star.setAttribute("fill", "#ff009b"); // Use the baseColor

          // Insert the star as the first child of the nodeGroup
          nodeGroup.insertBefore(star, nodeGroup.firstChild);

          // Update classes if needed
          d3.select(nodeGroup)
            .classed('winner', true);
        }
      }
    }
  }

  handleVoteToggle({ data }) {
    const container = document.querySelector('#showcase[data-showcase="tree"]')

    // If the showcase is not a tree, do nothing
    if (!container) {
        return;
    }

    const nodeId = data.textId
    const newVoteCount = data.voteCount 
    const maxVoteCount = data.playerCountMinusOne
    const colorScale = this.createColorScale(maxVoteCount)
    const node = container.querySelector(`circle[data-id="${nodeId}"]`);

    if (!node || !colorScale) {
        return;
    }

    node.setAttribute('fill', colorScale(newVoteCount));
  }

  //
  createColorScale(maxVotes) {
    const domain = maxVotes > 0 ? [0, maxVotes] : [0, 1];
    return d3.scaleLinear()
        .domain(domain)
        .range(['white', '#ff009b'])
        .interpolate(d3.interpolateRgb);
  }

/*   updateNodeVoteCount(nodeId, newVoteCount, maxVoteCount) {
    const node = this.container.querySelector(`circle[data-id="${nodeId}"]`);
    if (node) {
      const colorScale = this.createColorScale(maxVoteCount);
      d3.select(node).attr('fill', colorScale(newVoteCount));
    }
  } */

/*   markNodeAsRead(nodeId) {
    const node = this.container.querySelector(`[data-id="${nodeId}"]`);
    if (node) {
      d3.select(node)
        .classed('unread', false)
        .classed('read', true);
    }
  } */

/*   createColorScale(maxVotes) {
    return d3.scaleLinear()
      .domain([0, maxVotes])
      .range(['white', '#ff009b'])
      .interpolate(d3.interpolateRgb);
  }*/
} 