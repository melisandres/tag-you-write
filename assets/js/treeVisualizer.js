//import * as d3 from 'https://d3js.org/d3.v7.min.js';

export class TreeVisualizer {
    constructor() {
        this.svg = null;

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

        // Store instance globally
        window.treeVisualizerInstance = this;
    }
    
    handleDrawTree({ container, data }) {
        this.container = container;
        this.drawTree(data);
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
        //console.log("colorScale",this.colorScale)
        d3.select(node).select('circle')
            .attr('fill', this.colorScale(voteCount))
            .attr('data-vote-count', d => d.data.voteCount);
    }
  
    drawTree(data) {
        console.log('Tree data received:', data);
        // Check if D3 is available
        if (typeof d3 === 'undefined') {
            this.showD3UnavailableMessage();
            return;
        }

        // Clear any existing content
        this.container.innerHTML = ''; 
        this.container.classList.add("with-tree");
        this.container.dataset.showcase = 'tree';

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
  
        const g = this.svg.append("g")
  
        // To correct the stutter of the tree when it is zoomed out and dragged, append a "g" to the original "g".
        const child = g.append("g");
  
        // Transform data using D3 hierarchy
        const root = d3.hierarchy(data, d => d.children);

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
            .attr("class", d => `node${d.children ? " node--internal" : " node--leaf"}`)
            .attr("transform", d => `translate(${d.y},${d.x})`)
            .on("click", (event, d) => {
                const customEvent = new CustomEvent('showStoryInModalRequest', {
                    detail: { id: d.data.id }
                });
                document.dispatchEvent(customEvent);
            });
  
        const colorScale = this.colorScale;
        const baseColor = this.baseColor;

        node.each(function(d) {
            const item = d3.select(this);
            if (d.data.isWinner) {
                item.append("path")
                    .attr("d", d3.symbol().type(d3.symbolStar).size(200))  // Use star for winner
                    .attr('class', d => d.data.text_seen == 1 ? 'star read' : 'star unread')  // Add class based on condition
                    .attr('data-id', d => d.data.id)  // Add data-set for text id
                    .attr("fill", baseColor);  // Star color for winner
            } else {
                // Replace circle with heart
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                item.append("path")
                    .attr("d", heartPath)
                    .attr("transform", "scale(0.4) translate(0, -15)")  // Adjusted translation to center the heart
                    .attr('class', d => {
                        // Concatenate multiple classes based on conditions
                        let classes = `${d.data.text_seen == 1 ? 'read' : 'unread'}`;
                        classes += ` ${d.data.text_status == 'draft' || d.data.text_status == 'incomplete_draft' ? 'tree-node-draft' : ''}`; 
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

        const titleBottomPosition = this.updateTitle(titleGroup, d => d.data.title || "Untitled", this.config.fontSize.title.max);

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

                // Update styles based on zoom level
                this.updateStyles(child, transform.k);
            });

        // Store the zoom behavior
        this.zoom = zoom;

        // Apply zoom to SVG
        this.svg.call(this.zoom);
        
        // Check for saved state
        const savedState = JSON.parse(localStorage.getItem('pageState'));
        
        // Only apply initial transform if we're not restoring from GameListRenderer
        if (!window.skipInitialTreeTransform) {
            if (savedState?.showcase?.type === 'tree'
                && savedState.showcase.transform 
                && this.pageJustLoaded) {
                // Apply saved transform
                const transform = savedState.transform;
                const initialTransform = d3.zoomIdentity
                    .translate(transform.x, transform.y)
                    .scale(transform.k);
                
                this.svg.call(this.zoom.transform, initialTransform);
            } else {
                // Calculate and apply initial transform as before
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
        }

        // The Legend
        this.createLegend(data);   

        if (this.pageJustLoaded) {
            console.log('pageJustLoaded is getting set to false');
            this.pageJustLoaded = false;
        }
    }

    createLegend(d) {
        const self = this;
        
        //console.log(d);
        //const gameTitle = data.title;
        const maxVotes = d.playerCount -1;
        const legendData = [
            { label: "Winner", type: "star"},
            { label: "Unread", type: "unread-heart" },
            { label: "# of votes", type: "vote-gradient", maxVotes: maxVotes }
        ];
    
        const legend = self.svg.append("g")
            .attr("class", "legend")
            .classed("hidden", false)
            .attr("transform", `translate(${self.containerWidth - 112}, ${self.containerHeight - 137})`)
            .style("cursor", "pointer")
            .on("click", () => {
                console.log('Legend clicked');
                self.toggleLegend();
            });


        // Add a background box to the legend
        const legendBoxPadding = 20;
        const legendBox = legend.append("rect")
            .attr("class", "legend-box")
            .attr("x", -legendBoxPadding)
            .attr("y", -legendBoxPadding)
            .attr("width", 130)  // Adjust width based on content
            .attr("height", legendData.length * 45 + legendBoxPadding)  // Height based on the number of items
            .attr("fill", "floralwhite")  // Set to non-transparent background
            .attr("stroke", "black")  // Optional border around the box
            .attr("rx", 5)  // Rounded corners
            .attr("ry", 5) // Rounded corners
            ; 


        const legendItems = legend.selectAll(".legend-item")
            .data(legendData)
            .enter().append("g")
            .attr("class", "legend-item")
            .attr("transform", (d, i) => `translate(0, ${i * 45})`);  // Stack vertically

        legendItems.each(function(d) {
            const item = d3.select(this);
            if (d.type === "unread-heart") {  // Changed from "unread-circle"
                // Add heart path
                const heartPath = "m -10,-9 c -6.57,-7.05 -17.14,-7.05 -23.71,0 -6.56,7.05 -6.56,18.39 0,25.45 l 29.06,31.27 29.09,-31.23 c 6.57,-7.05 6.57,-18.4 0,-25.45 -6.57,-7.05 -17.14,-7.05 -23.71,0 l -5.35,5.75 -5.39,-5.78 z";
                
                item.append("path")
                    .attr("d", heartPath)
                    .attr("transform", "scale(0.3) translate(10, -20)")  // Adjust position as needed
                    .attr("class", "unread");
                    
                item.append("text")
                    .attr("x", 20)  // Adjusted x position
                    .attr("y", 5)
                    .text(d.label)
                    .style("font-size", "15px");
            } else if (d.type === "vote-gradient") {
                const gradientId = "vote-gradient";
                const gradient = self.svg.append("defs")
                    .append("linearGradient")
                    .attr("id", gradientId)
                    .attr("x1", "0%")
                    .attr("x2", "100%");

                gradient.append("stop")
                    .attr("offset", "0%")
                    .attr("stop-color", self.colorScale(0));

                gradient.append("stop")
                    .attr("offset", "100%")
                    .attr("stop-color", self.colorScale(maxVotes));

                item.append("rect")
                    .attr("width", 100)
                    .attr("height", 20)
                    .attr("fill", `url(#${gradientId})`);

                // Add tick marks
                const tickValues = [0, Math.floor(maxVotes / 2), maxVotes];
                tickValues.forEach((value, index) => {
                    item.append("line")
                        .attr("x1", index * 50)
                        .attr("x2", index * 50)
                        .attr("y1", 20)
                        .attr("y2", 25)
                        .attr("stroke", "black");
                    
                    item.append("text")
                        .attr("x", index * 50)
                        .attr("y", 35)
                        .attr("text-anchor", "middle")
                        .text(value)
                        .style("font-size", "12px")
                        .attr('data-tick-value', value);
                        
                });


                item.append("text")
                    .attr("x", 50)
                    .attr("y", -5)
                    .attr("text-anchor", "middle")
                    .text(d.label)
                    .style("font-size", "15px");

            }else if(d.type === "star"){
                item.append("path")
                    .attr("d", d3.symbol().type(d3.symbolStar).size(100))  // Star with a size of 100
                    .attr("fill", self.baseColor)
                    .classed("star", true);  // Use gold color for the winner
                item.append("text")
                    .attr("x", 20)
                    .attr("y", 5)
                    .text(d.label)
                    .style("font-size", "15px");
            }  
        });

        // Add toggle button under the legend
        const toggleButton = self.svg.append("g")
            .attr("class", "legend-toggle")
            .attr("transform", `translate(${self.containerWidth  - 95}, ${self.containerHeight - 30})`)
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
            .text("Show Legend")
            .style("font-size", "14px")
            .style("fill", "black");

        // clicking on the legend will toggle it off
        const toggleLegend = legend.append("g")
            .attr("class", "legend-toggle")
            .attr("transform", `translate(0, ${legendData.length * 45 + legendBoxPadding})`)
            .style("cursor", "pointer")
            .on("click", () => this.toggleLegend());

        toggleLegend.append("rect")
            .attr("width", 90)
            .attr("height", 25)
            .attr("fill", "lightgray");
       
        this.legend = legend;
        this.legendToggle = toggleButton;

        // Set initial state
        this.updateLegendVisibility();
    }

    updateLegendPosition() {
        if (this.legend) {
            const newX = this.container.clientWidth - 112;
            const newY = this.container.clientHeight - 137;
            this.legend.attr("transform", `translate(${newX}, ${newY})`);
            
            // Update toggle button position
            const toggleX = this.container.clientWidth - 95;
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
                <h2>D3 Visualization Unavailable</h2>
                <p>The D3 library could not be loaded. Please check your internet connection or contact the administrator.</p>
            </div>
        `;
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
        container.selectAll(".node").each((d, i, nodes) => {
            const node = d3.select(nodes[i]);
            const titleGroup = node.select(".title-group");
            const author = node.select(".text-by");

            const titleFontSize = this.calculateFontSize(scale, 'title');
            const authorFontSize = this.calculateFontSize(scale, 'author');
            const authorVisibility = this.calculateAuthorVisibility(scale);
            /* console.log(`Scale: ${scale}, Title size: $ {titleFontSize}, Author size: ${authorFontSize}`)*/;

            const titleBottomPosition = this.updateTitle(titleGroup, d.data.title || "Untitled", titleFontSize);

            author
                .attr("dy", `${titleBottomPosition + this.config.titleAuthorSpacing}px`)
                .style("font-size", `${authorFontSize}px`)
                .style("opacity", authorVisibility)
                .text(d => this.formatAuthorName(d.data, authorFontSize));
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
            return `${data.text_status == 'draft' || data.text_status == 'incomplete_draft' ? 'DRAFT ' : ''} by you`;
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
    
        return `by ${formattedName}`;
    }

    updateTitle(titleGroup, titleOrAccessor, fontSize) {
        titleGroup.selectAll("*").remove();  // Clear existing title

        const title = typeof titleOrAccessor === 'function' 
            ? titleOrAccessor(titleGroup.datum()) 
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
            titleGroup.append("text")
                .attr("dy", `${i * lineHeight}px`)
                .attr("x", d => d.children ? -13 : 13)
                .style("text-anchor", d => d.children ? "end" : "start")
                .style("font-size", `${fontSize}px`)
                .text(line);
        });

        // Return the bottom position of the last line
        return (lines.length * lineHeight);
    }

    getTextWidth(text, fontSize) {
        // This is an approximation. For more accuracy, you might want to use canvas or SVG to measure text width
        return text.length * fontSize * 0.6;
    }
}

