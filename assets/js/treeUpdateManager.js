import { eventBus } from './eventBus.js';

export class TreeUpdateManager {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
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
        .classed('tree-node-published', newStatus === 'published');

      // Update title
      const titleText = nodeGroup.querySelector('text:not(.text-by)');
      d3.select(titleText)
        .classed('tree-title-draft', newStatus === 'draft')
        .classed('tree-title-published', newStatus === 'published');

      // Update author text
      const authorText = nodeGroup.querySelector('text.text-by');
      d3.select(authorText)
        .classed('tree-author-draft', newStatus === 'draft')
        .classed('tree-author-published', newStatus === 'published');

      // Update the "DRAFT" text in the author line if necessary
      if (authorText) {
        let authorContent = authorText.textContent;
        if (newStatus === 'draft' && !authorContent.startsWith('DRAFT')) {
          authorText.textContent = 'DRAFT ' + authorContent;
        } else if (newStatus === 'published' && authorContent.startsWith('DRAFT')) {
          authorText.textContent = authorContent.replace('DRAFT ', '');
        }
      }
    } else {
      console.log('Node group not found');
    }
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