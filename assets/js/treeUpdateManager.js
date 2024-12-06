import { eventBus } from './eventBus.js';
import { createColorScale } from './createColorScale.js';

export class TreeUpdateManager {
  constructor(treeVisualizer) {
    this.initEventListeners();
    this.treeVisualizer = treeVisualizer;
    this.dataManager = window.dataManager;
  }

  initEventListeners() {
    eventBus.on('instaPublish', this.handleInstaPublish.bind(this));
    eventBus.on('instaDelete', this.handleInstaDelete.bind(this));
    eventBus.on('chooseWinner', this.handleChooseWinner.bind(this));
    eventBus.on('voteToggle', this.handleVoteToggle.bind(this));
    eventBus.on('gamePlayerCountUpdate', this.handleGamePlayerCountUpdate.bind(this));
    eventBus.on('newNodesDiscovered', this.handleNewNodesDiscovered.bind(this));
  }

  handleInstaPublish({ textId, newStatus }) {
    const heart = document.querySelector(`path[data-id="${textId}"]:not(.link)`);
    console.log("heart", heart);

    if (!heart) {
      return;
    }

    const nodeGroup = heart.closest('g');
    console.log("nodeGroup", nodeGroup);

    if (nodeGroup) {
      // Update heart path - fixed duplicate class and added proper class toggling
      d3.select(heart)
        .classed('tree-node-draft', newStatus === 'draft' || newStatus === 'incomplete_draft')
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
      // Update s heart
      const heart = document.querySelector(`path[data-id="${textId}"]:not(.link)`);
      const nodeGroup = heart.closest('g');
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
      // Update selector to find path instead of circle
      const heart = container.querySelector(`path[data-id="${textId}"]`);
      if (heart) {
        const nodeGroup = heart.closest('g');
        if (nodeGroup) {
          heart.remove();


          // Create and add the star
          const star = document.createElementNS("http://www.w3.org/2000/svg", "path");
          star.setAttribute("d", d3.symbol().type(d3.symbolStar).size(200)());
          star.setAttribute("class", "star read");
          star.setAttribute("data-id", textId);
          star.setAttribute("fill", "#ff009b"); // Use the baseColor

          // Insert the star as the first child of the nodeGroup
          nodeGroup.insertBefore(star, nodeGroup.firstChild);

          // Update class
          d3.select(nodeGroup)
            .classed('winner', true);
        }
      }
    }
  }

  handleVoteToggle({ data }) {
    const container = document.querySelector('#showcase[data-showcase="tree"]')
    const playerCountMinusOne = data.playerCountMinusOne || data.playerCount - 1;

    // If the showcase is not a tree, do nothing
    if (!container) {
        return;
    }

    const nodeId = data.id
    const newVoteCount = data.voteCount 
    const colorScale = createColorScale(playerCountMinusOne);
    const node = container.querySelector(`.node path[data-id="${nodeId}"]`);

    if (!node || !colorScale) {
        return;
    }

    node.setAttribute('fill', colorScale(newVoteCount));
  }

  handleGamePlayerCountUpdate({ gameId, newPlayerCount }) {
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (!container) return;
    
    const maxVotes = newPlayerCount - 1;
    const colorScale = createColorScale(maxVotes);
    
    // Update node colors
    const nodes = container.querySelectorAll('.node path[data-id]:not(.link)');
    nodes.forEach(node => {
      const voteCount = parseInt(node.dataset.voteCount || '0');
      node.setAttribute('fill', colorScale(voteCount));
    });

    // Update legend
    const legend = container.querySelector('.legend');
    console.log("legend", legend);
    if (legend) {
      // Find the votes group (the one with the gradient rect)
      const votesGroup = legend.querySelector('.legend-item rect[fill="url(#vote-gradient)"]').closest('.legend-item');
      console.log("votesGroup", votesGroup);
      if (!votesGroup) return;

      // Get previous maxVotes from the last tick label
      const tickLabels = votesGroup.querySelectorAll('[data-tick-value]');
      console.log("tickLabels", tickLabels);
      const previousMaxVotes = tickLabels.length ? parseInt(tickLabels[tickLabels.length - 1].textContent) : 0;
      console.log("previousMaxVotes", previousMaxVotes);

      // Only recreate gradient if we're coming from maxVotes of 0
      if (previousMaxVotes === 0) {
        const oldGradient = container.querySelector('#vote-gradient');
        if (oldGradient) oldGradient.remove();

        const svg = d3.select(container).select('svg');
        const gradient = svg.append("defs")
          .append("linearGradient")
          .attr("id", "vote-gradient")
          .attr("x1", "0%")
          .attr("x2", "100%");

        gradient.append("stop")
          .attr("offset", "0%")
          .attr("stop-color", colorScale(0));

        gradient.append("stop")
          .attr("offset", "100%")
          .attr("stop-color", colorScale(maxVotes));
      }

      // Update tick labels
      const tickValues = [0, Math.floor(maxVotes / 2), maxVotes];
      tickLabels.forEach((label, index) => {
        label.textContent = tickValues[index];
      });
    }
  }

  handleNewNodesDiscovered(newNodesData) {
    // get the full tree
    this.treeData = this.dataManager.getTreeByGameId(newNodesData[0].game_id);

/*     const parentNode = this.dataManager.getNode(String(newNodesData[0].parent_id));

    if (parentNode) { */
        // Update the visualization for whole tree
    this.treeVisualizer.updateTree();
/*     } */
  }
} 
