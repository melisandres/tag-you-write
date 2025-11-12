//import * as d3 from 'https://d3js.org/d3.v7.min.js';

export class TreeVisualizer {
    constructor() {
        this.svg = null;

        // Store instance globally
        window.treeVisualizerInstance = this;
        this.dataManager = window.dataManager;

        //get the container
        //this.container = container;

        // Constraints for the zoom 
        this.minScale = 0.25;
        this.maxScale = 2;

        // Minimum spacing between the nodes
        this.minSpacing = 200;

        // Margins
        this.leftMargin = 15;
        this.rightMargin = 15;
        this.topMargin = 15;
        this.bottomMargin = 15;

        // Some variables to define in drawTree
        this.containerHeight = null;
        this.containerWidth = null;
        this.margin = null;
        this.zoomMargin = 70;

        // Colors to represent the number of votes
        this.baseColor = '#ff009b';
        this.colorScale = null;

        // Handle the lengend position on browser resize
        this.legend = null;
        this.userToggledLegend = false;
        this.updateLegendVisibility = this.updateLegendVisibility.bind(this);
        this.toggleLegend = this.toggleLegend.bind(this);
        this.updateLegendPosition = this.updateLegendPosition.bind(this);
        window.addEventListener('resize', this.updateLegendPosition);
        this.handleResize = this.handleResize.bind(this);
        window.addEventListener('resize', this.handleResize);

        // Define a buffer (in pixels) for how far we allow dragging beyond the container
        this.buffer = 75;  // Adjust this value as needed

        this.pageJustLoaded = true;

       // Listen for the drawTree event
        eventBus.on('drawTree', this.handleDrawTree.bind(this));

        // Configuration for text sizing and visibility
        this.config = {
            fontSize: {
                title: {
                    // you have to account for the fact that the font size is scaled by the zoom level. A large number at min scale will look smaller than a small number at max scale.
                    min: 37,  // font size at min scale
                    max: 7,  // font size at max scale
                },
                author: {
                    min: 25,  // font size at min scale
                    max: 5,  // font size at max scale
                },
                zoomThreshold: 2.3  // Adjust this value to change when font size starts changing
            },
            authorVisibility: {
                fadeOutStart: 1,
                fadeOutEnd: 0.3
            },
            titleMaxWidth: this.minSpacing + (this.minSpacing * 0.1),
            titleMaxLines: 2,
            authorMaxWidth: this.minSpacing * 0.75,
            titleLineHeight: 1.2,  // Line height factor for title
            titleAuthorSpacing: -7,  // Adjust the vertical position on the author
        };

        this.treeData = null;

        // Add event listener for title updates
        eventBus.on('updateTreeNodeTitle', this.handleTitleUpdate.bind(this));

        // Use eventBus instead of DOM events
        if (window.eventBus) {
            window.eventBus.on('languageChanged', () => {
                console.log('Language changed event received in TreeVisualizer via eventBus');
                this.handleLanguageChange();
            });
        }
    }
    
    // TODO: if this is where we draw the tree... I'm adding ghost nodes
    handleDrawTree({ container, data }) {
        // Set container for later use
        this.container = container;

        // Get the activity data
        const activityData = window.userActivityDataManager.getDerivedTextActivities();

        // Add ghost nodes to the main data
        const enrichedTree = window.ghostTreeManager.enrichTreeWithGhosts(data, activityData);

        // Draw the tree
        this.drawTree(enrichedTree);
    }

    createColorScale(maxVotes) {
        const domain = maxVotes > 0 ? [0, maxVotes] : [0, 1];
        return d3.scaleLinear()
            .domain(domain)
            .range(['white', this.baseColor])
            .interpolate(d3.interpolateRgb);
    }

    updateNodeColor(node, voteCount, maxVotes) {
        if (!this.colorScale) {
            this.colorScale = this.createColorScale(maxVotes);
        }

        d3.select(node).select('circle')
            .attr('fill', this.colorScale(voteCount))
            .attr('data-vote-count', d => d.data.voteCount);
    }
  
    drawTree(data) {
        console.log('=== TREE DRAW START ===');
        
        // Check if we have a saved position for this specific tree
        const savedState = JSON.parse(localStorage.getItem('pageState'));
        const shouldUseSavedTransform = savedState?.showcase?.rootStoryId === data.id && 
                                      savedState?.showcase?.transform &&
                                      typeof savedState.showcase.transform.x === 'number' &&
                                      typeof savedState.showcase.transform.y === 'number' &&
                                      typeof savedState.showcase.transform.k === 'number';
        
        //console.log('Initial transform state:', transform);

        /* console.log('Tree data received:', data); */

        // Check if D3 is available
        if (typeof d3 === 'undefined') {
            this.showD3UnavailableMessage();
            return;
        }

        // Clear any existing content
        this.container.innerHTML = ''; 
        
        // Clear both showcase classes and add the appropriate one
        this.container.classList.remove("with-tree", "with-shelf");
        this.container.classList.add("with-tree");

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

        // Set width, height, and margins
        this.containerWidth = this.container.clientWidth;
        this.containerHeight = this.container.clientHeight
        this.margin = { top: this.topMargin, right: this.rightMargin, bottom: this.bottomMargin, left: this.leftMargin };
        const width = this.containerWidth - this.margin.left - this.margin.right;
        const height = this.containerHeight - this.margin.top - this.margin.bottom;

        // Manage the visualisation of node votes
        const maxVotes = data.playerCount - 1;
        this.colorScale = this.createColorScale(maxVotes);
  
        // Create SVG element
        this.svg = d3.select(this.container).append("svg")
            .attr("width", this.containerWidth)
            .attr("height", this.containerHeight)
            .style("overflow", "visible");

        // A filter for the unread nodes
        const defs = this.svg.append("defs");
        const filter = defs.append("filter")
            .attr("id", "unreadGlow")
            .attr("x", "-300%")    // Even wider bounds
            .attr("y", "-300%")
            .attr("width", "700%") // Much larger to prevent any cutoff
            .attr("height", "700%");

        // Super bright inner glow
        filter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", "3")
            .attr("result", "blur1");

        // Medium spread glow
        filter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", "15")
            .attr("result", "blur2");

        // Extra wide outer glow
        filter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", "25")   // Added third, wider blur
            .attr("result", "blur3");

        // Intense inner glow
        filter.append("feFlood")
            .attr("flood-color", "rgb(255, 220, 0)")
            .attr("flood-opacity", "1")
            .attr("result", "color1");

        // Strong middle glow
        filter.append("feFlood")
            .attr("flood-color", "rgb(255, 180, 0)")
            .attr("flood-opacity", "0.9")
            .attr("result", "color2");

        // Far-reaching outer glow
        filter.append("feFlood")
            .attr("flood-color", "rgb(255, 160, 0)") // Slightly more orange for distance
            .attr("flood-opacity", "0.7")            // Still visible but softer
            .attr("result", "color3");

        // Composite operations
        filter.append("feComposite")
            .attr("in", "color1")
            .attr("in2", "blur1")
            .attr("operator", "in")
            .attr("result", "glow1");

        filter.append("feComposite")
            .attr("in", "color2")
            .attr("in2", "blur2")
            .attr("operator", "in")
            .attr("result", "glow2");

        filter.append("feComposite")
            .attr("in", "color3")
            .attr("in2", "blur3")
            .attr("operator", "in")
            .attr("result", "glow3");

        // Merge all layers with extra intensity
        filter.append("feMerge")
            .selectAll("feMergeNode")
            .data([
                "glow3", // furthest outer glow
                "glow3", // doubled for distance
                "glow2", // middle glow
                "glow2", // doubled for intensity
                "glow1", // inner glow
                "glow1", // doubled for intensity
                "SourceGraphic"
            ])
            .enter().append("feMergeNode")
            .attr("in", d => d);

        // Update the search highlight filter
        const searchHighlightFilter = defs.append("filter")
            .attr("id", "searchHighlight")
            .attr("x", "-20%")
            .attr("y", "-20%")
            .attr("width", "140%")
            .attr("height", "140%");

        // First, create a dilated version of the text for the highlight shape
        searchHighlightFilter.append("feMorphology")
            .attr("in", "SourceGraphic")
            .attr("operator", "dilate")
            .attr("radius", "3")
            .attr("result", "thicken");

        // Create the yellow highlight
        searchHighlightFilter.append("feFlood")
            .attr("flood-color", "var(--color-accent)")
            .attr("flood-opacity", "0.6")
            .attr("result", "highlightColor");

        // Apply the highlight color to the thickened shape
        searchHighlightFilter.append("feComposite")
            .attr("in", "highlightColor")
            .attr("in2", "thicken")
            .attr("operator", "in")
            .attr("result", "highlightShape");

        // Critical: Merge with highlight FIRST, then SourceGraphic on top
        searchHighlightFilter.append("feMerge")
            .selectAll("feMergeNode")
            .data(["highlightShape", "SourceGraphic"]) // Order matters here
            .enter().append("feMergeNode")
            .attr("in", d => d);

        // Add ghost glow filter - using the same robust pattern as unreadGlow
        const ghostGlowFilter = defs.append("filter")
            .attr("id", "ghostGlow")
            .attr("x", "-300%")    // Same wide bounds as unreadGlow
            .attr("y", "-300%")
            .attr("width", "700%") // Same large size to prevent cutoff
            .attr("height", "700%");

        // Multiple blur layers for depth
        ghostGlowFilter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", "3")
            .attr("result", "blur1");

        ghostGlowFilter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", "15")
            .attr("result", "blur2");

        ghostGlowFilter.append("feGaussianBlur")
            .attr("in", "SourceGraphic")
            .attr("stdDeviation", "25")
            .attr("result", "blur3");

        // Multiple color layers with blue/purple ghost colors
        ghostGlowFilter.append("feFlood")
            .attr("flood-color", "rgb(150, 150, 255)")  // Light blue
            .attr("flood-opacity", "1")
            .attr("result", "color1");

        ghostGlowFilter.append("feFlood")
            .attr("flood-color", "rgb(120, 120, 220)")  // Medium blue
            .attr("flood-opacity", "0.9")
            .attr("result", "color2");

        ghostGlowFilter.append("feFlood")
            .attr("flood-color", "rgb(100, 100, 200)")  // Darker blue
            .attr("flood-opacity", "0.7")
            .attr("result", "color3");

        // Composite operations to combine colors with blurs
        ghostGlowFilter.append("feComposite")
            .attr("in", "color1")
            .attr("in2", "blur1")
            .attr("operator", "in")
            .attr("result", "glow1");

        ghostGlowFilter.append("feComposite")
            .attr("in", "color2")
            .attr("in2", "blur2")
            .attr("operator", "in")
            .attr("result", "glow2");

        ghostGlowFilter.append("feComposite")
            .attr("in", "color3")
            .attr("in2", "blur3")
            .attr("operator", "in")
            .attr("result", "glow3");

        // Merge all layers with intensity like unreadGlow
        ghostGlowFilter.append("feMerge")
            .selectAll("feMergeNode")
            .data([
                "glow3", // furthest outer glow
                "glow3", // doubled for distance
                "glow2", // middle glow
                "glow2", // doubled for intensity
                "glow1", // inner glow
                "glow1", // doubled for intensity
                "SourceGraphic"
            ])
            .enter().append("feMergeNode")
            .attr("in", d => d);

        const g = this.svg.append("g")
  
        // To correct the stutter of the tree when it is zoomed out and dragged, append a "g" to the original "g".
        const child = g.append("g");
  
        // Transform data using D3 hierarchy
        const root = d3.hierarchy(data, d => d.children);
        this.root = root;

        // Create a tree layout
        const treeLayout = d3.tree()
            .size([height, width])
            .separation((a, b) => a.parent === b.parent ? 1 : 2);

        const maxDepth = d3.max(root.descendants(), d => d.depth);

        const depthCounts = {};
        root.each(d => {
            if (!depthCounts[d.depth]) {
                depthCounts[d.depth] = 0;
            }
            depthCounts[d.depth]++;
        });
    
        const maxNodesAtDepth = Math.max(...Object.values(depthCounts));
        const requiredWidth = maxDepth * this.minSpacing;
        const requiredHeight = maxNodesAtDepth * this.minSpacing;
    
        treeLayout.size([requiredHeight, requiredWidth]);
        treeLayout(root);
    
        // Center the tree vertically within the container
        const offsetY = (height - requiredHeight) / 2;
    
        // Adjust the position of the nodes based on the root's position
        root.each(d => {
            d.x += offsetY;
        });

        // Draw the lines between the nodes
        const link = child.selectAll(".link")
            .data(root.descendants().slice(1))
            .enter().append("path")
            .attr("class", "link")
            .attr("data-id", d => d.data.id)
            .attr("d", d => {
                return `M${d.y},${d.x}
                    C${(d.y + d.parent.y) / 2},${d.x}
                    ${(d.y + d.parent.y) / 2},${d.parent.x}
                    ${d.parent.y},${d.parent.x}`;
        });
  
        // Draw the nodes
        const node = child.selectAll(".node")
            .data(root.descendants())
            .enter().append("g")
            .attr("class", d => {
                let classes = `node${d.children ? " node--internal" : " node--leaf"}`;
                if (d.data.isGhost) {
                    classes += " node--ghost";
                }
                return classes;
            })
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .on("click", (event, d) => {
                if (!d.data.isGhost) {  // Only allow clicks on non-ghost nodes
                    const customEvent = new CustomEvent('showStoryInModalRequest', {
                        detail: { id: d.data.id }
                    });
                    document.dispatchEvent(customEvent);
                }
            });
  
        const colorScale = this.colorScale;
        const baseColor = this.baseColor;

        // Get search results and term safely
        const searchResults = this.dataManager.getSearchResults() || { nodes: {} };
        const searchTerm = this.dataManager.getSearch();

        // Draw the heart/star for each node
        node.each(function(d) {
            const item = d3.select(this);
            if (d.data.isGhost) {
                // Create ghost heart with pulsing animation
                const ghostHeartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                const ghostHeart = item.append("path")
                    .attr("d", ghostHeartPath)
                    .attr("transform", "scale(0.4) translate(0, -15)")
                    .attr("class", "ghost-heart");
                
                // Debug: Log that we created a ghost heart
                console.log('👻 Created ghost heart for node:', d.data.id);
            } else if (d.data.isWinner) {
                item.append("path")
                    .attr("d", d3.symbol().type(d3.symbolStar).size(200))  // Use star for winner
                    .attr('class', d => d.data.text_seen == 1 ? 'star read' : 'star unread')  // Add class based on condition
                    .attr('data-id', d => d.data.id)  // Add data-set for text id
                    .attr("fill", baseColor);  // Star color for winner
            } else {
                // Replace circle with heart
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                // Build the classes string
                const self = this;
                const path = item.append("path")
                    .attr("d", heartPath)
                    .attr("transform", "scale(0.4) translate(0, -15)")  // Adjusted translation to center the heart
                    .attr('class', d => {
                        // Concatenate multiple classes based on conditions
                        let classes = `${d.data.text_seen == 1 ? 'read' : 'unread'}`;
                        
                        // Add status-based classes
                        if (d.data.text_status == 'draft' || d.data.text_status == 'incomplete_draft') {
                            classes += ' tree-node-draft';
                        } else if (d.data.text_status == 'published_late') {
                            classes += ' tree-node-published-late';
                        } else if (d.data.text_status == 'published') {
                            classes += ' tree-node-published';
                        }
                        
                        // Then replace the search condition with
                        if (self.dataManager && self.dataManager.getSearch() && 
                            searchResults.nodes && 
                            d.data.id && 
                            searchResults.nodes[d.data.id]) {
                            const nodeData = searchResults.nodes[d.data.id];
                            if (nodeData.writingMatches || nodeData.noteMatches) {
                                classes += " search-match";
                            }
                        }
                        
                        return classes.trim();
                    })
                    .attr('data-id', d => d.data.id)
                    .attr('data-vote-count', d => d.data.voteCount)
                    .attr('fill', d => colorScale(d.data.voteCount));
            }
        });
            
        // Add the title
        const titleGroup = node.append("g")
            .attr("class", "title-group")
            .attr("transform", "translate(0, -10)");  // Adjust vertical position as needed

        const titleBottomPosition = this.updateTitle(titleGroup, d => d.data.title || (window.i18n ? window.i18n.translate("general.untitled") : "Untitled"), this.config.fontSize.title.max);

/*         console.log('Formatting author name:', data);
        console.log('Permissions:', data.permissions); */
        // Add the author name, positioned below the title
        node.append("text")
            .attr("dy", `${titleBottomPosition + this.config.titleAuthorSpacing}px`)
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .attr("class", d => d.data.permissions.isMyText ? "text-by author" : "text-by")
            .text(d => this.formatAuthorName(d.data));
  

        // Get the bounding box of the drawn tree
        const bounds = child.node().getBBox();

        // Calculate the scale needed to fit the tree in the container
        // this scale basically just adds zoomMargin to the margins
        const scaleToFit = Math.min(
            (this.containerWidth - this.margin.left - this.margin.right - this.zoomMargin * 2) / bounds.width,
            (this.containerHeight - this.margin.top - this.margin.bottom - this.zoomMargin * 2) / bounds.height
        );

        // Set the minimum scale to ensure the tree fits with margins, but not larger than 1
        const minScale = Math.min(scaleToFit, 1);

        // Define zoom behavior with dynamic minScale
        const zoom = d3.zoom()
            .scaleExtent([minScale, this.maxScale])
            .extent([[0, 0], [this.containerWidth, this.containerHeight]])
            .on("zoom", event => {
                const transform = event.transform;
            
                // Performance monitoring
                const startTime = performance.now();
            
                // Log the zoom scale
               /*  console.log(`Zoom scale: ${transform.k}`); */
            
                // Calculate the size of the tree at the current zoom level
                const zoomedWidth = bounds.width * transform.k;
                const zoomedHeight = bounds.height * transform.k;
                
                // Calculate the center of the zoomed tree
                const treeCenterX = bounds.x * transform.k + zoomedWidth / 2;
                const treeCenterY = bounds.y * transform.k + zoomedHeight / 2;
                
                // Calculate the allowed range of movement
                const rangeX = Math.max(0, (zoomedWidth - this.containerWidth) / 2);
                const rangeY = Math.max(0, (zoomedHeight - this.containerHeight) / 2);
                
                // Add a buffer to allow some dragging even when zoomed out
     
                const widthBuffer = this.containerWidth/2;
                const heightBuffer = this.containerHeight/2;
                
                // Constrain the translation
                transform.x = Math.min(Math.max(transform.x, this.containerWidth / 2 - treeCenterX - rangeX - widthBuffer), 
                                    this.containerWidth / 2 - treeCenterX + rangeX + widthBuffer);
                transform.y = Math.min(Math.max(transform.y, this.containerHeight / 2 - treeCenterY - rangeY - heightBuffer), 
                                    this.containerHeight / 2 - treeCenterY + rangeY + heightBuffer);
                
                child.attr("transform", transform);

                // Update styles based on zoom level (throttled)
                const now = performance.now();
                if (now - this.lastStyleUpdate > this.styleUpdateThreshold) {
                    const stylesStartTime = performance.now();
                    this.updateStyles(child, transform.k);
                    const stylesEndTime = performance.now();
                    this.lastStyleUpdate = now;
                    
                    const totalTime = performance.now() - startTime;
                    
                    // Log performance if it's slow (over 16ms = 60fps threshold)
                    if (totalTime > 16) {
                        console.warn(`🐌 Slow zoom event: ${totalTime.toFixed(2)}ms total, updateStyles: ${(stylesEndTime - stylesStartTime).toFixed(2)}ms`);
                    }
                } else {
                    const totalTime = performance.now() - startTime;
                    if (totalTime > 5) {
                        console.log(`⚡ Fast zoom event: ${totalTime.toFixed(2)}ms (styles skipped)`);
                    }
                }
            })
            .on("end", () => {
                // Only emit transform change if we're not applying a saved transform
                if (!this.isApplyingSavedTransform) {
                    const transform = d3.zoomTransform(this.svg.node());
                    eventBus.emit('treeTransformChanged', {
                        x: transform.x,
                        y: transform.y,
                        k: transform.k
                    });
                }
                
                // Reapply search highlighting when zoom/drag ends
                const searchTerm = this.dataManager.getSearch();
                if (searchTerm) {
                    this.svg.selectAll('.node').each((d) => {
                        this.handleTitleHighlight(d.data.id, searchTerm, true);
                    });
                }
            });

        // Store the zoom behavior
        this.zoom = zoom;
        
        // Add throttling for updateStyles
        this.lastStyleUpdate = 0;
        this.styleUpdateThreshold = 50; // Only update styles every 50ms

        // Apply zoom to SVG
        this.svg.call(this.zoom);
        
        // Store saved transform for later application (after search updates)
        if (shouldUseSavedTransform) {
            console.log('Storing saved transform for tree:', data.id);
            this.pendingSavedTransform = savedState.showcase.transform;
        }
        
        // After bounds are calculated, handle positioning
        if (shouldUseSavedTransform) {
            console.log('Applying saved transform for tree:', data.id);
            const savedTransform = savedState.showcase.transform;
            const transform = d3.zoomIdentity
                .translate(savedTransform.x, savedTransform.y)
                .scale(savedTransform.k);
            this.svg.call(this.zoom.transform, transform);
        } else {
            console.log('Centering tree in container');
            this.centerTree(bounds, minScale);
        }

        // The Legend
        this.createLegend(data);   

        if (this.pageJustLoaded) {
            /* console.log('pageJustLoaded is getting set to false'); */
            this.pageJustLoaded = false;
        }

        // Store the tree data
        this.treeData = data;

        //TODO: make sure this works
        // After tree is completely drawn, apply search matches
        this.applySearchMatches();
        
        // Explicitly translate all "Untitled" nodes immediately after drawing the tree
        // TODO: This ensures that the "Untitled" text is always translated on first draw... which is not working otherwise... it's annoying. 
/*         if (window.i18n) {
            this.svg.selectAll(".title-group text[data-i18n='general.untitled']")
                .text(window.i18n.translate("general.untitled"));
        }
        
        console.log('Tree drawing complete, translations applied'); */

        // Apply saved transform after any redraw (including search updates)
        if (this.pendingSavedTransform && !shouldUseSavedTransform) {
            console.log('Applying pending saved transform after redraw');
            this.isApplyingSavedTransform = true;
            const transform = d3.zoomIdentity
                .translate(this.pendingSavedTransform.x, this.pendingSavedTransform.y)
                .scale(this.pendingSavedTransform.k);
            this.svg.call(this.zoom.transform, transform);
            setTimeout(() => {
                this.isApplyingSavedTransform = false;
            }, 100);
        }
        
        // After drawing we want to add any activity indicators:
        eventBus.emit('treeRendered', this.container);
    }

    

    centerTree(bounds, minScale) {
        console.log('Centering tree in container');
        const initialScale = Math.max(minScale, Math.min(
            (this.containerWidth - this.margin.left - this.margin.right * 2) / bounds.width,
            (this.containerHeight - this.margin.top - this.margin.bottom * 2) / bounds.height,
            1
        ));
    
        const initialTransform = d3.zoomIdentity
            .translate(
                (this.containerWidth - bounds.width * initialScale) / 2 - bounds.x * initialScale,
                (this.containerHeight - bounds.height * initialScale) / 2 - bounds.y * initialScale
            )
            .scale(initialScale);
    
        this.svg.call(this.zoom.transform, initialTransform);
    }

    createLegend(d) {
        const self = this;
        
        //const gameTitle = data.title;
        const maxVotes = d.playerCount -1;
        const legendData = [
            { label: "legend.winner", type: "star"},
            { label: "legend.unread", type: "unread-heart" },
            { label: "legend.search", type: "search-match"},
            { label: "legend.text_in_progress", type: "ghost-heart" },
            { label: "legend.adding_note", type: "adding-note" },
            { label: "legend.votes", type: "vote-gradient", maxVotes: maxVotes } 
        ];
    
        const legend = self.svg.append("g")
            .attr("class", "legend")
            .classed("hidden", false)
            .attr("transform", `translate(${self.containerWidth - 130}, ${self.containerHeight - 295})`)
            .style("cursor", "pointer")
            .on("click", () => {
                self.toggleLegend();
            });


        // Add a background box to the legend
        const legendBoxPadding = 20;
        const legendBox = legend.append("rect")
            .attr("class", "legend-box")
            .attr("x", -legendBoxPadding)
            .attr("y", -legendBoxPadding)
            .attr("width", 145)  // Narrowed width for better fit
            .attr("height", legendData.length * 45 + legendBoxPadding * 2)  // Height accounts for all items
            .attr("fill", "floralwhite")  // Set to non-transparent background
            .attr("stroke", "black")  // Optional border around the box
            .attr("rx", 5)  // Rounded corners
            .attr("ry", 5); // Rounded corners


        const legendItems = legend.selectAll(".legend-item")
            .data(legendData)
            .enter().append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 45})`);  // Adjusted spacing to match height calculation

        legendItems.each(function(d) {
            const item = d3.select(this);
            if (d.type === "unread-heart") { 
                // Add heart path
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                item.append("path")
                    .attr("d", heartPath)
                    .attr("transform", "scale(0.3) translate(10, -20)")  // Adjust position as needed
                    .attr("class", "unread");
                    
                item.append("text")
                    .attr("x", 20)  // Adjusted x position
                    .attr("y", 5)
                    .attr("data-i18n", d.label)
                    .text(window.i18n ? window.i18n.translate(d.label) : d.label)
                    .style("font-size", "15px");
            } else if (d.type === "search-match") {
                // Add heart path
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                item.append("path")
                    .attr("d", heartPath)
                    .attr("transform", "scale(0.3) translate(10, -20)")  // Adjust position as needed
                    .attr("class", "search-match");
                    
                item.append("text")
                    .attr("x", 20)  // Adjusted x position
                    .attr("y", 5)
                    .attr("data-i18n", d.label)
                    .text(window.i18n ? window.i18n.translate(d.label) : d.label)
                    .style("font-size", "15px");
            } else if (d.type === "ghost-heart") {
                // Add ghost heart path
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                item.append("path")
                    .attr("d", heartPath)
                    .attr("transform", "scale(0.3) translate(10, -20)")  // Align with other hearts
                    .attr("class", "ghost-heart");
                    
                item.append("text")
                    .attr("x", 20)  // Aligned x position
                    .attr("y", 5)
                    .attr("data-i18n", d.label)
                    .text(window.i18n ? window.i18n.translate(d.label) : "text in progress")
                    .style("font-size", "15px");
            }
            else if (d.type === "vote-gradient") {
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                if (maxVotes <= 0) {
                    // Handle case with insufficient players - create multi-line text
                    item.append("text")
                        .attr("y", 5)
                        .attr("x", 50)
                        .attr("text-anchor", "middle")
                        .attr("data-i18n", "legend.not_enough_players_line1")
                        .style("font-size", "12px")
                        .append("tspan")
                        .text(window.i18n ? window.i18n.translate("legend.not_enough_players_line1") : "*Not enough")
                        .attr("x", 50)
                        .attr("dy", 0);
                        
                    item.append("text")
                        .attr("y", 20)
                        .attr("x", 50)
                        .attr("text-anchor", "middle")
                        .attr("data-i18n", "legend.not_enough_players_line2")
                        .style("font-size", "12px")
                        .append("tspan")
                        .text(window.i18n ? window.i18n.translate("legend.not_enough_players_line2") : "players for votes")
                        .attr("x", 50)
                        .attr("dy", 0);
                } else {
                    // Determine positions and vote values based on maxVotes
                    let positions, voteValues;
                    
                    if (maxVotes == 1) {
                        // Just two hearts for 0 and 1 vote
                        positions = [30, 70]; // Left and right positions
                        voteValues = [0, 1];
                    } else {
                        // Three hearts for 0, middle, and max votes
                        positions = [15, 50, 85]; // Left, middle, right positions
                        voteValues = [0, Math.floor(maxVotes / 2), maxVotes];
                    }
                    
                    const tickMarkOffset = -0.5; // Offset to shift tick marks left by 3 pixels
                    
                    positions.forEach((pos, index) => {
                        // Add heart for each position
                        item.append("path")
                            .attr("d", heartPath)
                            .attr("transform", `translate(${pos}, 10) scale(0.3)`)
                            .attr("fill", self.colorScale(voteValues[index]))
                            .attr("data-vote-count", voteValues[index])
                            .attr("stroke", "black")
                            .attr("stroke-width", 1);
                        
                        // Add vote count labels - moved further down
                        item.append("text")
                            .attr("x", pos + tickMarkOffset)
                            .attr("y", 40) // Increased from 35 to 45 for more space
                            .attr("text-anchor", "middle")
                            .text(voteValues[index])
                            .style("font-size", "12px")
                            .attr('data-tick-value', voteValues[index]);
                    });
                    
                    // Add title for the legend item
                    item.append("text")
                    .attr("x", 50)
                    .attr("y", 55) // Moved below the hearts and labels
                    .attr("text-anchor", "middle")
                    .attr("data-i18n", d.label)
                    .text(window.i18n ? window.i18n.translate(d.label) : d.label)
                    .style("font-size", "10px");
                }

              
            } else if(d.type === "star"){
                item.append("path")
                    .attr("d", d3.symbol().type(d3.symbolStar).size(100))  // Star with a size of 100
                    .attr("fill", self.baseColor)
                    .classed("star", true);  // Use gold color for the winner
                item.append("text")
                    .attr("x", 20)
                    .attr("y", 5)
                    .attr("data-i18n", d.label)
                    .text(window.i18n ? window.i18n.translate(d.label) : d.label)
                    .style("font-size", "15px");
            } else if (d.type === "adding-note") {
                // Draw a circle with the same class and animation
                item.append("circle")
                    .attr("cx", 2)
                    .attr("cy", 0)
                    .attr("r", 6)
                    .attr("class", "activity-dot adding-note");
                item.append("text")
                    .attr("x", 20)
                    .attr("y", 5)
                    .attr("data-i18n", d.label)
                    .text(window.i18n ? window.i18n.translate(d.label) : "Note in progress")
                    .style("font-size", "15px");
            }
        });

        // Add toggle button under the legend
        const toggleButton = self.svg.append("g")
            .attr("class", "legend-toggle")
            .attr("transform", `translate(${self.containerWidth  - 135}, ${self.containerHeight - 30})`)
            .style("cursor", "pointer")
            .style("display", "none") 
            .on("click", () => this.toggleLegend());

        toggleButton.append("rect")
            .attr("width", 90)
            .attr("height", 25)
            .attr("fill", "floralwhite")
            .attr("stroke", "black")
            .attr("rx", 5)
            .attr("ry", 5);

        toggleButton.append("text")
            .attr("x", 45)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .attr("data-i18n", "legend.show_legend")
            .text(window.i18n ? window.i18n.translate("legend.show_legend") : "Show Legend")
            .style("font-size", "14px")
            .style("fill", "black");

        // clicking on the legend will toggle it off
        const toggleLegend = legend.append("g")
            .attr("class", "legend-toggle")
            .attr("transform", `translate(0, ${legendData.length * 45 + legendBoxPadding})`)
            .style("cursor", "pointer")
            .on("click", () => this.toggleLegend());

/*         toggleLegend.append("rect")
            .attr("width", 90)
            .attr("height", 25)
            .attr("fill", "lightgray"); */
       
        this.legend = legend;
        this.legendToggle = toggleButton;

        // Set initial state
        this.updateLegendVisibility();
    }

    updateLegendPosition() {
        if (this.legend) {
            const newX = this.container.clientWidth - 130;
            const newY = this.container.clientHeight - 295;
            this.legend.attr("transform", `translate(${newX}, ${newY})`);
            
            // Update toggle button position
            const toggleX = this.container.clientWidth - 135;
            this.legendToggle.attr("transform", `translate(${toggleX}, ${this.container.clientHeight - 30})`);

            // Update visibility based on screen size
            this.updateLegendVisibility();
        }
    }

    updateLegendVisibility() {
        const isSmallScreen = this.isSmallScreen();

        if (!this.userToggledLegend) {
            // Only update if the user hasn't manually toggled
            this.legend.classed("hidden", isSmallScreen);
            this.legendToggle.style("display", isSmallScreen ? "block" : "none");
        }
    }
        
    showD3UnavailableMessage() {
        this.container.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h2 data-i18n="d3_visualization.unavailable_title">D3 Visualization Unavailable</h2>
                <p data-i18n="d3_visualization.unavailable_message">The D3 library could not be loaded. Please check your internet connection or contact the administrator.</p>
            </div>
        `;
        
        // Apply translations if i18n is available
        if (window.i18n) {
            const container = this.container;
            const elements = container.querySelectorAll('[data-i18n]');
            elements.forEach(element => {
                const key = element.getAttribute('data-i18n');
                element.textContent = window.i18n.translate(key);
            });
        }
    }

    toggleLegend() {
        const isVisible = !this.legend.classed("hidden");
        this.legend.classed("hidden", isVisible);

        // Hide the toggle button when the legend is visible
        this.legendToggle.style("display", isVisible ? "block" : "none");
        this.userToggledLegend = true;
    }

    isSmallScreen() {
        return this.container.clientWidth < 550;
    }

    handleResize() {
        if (this.svg && this.zoom) {
            const oldWidth = this.containerWidth;
            const oldHeight = this.containerHeight;

            // Update container dimensions
            this.containerWidth = this.container.clientWidth;
            this.containerHeight = this.container.clientHeight;

            // Update SVG dimensions
            this.svg
                .attr("width", this.containerWidth)
                .attr("height", this.containerHeight);

            // Get the current transform
            const transform = d3.zoomTransform(this.svg.node());

            // Calculate the center point of the old view
            const oldCenterX = oldWidth / 2;
            const oldCenterY = oldHeight / 2;

            // Calculate the new center point
            const newCenterX = this.containerWidth / 2;
            const newCenterY = this.containerHeight / 2;

            // Calculate the difference in center points
            const dx = newCenterX - oldCenterX;
            const dy = newCenterY - oldCenterY;

            // Create a new transform that maintains the center point
            const newTransform = d3.zoomIdentity
                .translate(transform.x + dx, transform.y + dy)
                .scale(transform.k);

            // Apply the new transform
            this.svg.call(this.zoom.transform, newTransform);

            // Update the zoom extent
            this.zoom.extent([[0, 0], [this.containerWidth, this.containerHeight]]);

            // Update legend position
            this.updateLegendPosition();
        }
    }

    //TODO: when should I call this? 
    cleanup() {
        window.removeEventListener('resize', this.handleResize);
    }

    updateStyles(container, scale) {
        // Cache calculations that don't change per node
        const titleFontSize = this.calculateFontSize(scale, 'title');
        const authorFontSize = this.calculateFontSize(scale, 'author');
        const authorVisibility = this.calculateAuthorVisibility(scale);
        const searchTerm = this.dataManager.getSearch();
        
        container.selectAll(".node").each((d, i, nodes) => {
            if (!d || !d.data) {
                console.error('Node data is undefined:', d);
                return;
            }
            const node = d3.select(nodes[i]);
            const titleGroup = node.select(".title-group");
            const author = node.select(".text-by");

            // Only update title if font size changed significantly (avoid expensive DOM operations)
            const currentFontSize = parseFloat(titleGroup.select("text").style("font-size")) || 0;
            if (Math.abs(currentFontSize - titleFontSize) > 1) {
                const titleBottomPosition = this.updateTitle(
                    titleGroup, 
                    d => d.data.title || (window.i18n ? window.i18n.translate("general.untitled") : "Untitled"), 
                    titleFontSize
                );
                
                // Update author position based on new title
                author.attr("dy", `${titleBottomPosition + this.config.titleAuthorSpacing}px`);
            }

            // Update author styles (these are less expensive)
            author
                .style("font-size", `${authorFontSize}px`)
                .style("opacity", authorVisibility);
            
            // Only update author text if font size changed significantly
            const currentAuthorFontSize = parseFloat(author.style("font-size")) || 0;
            if (Math.abs(currentAuthorFontSize - authorFontSize) > 1) {
                author.text(d => this.formatAuthorName(d.data, authorFontSize));
            }
            
            // Skip search highlighting during zoom for performance
            // It will be reapplied when zoom ends
        });
    }
    
    calculateFontSize(scale, type) {
        const { min, max } = this.config.fontSize[type];
        const { zoomThreshold } = this.config.fontSize;
        
        if (scale >= zoomThreshold) {
            return min + (max - min) * ((scale - zoomThreshold) / (1 - zoomThreshold));
        } else {
            // Inverse scaling for zooming out
            return max - (max - min) * ((zoomThreshold - scale) / zoomThreshold);
        }
    }
    
    calculateAuthorVisibility(scale) {
        // Adjust these values as needed
        const { fadeOutStart, fadeOutEnd } = this.config.authorVisibility;
        return Math.min(1, Math.max(0, (scale - fadeOutEnd) / (fadeOutStart - fadeOutEnd)));
    }
    
    truncateText(text, fontSize, maxWidth) {
        const charWidth = fontSize * 0.6; // Approximate width of a character
        const maxChars = Math.floor(maxWidth / charWidth);
        
        if (text.length > maxChars) {
            return text.slice(0, maxChars - 3) + '...';
        }
        return text;
    }
    
    formatAuthorName(data, fontSize) {
        if (data.permissions.isMyText) {
            if (data.text_status == 'draft' || data.text_status == 'incomplete_draft') {
                // For drafts: "your DRAFT"
                const yourText = window.i18n ? window.i18n.translate("note-edit.your") + ' ' : 'your ';
                const draftText = window.i18n ? window.i18n.translate("general.draft") : 'DRAFT';
                return `${yourText}${draftText}`;
            } else {
                // For completed texts: "by you"
                return window.i18n ? window.i18n.translate("general.by_you") : 'by you';
            }
        }

        // Special handling for ghost nodes
        if (data.isGhost) {
            const ghostNameArea = window.i18n ? window.i18n.translate("tree.ghost_name_area") : 'someone types...';
            return `${ghostNameArea}`;
        }
    
        const names = `${data.firstName} ${data.lastName}`.split(' ');
        let formattedName = '';
    
        if (names.length > 1) {
            // Keep the last name, initialize others
            for (let i = 0; i < names.length - 1; i++) {
                formattedName += names[i][0] + '. ';
            }
            formattedName += this.truncateText(names[names.length - 1], fontSize, this.config.authorMaxWidth); // Truncate last name if too long
        } else {
            formattedName = this.truncateText(names[0], fontSize, this.config.authorMaxWidth);
        }
    
        const byText = window.i18n ? window.i18n.translate("general.by") : 'by';
        return `${byText} ${formattedName}`;
    }

    updateTitle(titleGroup, titleOrAccessor, fontSize) {
        titleGroup.selectAll("*").remove();  // Clear existing title

        // Safely get the data from the titleGroup's parent node without calling datum()
        let nodeData = null;
        try {
            const parentNode = titleGroup.node()?.parentNode;
            if (parentNode && parentNode.__data__) {
                nodeData = parentNode.__data__;
            }
        } catch (e) {
            // If we can't access the data safely, nodeData remains null
            console.warn('Could not access node data for title update:', e);
        }
        
        const title = typeof titleOrAccessor === 'function' 
            ? (nodeData ? titleOrAccessor(nodeData) : '?')
            : titleOrAccessor;

        const words = title.split(/\s+/);
        let lines = [""];
        let lineNumber = 0;
        const lineHeight = fontSize * this.config.titleLineHeight;
        
        words.forEach(word => {
            let testLine = lines[lineNumber] + (lines[lineNumber] ? " " : "") + word;
            let testWidth = this.getTextWidth(testLine, fontSize);
            
            if (testWidth > this.config.titleMaxWidth && lines[lineNumber].length > 0) {
                if (lineNumber < this.config.titleMaxLines - 1) {
                    lineNumber++;
                    lines[lineNumber] = word;
                } else {
                    // Truncate the line and add ellipsis
                    while (testWidth > this.config.titleMaxWidth && testLine.length > 3) {
                        testLine = testLine.slice(0, -1);
                        testWidth = this.getTextWidth(testLine + "...", fontSize);
                    }
                    lines[lineNumber] = testLine + "...";
                    return;  // Break the loop if we've reached max lines
                }
            } else {
                lines[lineNumber] = testLine;
            }
        });

        lines.forEach((line, i) => {
            const textEl = titleGroup.append("text")
                .attr("dy", `${i * lineHeight}px`)
                .attr("x", nodeData && nodeData.children ? -13 : 13)
                .style("text-anchor", nodeData && nodeData.children ? "end" : "start")
                .style("font-size", `${fontSize}px`);
            
            // Add status-based classes to title text (only for draft and published_late - published uses default styling)
            if (nodeData && nodeData.data) {
                const status = nodeData.data.text_status;
                if (status == 'draft' || status == 'incomplete_draft') {
                    textEl.classed('tree-title-draft', true);
                } else if (status == 'published_late') {
                    textEl.classed('tree-title-published-late', true);
                }
            }
                
            // Add data-i18n attribute for translatable titles
            if (title === window.i18n?.translate("general.untitled") || title === "Untitled") {
                textEl.attr("data-i18n", "general.untitled");
            } else if (title === window.i18n?.translate("tree.ghost_title") || title === "click clack" || title === "tac tac") {
                textEl.attr("data-i18n", "tree.ghost_title");
            }
            
            textEl.text(line);
        });

        // Return the bottom position of the last line
        return (lines.length * lineHeight);
    }

    getTextWidth(text, fontSize) {
        // This is an approximation. For more accuracy, you might want to use canvas or SVG to measure text width
        return text.length * fontSize * 0.6;
    }

    updateTree() {
        // Add defensive check for null or undefined treeData
        if (!this.treeData) {
            console.warn('No tree data available for tree visualization');
            return;
        }
        
        // Check if this.svg exists - if not, the tree view is not active
        if (!this.svg) {
            console.warn('Tree visualization not initialized (this.svg is null) - likely not in tree view mode');
            return;
        }
        
        // Recalculate the layout
        const treeDataToUse = this.treeData.data || this.treeData;
        
        console.log('Using treeDataToUse structure:', Object.keys(treeDataToUse));
        const root = d3.hierarchy(treeDataToUse, d => d.children);

        console.log('this.treeData: ', this.treeData);

         // Get search results from the data manager
        const searchResults = this.dataManager.getSearchResults() || { nodes: {} };
        console.log('searchResults were retrieved by the treeVisualizer on updateTree: ', searchResults);

        // Calculate maxDepth and depthCounts
        const maxDepth = d3.max(root.descendants(), d => d.depth);

        const depthCounts = {};
        root.each(d => {
            if (!depthCounts[d.depth]) {
                depthCounts[d.depth] = 0;
            }
            depthCounts[d.depth]++;
        });

        const maxNodesAtDepth = Math.max(...Object.values(depthCounts));
        const requiredWidth = maxDepth * this.minSpacing;
        const requiredHeight = maxNodesAtDepth * this.minSpacing;

        // Apply the same tree layout configuration
        const treeLayout = d3.tree()
            .size([requiredHeight, requiredWidth])
            .separation((a, b) => a.parent === b.parent ? 1 : 2);

        treeLayout(root);

        // Center the tree vertically within the container
        const offsetY = (this.containerHeight - requiredHeight) / 2;

        // Adjust the position of the nodes based on the root's position
        root.each(d => {
            d.x += offsetY;
        });

        // Get a stable color scale
        const colorScale = this.colorScale;
        const baseColor = this.baseColor;

        // Select the inner <g> where nodes and links are drawn
        const innerG = this.svg.select("g").select("g");

        // Update nodes
        const nodes = innerG.selectAll(".node")
            .data(root.descendants(), d => d.data.id);

        // Enter new nodes
        const nodeEnter = nodes.enter().append("g")
            .attr("class", d => {
                let classes = `node${d.children ? " node--internal" : " node--leaf"}`;
                if (d.data.isGhost) {
                    classes += " node--ghost";
                }
                return classes;
            })
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .on("click", (event, d) => {
                if (!d.data.isGhost) {  // Only allow clicks on non-ghost nodes
                    const customEvent = new CustomEvent('showStoryInModalRequest', {
                        detail: { id: d.data.id }
                    });
                    document.dispatchEvent(customEvent);
                }
            });

        // Append elements to new nodes
        nodeEnter.each(function(d) {
            const item = d3.select(this);
            
            // Debug permissions for each node with defensive check
            if (!d || !d.data) {
                console.error("Node missing data object:", d);
                return; // Skip processing this node
            }
            
            if (!d.data.id) {
                console.error("Node missing ID:", d);
            }
            
            if (!d.data.permissions) {
                console.error("Node missing permissions for ID:", d.data.id, d.data);
                // Initialize permissions if missing to prevent errors
                d.data.permissions = {
                    canEdit: false,
                    canAddNote: false,
                    canDelete: false,
                    canIterate: false,
                    canPublish: false,
                    canVote: false,
                    isMyText: false
                };
            } else {
                console.log("Node permissions for ID " + d.data.id + ":", d.data.permissions);
            }
            
            // Remaining code with defensive checks...
            if (d.data.isGhost) {
                // Create ghost heart with pulsing animation
                const ghostHeartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                const ghostHeart = item.append("path")
                    .attr("d", ghostHeartPath)
                    .attr("transform", "scale(0.4) translate(0, -15)")
                    .attr("class", "ghost-heart");
                
                // Debug: Log that we created a ghost heart
                console.log('👻 Created ghost heart for node:', d.data.id);
            } else if (d.data.isWinner) {
                item.append("path")
                    .attr("d", d3.symbol().type(d3.symbolStar).size(200))
                    .attr('class', d => d.data && d.data.text_seen == 1 ? 'star read' : 'star unread')
                    .attr('data-id', d => d.data ? d.data.id : null)
                    .attr("fill", baseColor);
            } else {
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                item.append("path")
                    .attr("d", heartPath)
                    .attr("transform", "scale(0.4) translate(0, -15)")
                    .attr('class', d => {
                        if (!d.data) return 'unread';
                        
                        let classes = `${d.data.text_seen == 1 ? 'read' : 'unread'}`;
                        
                        // Add status-based classes
                        if (d.data.text_status == 'draft' || d.data.text_status == 'incomplete_draft') {
                            classes += ' tree-node-draft';
                        } else if (d.data.text_status == 'published_late') {
                            classes += ' tree-node-published-late';
                        } else if (d.data.text_status == 'published') {
                            classes += ' tree-node-published';
                        }
                        
                        // Add search-match class if applicable
                        if (this.dataManager && this.dataManager.getSearch() && 
                            searchResults.nodes && 
                            d.data.id && 
                            searchResults.nodes[d.data.id]) {
                            const nodeData = searchResults.nodes[d.data.id];
                            if (nodeData.writingMatches || nodeData.noteMatches) {
                                classes += " search-match";
                            }
                        }
                        
                        return classes.trim();
                    })
                    .attr('data-id', d => d.data ? d.data.id : null)
                    .attr('data-vote-count', d => d.data ? d.data.voteCount : 0)
                    .attr('fill', d => d.data ? colorScale(d.data.voteCount) : baseColor);
            }
        });

        // Add the title
        const titleGroup = nodeEnter.append("g")
            .attr("class", "title-group")
            .attr("transform", "translate(0, -10)");

        const titleBottomPosition = this.updateTitle(titleGroup, d => {
            // Special handling for ghost nodes
            if (d.data.isGhost) {
                return window.i18n ? window.i18n.translate("tree.ghost_title") : "click clack";
            }
            // Regular nodes - use their title or fallback to untitled
            return d.data.title || (window.i18n ? window.i18n.translate("general.untitled") : "Untitled");
        }, this.config.fontSize.title.max);

        // Add the author name, positioned below the title
        nodeEnter.append("text")
            .attr("dy", `${titleBottomPosition + this.config.titleAuthorSpacing}px`)
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .attr("class", d => {
                // Add defensive check before accessing permissions
                if (!d.data || !d.data.permissions) {
                    console.warn("Missing permissions data for node:", d);
                    return "text-by"; // Default class
                }
                return d.data.permissions.isMyText ? "text-by author" : "text-by";
            })
            .attr("data-i18n", d => {
                // Add data-i18n attribute for ghost nodes to enable dynamic translation
                if (d.data && d.data.isGhost) {
                    return "tree.ghost_name_area";
                }
                return null;
            })
            .text(d => {
                // Add defensive check before formatting author name
                if (!d.data) {
                    console.warn("Missing data for author text:", d);
                    return "Unknown";
                }
                return this.formatAuthorName(d.data);
            });

        // Update existing nodes
        nodes.transition().duration(750)
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .each(function(d) {
                // Check if d.data is properly defined for debugging
                if (!d || !d.data) {
                    console.error("Invalid node data during transition:", d);
                    return; // Skip processing this node
                }

                const node = d3.select(this);
                // Calculate new x position based on text-anchor change
                const newX = d.children ? -13 : 13;
                
                // Update title text with transition
                node.selectAll(".title-group text")
                    .transition().duration(750)
                    .attr("x", newX)
                    .style("text-anchor", d.children ? "end" : "start");
        
                // Update author text
                node.select("text.text-by")
                    .transition().duration(750)
                    .attr("x", newX)
                    .style("text-anchor", d.children ? "end" : "start");
            });

        // Remove old nodes
        nodes.exit().remove();

        // Update links
        const links = innerG.selectAll(".link")
            .data(root.links(), d => {
                if (!d.target || !d.target.data) {
                    //console.warn('Skipping link for node without target:', d);
                    return; // Return a default path or handle the error
                }else{
                    /* console.log('Link Data:', d); */
                }
                return d.target.data.id;
            })

        // Enter new links
        links.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", d => {
            if (!d.target || !d.target.data) {
                console.warn('Skipping link for node without target:', d);
                return; // Return a default path or handle the error
            }
            return `M${d.source.y},${d.source.x}
                C${(d.source.y + d.target.y) / 2},${d.source.x}
                ${(d.source.y + d.target.y) / 2},${d.target.x}
                ${d.target.y},${d.target.x}`;
        });

        // Update existing links
        links.transition().duration(750)
            .attr("d", d => {
            return `M${d.source.y},${d.source.x}
                C${(d.source.y + d.target.y) / 2},${d.source.x}
                ${(d.source.y + d.target.y) / 2},${d.target.x}
                ${d.target.y},${d.target.x}`;
        });

        // Remove old links
        links.exit().remove();
        this.handleResize();
    }

    updateZoomConstraints() {
        const bounds = this.svg.node().getBBox();
        const minScale = Math.min(this.containerWidth / bounds.width, this.containerHeight / bounds.height);
    
        this.zoom.scaleExtent([minScale, this.maxScale]);
        this.svg.call(this.zoom);
    }

    handleTitleUpdate({ nodeId, title }) {
        // Select the inner <g> where nodes are drawn
        const innerG = this.svg.select("g").select("g");
        console.log("TITLE UPDATE", nodeId, title);
        
        // Find the node group and title group using D3's selection methods
        const nodeGroup = innerG.selectAll(".node")
            .filter(d => d.data.id === nodeId);
        const titleGroup = nodeGroup.select('.title-group');

        if (!titleGroup.empty()) {
            // Get current zoom scale to calculate proper font size
            const transform = d3.zoomTransform(this.svg.node());
            const scale = transform.k;
            const fontSize = this.calculateFontSize(scale, 'title');

            // Create a title accessor function that returns the new title with proper i18n
            const titleAccessor = () => title || (window.i18n ? window.i18n.translate("general.untitled") : "Untitled");

            // Update the title using the existing updateTitle method
            const titleBottomPosition = this.updateTitle(titleGroup, titleAccessor, fontSize);

            // Update author position based on new title position
            nodeGroup.select("text.text-by")
                .attr("dy", `${titleBottomPosition + this.config.titleAuthorSpacing}px`);
        }
    }

    // Add new method to handle search matches
    applySearchMatches() {
        console.log('ENTER applySearchMatches');
        const searchTerm = this.dataManager.getSearch();
        console.log('SEARCH TERM:', searchTerm);
        const searchResults = this.dataManager.getSearchResults();
        console.log('SEARCH RESULTS:', searchResults);
        //console.log('Search results structure:', JSON.stringify(searchResults, null, 2));

        if (!searchTerm || !searchResults || !searchResults.nodes) {
            console.log('Exiting early - missing data:', {
                searchTerm,
                hasSearchResults: !!searchResults,
                hasNodes: searchResults?.nodes
            });
            return;
        }

        console.log('Applying search matches to tree:', searchResults);

        // Select all node paths
        const nodes = this.svg.selectAll('.node path');
        
        nodes.each(function(d) {
            const node = d3.select(this);
            const nodeId = node.attr('data-id');
            
            if (searchResults.nodes[nodeId]) {
                const nodeData = searchResults.nodes[nodeId];
                if (nodeData.writingMatches || nodeData.noteMatches) {
                    node.classed('search-match', true);
                }
            }
        });

        // Apply title highlights only to nodes that have title/writer matches
        this.svg.selectAll('.node').each((d) => {
            const nodeId = String(d.data.id);
            const nodeData = searchResults.nodes[nodeId];
            
            if (nodeData && (nodeData.titleMatches || nodeData.writerMatches)) {
                this.handleTitleHighlight(d.data.id, searchTerm, true);
            }
        });
    }

    handleTitleHighlight(nodeId, searchTerm, shouldHighlight = true) {
        // Ensure we have a container
        if (!this.container) {
            console.warn('Container not available for highlighting');
            return;
        }

        // Convert nodeId to string for consistent comparison
        const id = String(nodeId);
        
        // Use CSS.escape to properly handle the selector
        const selector = `.node path[data-id="${id}"]`;
        const node = this.container.querySelector(selector);

        if (!node) {
            console.warn(`Node not found for ID: ${id}`);
            return;
        }

        const innerG = this.svg.select("g").select("g");
        const nodeGroup = innerG.selectAll(".node")
            .filter(d => d.data.id === nodeId);

        // Check if we found the node
        if (nodeGroup.empty()) {
            console.log("Node not found for ID:", nodeId);
            return;
        }

        //console.log('Highlighting title for node:', nodeId, 'with term:', searchTerm, 'found node:', !nodeGroup.empty());

        // Handle title text
        const titleGroup = nodeGroup.select('.title-group');
        if (!titleGroup.empty()) {
            const titleTexts = titleGroup.selectAll("text");
            if (!titleTexts.empty()) {
                if (shouldHighlight) {
                    // Get original title from node data (source of truth)
                    const nodeData = nodeGroup.datum();
                    const originalTitle = nodeData.data.title || (window.i18n ? window.i18n.translate("general.untitled") : "Untitled");
                    
                    // Collect text elements for highlighting distribution
                    const textNodes = [];
                    titleTexts.each(function() {
                        const text = d3.select(this);
                        if (!text.node()) return;
                        textNodes.push({ element: text, text: text.text() });
                    });
                    
                    // Apply highlighting (we already know matches exist from caller)
                    this.highlightAcrossMultipleLines(textNodes, searchTerm, originalTitle);
                } else {
                    // Reset to original text without highlighting
                    titleTexts.each(function() {
                        const text = d3.select(this);
                        if (!text.node()) return;
                        
                        // Remove all tspans and get back to clean text
                        const originalText = text.text();
                        text.selectAll('tspan').remove();
                        text.text(originalText);
                    });
                }
            }
        }

        // Handle author text (existing logic unchanged)
        const authorText = nodeGroup.select("text.text-by");

        if (!authorText.empty() && authorText.node()) {
            // Skip further processing if there are already tspans (which indicates it's been processed)
            // This prevents double translation of "by" to "by par"
            if (authorText.selectAll("tspan").size() > 0 && !shouldHighlight) {
                return;
            }
            
            const originalText = authorText.text();
            
            // Get the node data to check permissions and full name
            const nodeGroup = d3.select(authorText.node().parentNode);
            const nodeData = nodeGroup.datum();
            
            if (nodeData.data.permissions.isMyText) {
                // Special handling for "by you" with name matching
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                const firstName = nodeData.data.firstName || '';
                const lastName = nodeData.data.lastName || '';
                
                // Check if search matches either first or last name
                const nameMatch = firstName.match(regex) || lastName.match(regex);
                
                if (nameMatch && shouldHighlight) {
                    authorText.text(''); // Clear existing text
                    // Use the correct translation directly here
                    const byText = window.i18n ? window.i18n.translate("general.by") : 'by';
                    authorText.append('tspan')
                        .text(`${byText} `);
                    authorText.append('tspan')
                        .attr('class', 'search-highlight')
                        .text('you');
                } else {
                    // Simply reset without reformatting to prevent double prefixes
                    authorText.text(originalText);
                }
            } else if (shouldHighlight) {
                const regex = new RegExp(`(${searchTerm})`, 'gi');
                
                // Get full names from data
                const firstName = nodeData.data.firstName || '';
                const lastName = nodeData.data.lastName || '';
                
                // Extract the translated "by" part properly
                const byText = window.i18n ? window.i18n.translate("general.by") : 'by';
                
                // Get displayed text (correctly handling the translated prefix)
                const displayedText = originalText.replace(new RegExp(`^${byText}\\s+`), '');
                const [initial, ...lastNameParts] = displayedText.split(' ');
                const displayedLastName = lastNameParts.join(' ');
                
                authorText.text(''); // Clear existing text
                authorText.append('tspan')
                    .text(`${byText} `);
                
                // Check if search matches full first name
                const firstNameMatch = firstName.match(regex);
                
                // Add initial with highlighting if full first name matches
                if (firstNameMatch) {
                    authorText.append('tspan')
                        .attr('class', 'search-highlight')
                        .text(initial);
                } else {
                    authorText.append('tspan')
                        .text(initial);
                }
                
                // Add space
                authorText.append('tspan').text(' ');
                
                // Handle last name with normal string matching
                if (regex.test(displayedLastName)) {
                    const parts = displayedLastName.split(regex);
                    parts.forEach(part => {
                        if (regex.test(part)) {
                            authorText.append('tspan')
                                .attr('class', 'search-highlight')
                                .text(part);
                        } else {
                            authorText.append('tspan').text(part);
                        }
                    });
                } else {
                    authorText.append('tspan').text(displayedLastName);
                }
            } else {
                // Properly get the formatted author name rather than manipulating the existing text
                // This ensures we get the correct translation
                const authorName = this.formatAuthorName(nodeData.data);
                authorText.text(authorName);
            }
        }
    }

    /**
     * Highlight search terms across multiple text lines
     * This handles the complex case where search terms span line breaks
     */
    highlightAcrossMultipleLines(textNodes, searchTerm, originalTitle) {
        const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedSearchTerm})`, 'gi');
        
        // Step 1: Find all matches in the original title
        const matches = [];
        let match;
        while ((match = regex.exec(originalTitle)) !== null) {
            matches.push({
                start: match.index,
                end: match.index + match[0].length
            });
            // Prevent infinite loop on zero-length matches
            if (match.index === regex.lastIndex) {
                regex.lastIndex++;
            }
        }
        
        if (matches.length === 0) return;
        
        // Step 2: Map each line's position in the reconstructed title
        let position = 0;
        const lineInfo = textNodes.map(({ element, text }) => {
            const lineStart = position;
            const lineEnd = position + text.length;
            position += text.length + 1; // +1 for space between lines
            return { element, text, start: lineStart, end: lineEnd };
        });
        
        // Step 3: For each line, find which matches overlap with it
        lineInfo.forEach(line => {
            const overlappingMatches = matches.filter(match => 
                match.start < line.end && match.end > line.start
            );
            
            if (overlappingMatches.length > 0) {
                // This line has matches, rebuild it with highlighting
                line.element.text('');
                
                let currentPos = 0;
                overlappingMatches.forEach(match => {
                    // Calculate positions within this line
                    const matchStart = Math.max(0, match.start - line.start);
                    const matchEnd = Math.min(line.text.length, match.end - line.start);
                    
                    // Add text before match
                    if (matchStart > currentPos) {
                        line.element.append('tspan')
                            .text(line.text.substring(currentPos, matchStart));
                    }
                    
                    // Add highlighted match
                    if (matchEnd > matchStart) {
                        line.element.append('tspan')
                            .attr('class', 'search-highlight')
                            .text(line.text.substring(matchStart, matchEnd));
                    }
                    
                    currentPos = matchEnd;
                });
                
                // Add remaining text after last match
                if (currentPos < line.text.length) {
                    line.element.append('tspan')
                        .text(line.text.substring(currentPos));
                }
            }
        });
    }


    // New method to handle language changes
    handleLanguageChange() {
        if (!this.svg || !this.treeData) {
            console.log('SVG or tree data not available');
            return;
        }
        
        console.log('Updating tree after language change');
        
        try {
            // Update translations for node titles
            this.svg.selectAll(".title-group text[data-i18n='general.untitled']")
                .text(window.i18n ? window.i18n.translate("general.untitled") : "Untitled");
            
            // Update translations for ghost node titles
            this.svg.selectAll(".title-group text[data-i18n='tree.ghost_title']")
                .text(window.i18n ? window.i18n.translate("tree.ghost_title") : "click clack");
            
            // Update translations for author nodes - use the formatAuthorName method for consistency
            const self = this;
            this.svg.selectAll(".text-by")
                .each(function(data) {
                    const element = d3.select(this);
                    
                    // Only update if we have valid data
                    if (data && data.data) {
                        // Use the formatAuthorName method to get the properly translated text
                        // This will handle ghost nodes, regular nodes, and "by you" texts correctly
                        const authorText = self.formatAuthorName(data.data);
                        element.text(authorText);
                    }
                });
        } catch (error) {
            console.error('Error updating tree after language change:', error);
        }
    }

    setTreeData(data) {
        this.treeData = data;
        // Optionally trigger necessary updates
    }

    getTreeData() {
        return this.treeData;
    }
}

