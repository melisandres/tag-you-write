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
    eventBus.on('nodeTextContentUpdate', this.handleNodeTextContentUpdate.bind(this));
    eventBus.on('searchApplied', this.handleSearchUpdate.bind(this));
    eventBus.on('updateNodeWinner', this.handleChooseWinnerFromPolling.bind(this));
    eventBus.on('textActivityChanged', this.handleTextActivityChanged.bind(this));
  }

  handleTextActivityChanged(activityData) {
    const { textId, activity_type, parent_id, user_id } = activityData;
    
    if (activity_type === 'iterating') {
        // Show ghost node positioned under parent_id
        this.showIteratingGhostNode(textId, parent_id, user_id);
    } else if (activity_type === 'adding_note') {
        // Show "adding note" indicator on existing node
        this.showAddingNoteIndicator(textId, user_id);
    } else {
        // activity_type is null - remove any indicators
        this.removeTextActivityIndicators(textId);
    }
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

  handleChooseWinnerFromPolling({ data }) {
    const textId = data.id;
    console.log('TEXT ID', textId);
    this.handleChooseWinner({ textId });
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

  handleGamePlayerCountUpdate({ newPlayerCount, gameId }) {
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (!container) return;

    const showCaseGameId = container.closest('[data-game-id]').dataset.gameId;
    if (showCaseGameId !== gameId){
      console.warn("Game ID mismatch in tree update manager");
      return;
    } 

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
    // Get the current root ID from the DataManager
    const currentRootId = this.dataManager.getCurrentViewedRootStoryId();
    // Get the tree directly using getTree
    const updatedTreeData = this.dataManager.getTree(currentRootId);
    
    // Update the visualizer's tree data
    this.treeVisualizer.setTreeData(updatedTreeData);
    
    // Now update the visualization
    this.treeVisualizer.updateTree();
    
    // Check if search is active and explicitly apply search highlighting
    const searchTerm = this.dataManager.getSearch();
    if (searchTerm) {
      console.log('Search is active with term:', searchTerm);
      // Apply search highlighting again to ensure new nodes are highlighted
      const searchResults = this.dataManager.getSearchResults();
      if (searchResults && searchResults.nodes) {
        console.log('Reapplying search highlighting after tree update');
        // Manually trigger search update to ensure newly added nodes get highlighted
        this.handleSearchUpdate(searchTerm);
      }
    }
  }

  handleNodeTextContentUpdate(nodeData) {
    console.log("1. handleNodeTextContentUpdate START:", nodeData);
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (!container) return;

    // Emit event for TreeVisualizer to handle title update
    if (nodeData.data.changes.title) {
        console.log("2. About to emit updateTreeNodeTitle");
        eventBus.emit('updateTreeNodeTitle', {
            nodeId: nodeData.data.id,
            title: nodeData.data.changes.title
        });
    }

    // Let's just update the "read" status... but only if the node is not owned by the current user
    if (nodeData.data.changes.note_date) {
      console.log("3. mark the node as unread");

      // Get the node id
      const id = nodeData.data.id;

      // Get the user id
      const userMeta = document.querySelector('meta[name="user"]');
      const userId = userMeta ? userMeta.getAttribute('data-user-id') : null;
      console.log("userId", userId);

      // Get the node data
      const nodeInfo = this.dataManager.getNode(id);
      const nodeWriterId = nodeInfo.writer_id;

      // If the node is not owned by the current user, mark it as unread
      if (userId === nodeWriterId) {
        console.log("4. node is owned by the current user, do nothing");
        return;
      }

      // Get the node
      const node = container.querySelector(`.node path[data-id="${id}"]`);

      // If the node is read, mark it as unread
      if (node.classList.contains('read')) {
        node.classList.remove('read');
        node.classList.add('unread');
      }
    }

    // Apply search highlighting for the specific updated node
    const searchTerm = this.dataManager.getSearch();
    if (searchTerm) {
        console.log("3. Before updateSingleNodeSearchHighlight, current search results:", 
            this.dataManager.getSearchResults());
        this.updateSingleNodeSearchHighlight(nodeData.data.id);
    }
  }

  handleNodeHighlighting(nodeId, container) {
    const searchResults = this.dataManager.getSearchResults();
    console.log('8. handleNodeHighlighting for nodeId:', nodeId);
    if (!searchResults?.nodes) {
        console.log('9. No search results available');
        return;
    }

    const stringNodeId = String(nodeId);
    const nodeData = searchResults.nodes[stringNodeId];
    const node = container.querySelector(`.node path[data-id="${stringNodeId}"]`);
    
    console.log('10. Node data:', {
        nodeData,
        nodeFound: !!node,
        matches: nodeData ? {
            writing: nodeData.writingMatches,
            note: nodeData.noteMatches,
            title: nodeData.titleMatches,
            writer: nodeData.writerMatches
        } : null
    });
    
    if (!node || !nodeData) return;

    const searchTerm = this.dataManager.getSearch();

    // Base node highlighting for content matches
    if (nodeData.writingMatches || nodeData.noteMatches) {
        console.log('11. Adding search-match class to node:', stringNodeId);
        d3.select(node).classed('search-match', true);
    } else {
        console.log('12. Removing search-match class from node:', stringNodeId);
        d3.select(node).classed('search-match', false);
    }

    // Title/author text highlighting
    if (nodeData.titleMatches || nodeData.writerMatches) {
        console.log('13. Handling title highlight for node:', stringNodeId);
        this.treeVisualizer.handleTitleHighlight(nodeId, searchTerm, true);
    } else {
        console.log('14. Removing title highlight for node:', stringNodeId);
        this.treeVisualizer.handleTitleHighlight(nodeId, searchTerm, false);
    }
  }

  updateSingleNodeSearchHighlight(nodeId) {
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (!container) return;
    this.handleNodeHighlighting(nodeId, container);
  }

  handleSearchUpdate(searchTerm) {
    console.log('1. handleSearchUpdate called with term:', searchTerm);
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    console.log('2. Container found:', !!container);
    if (!container) return;

    // Clear all previous search matches AND title highlights
    const allNodes = container.querySelectorAll('.node path[data-id]:not(.link)');
    console.log('3. Found nodes to clear:', allNodes.length);
    allNodes.forEach(node => {
        const nodeId = node.getAttribute('data-id');
        d3.select(node).classed('search-match', false);
        // Always call handleTitleHighlight with false when clearing
        this.treeVisualizer.handleTitleHighlight(nodeId, '', false);
    });

    if (!searchTerm) {
        console.log('4. No search term, exiting');
        return;
    }

    // Get search results and highlight matching nodes
    const searchResults = this.dataManager.getSearchResults();
    console.log('5. Search results:', searchResults);
    if (!searchResults?.nodes) {
        console.log('6. No search results nodes found');
        return;
    }

    Object.keys(searchResults.nodes).forEach(nodeId => {
        console.log('7. Processing node:', nodeId);
        this.handleNodeHighlighting(nodeId, container);
    });
  }

  // === Text Activity Indicator Methods ===
  // Note: Tree view uses different visual approach than shelf view

  /**
   * Show ghost node for iterating activity in tree view
   * Creates a placeholder node in the tree structure
   */
  showIteratingGhostNode(textId, parentId, userId) {
    console.log(`🌳 TreeUpdateManager: Would show iterating ghost for text ${textId} (not yet implemented for tree view)`);
    // TODO: Implement tree-specific ghost node visualization
  }

  /**
   * Show visual indicator that someone is adding a note in tree view
   */
  showAddingNoteIndicator(textId, userId) {
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (!container) return;

    // Find the node group by data-id
    const nodeGroup = container.querySelector(`.node path[data-id="${textId}"]`)?.parentNode;
    if (!nodeGroup) return;

    // Remove any existing indicator first
    this.removeAddingNoteIndicator(textId);

    // Get the heart/star's bounding box for positioning
    const heart = nodeGroup.querySelector('path[data-id]');
    if (!heart) return;
    const bbox = heart.getBBox();

    // Create the SVG circle
    const ns = "http://www.w3.org/2000/svg";
    const dot = document.createElementNS(ns, "circle");
    dot.setAttribute("class", "activity-dot adding-note");
    dot.setAttribute("cx", bbox.x + bbox.width - 22); //lower nums go left
    dot.setAttribute("cy", bbox.y + 21); // higher numbers go down
    dot.setAttribute("r", 6); // adjust as needed
    dot.setAttribute("data-activity-user-id", userId);

    // Tag for easy removal
    dot.setAttribute("data-adding-note-indicator", textId);

    nodeGroup.appendChild(dot);
  }

  removeAddingNoteIndicator(textId) {
    const container = document.querySelector('#showcase[data-showcase="tree"]');
    if (!container) return;
    const dot = container.querySelector(`circle.activity-dot.adding-note[data-adding-note-indicator="${textId}"]`);
    if (dot) dot.remove();
  }

  /**
   * Remove all text activity indicators for a given text in tree view
   */
  removeTextActivityIndicators(textId) {
    console.log(`�� TreeUpdateManager: Removing activity indicators for text ${textId}`);
    this.removeAddingNoteIndicator(textId);
  }

  /**
   * Apply current activity indicators to newly rendered tree
   * Similar to how search highlighting works in shelf
   */
  applyCurrentActivityIndicators(container) {
    console.log('🔍 TreeUpdateManager: applyCurrentActivityIndicators called with container:', container);
    
    if (!window.userActivityDataManagerInstance) {
      console.log('❌ TreeUpdateManager: No userActivityDataManagerInstance found');
      return;
    }

    // Get current text activities
    const textActivities = window.userActivityDataManagerInstance.getDerivedTextActivities();
    console.log('🔍 TreeUpdateManager: Found text activities:', textActivities);
    
    textActivities.forEach(activity => {
      const { text_id, activity_type, user_id, parent_id } = activity;
      console.log(`🔍 TreeUpdateManager: Processing activity - textId: ${text_id}, type: ${activity_type}, userId: ${user_id}`);
      
      if (activity_type === 'adding_note') {
        // Apply adding note indicator
        this.showAddingNoteIndicator(text_id, user_id);
      } else if (activity_type === 'iterating') {
        // Apply iterating placeholder (when implemented)
        this.showIteratingGhostNode(text_id, parent_id, user_id);
      }
    });
    
    console.log('📝 TreeUpdateManager: Applied current activity indicators for', textActivities.length, 'activities after tree draw');
  }

} 
