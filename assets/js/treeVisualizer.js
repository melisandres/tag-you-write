//import * as d3 from 'https://d3js.org/d3.v7.min.js';

export class TreeVisualizer {
    constructor(container) {
        this.svg = null;

        //get the container
        this.container = container;

        // Constraints for the zoom 
        this.minScale = 0.25;
        this.maxScale = 2;

        // Minimum spacing between the nodes
        this.minSpacing = 150;

        // Margins
        this.leftMargin = 200;
        this.rightMargin = 75;

        // Some variables to define in drawTree
        this.containerHeight = null;
        this.containerWidth = null;
        this.margin = null;

        // Colors to represent the number of votes
        this.baseColor = '#ff009b';
        this.colorScale = null;

        // Handle the lengend position on browser resize
        this.legend = null;
        this.updateLegendPosition = this.updateLegendPosition.bind(this);
        this.toggleLegend = this.toggleLegend.bind(this);
        window.addEventListener('resize', this.updateLegendPosition);
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
            .attr('fill', this.colorScale(voteCount));
    }
  
    drawTree(data) {
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
        this.margin = { top: 0, right: this.rightMargin, bottom: 0, left: this.leftMargin };
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
            .attr("transform", `translate(${this.margin.left},${this.margin.top})`);
  
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
                    item.append("circle")
                        .attr("r", 10)
                        .attr('class', d => {
                            // Concatenate multiple classes based on conditions
                            let classes = `${d.data.text_seen == 1 ? 'read' : 'unread'}`;
                            classes += ` ${d.data.text_status == 'draft' || d.data.text_status == 'incomplete_draft'  ? 'tree-node-draft' : ''}`; // Add class for draft status
                            return classes.trim();  // Remove any extra spaces
                        })
                        .attr('data-id', d => d.data.id)  // Add data-set for text id
                        .attr('fill', d => colorScale(d.data.voteCount)); // Add a fill with color based on votes
                }
            });
            
  
        // Add the title
        node.append("text")
            .attr("dy", "-0.35em")
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .attr("class", d => d.data.text_status == 'draft' || d.data.text_status == 'incomplete_draft' ? "tree-title-draft" : "")
            .text(d => d.data.title || "Untitled");
  
        // Add additional text line below the title
        node.append("text")
            .attr("dy", "1.25em")
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .attr("class", d => d.data.permissions.isMyText ? "text-by author" : "text-by")
            .text(d => d.data.permissions.isMyText ? `${d.data.text_status == 'draft' || d.data.text_status == 'incomplete_draft' ? 'DRAFT ' : ''} by you` : `by ${d.data.firstName} ${d.data.lastName}`);
  
        // Constraints on zooming
        const zoom = d3.zoom()
            .scaleExtent([this.minScale, this.maxScale])
            .extent([[0, 0], [this.containerWidth, this.containerHeight]])
            .on("zoom", event => child.attr("transform", event.transform));
  
        this.svg.call(zoom);

        // The Legend
        this.createLegend(data);
        
        // Add toggle button for legend
       /*  const toggleButton = this.svg.append("g")
            .attr("class", "legend-toggle")
            .attr("transform", `translate(${this.containerWidth - 80}, 20)`)
            .style("cursor", "pointer")
            .on("click", () => this.toggleLegend());

        toggleButton.append("rect")
            .attr("width", 65)
            .attr("height", 20)
            .attr("fill", "lightgray");

        toggleButton.append("text")
            .attr("x", 10)
            .attr("y", 15)
            .attr("text-anchor", "center")
            .text("Legend")
            .style("font-size", "14px")
            .style("fill", "black"); */


    }

    createLegend(d) {
        const self = this;
        //console.log(d);
        //const gameTitle = data.title;
        const maxVotes = d.playerCount -1;
        const legendData = [
            { label: "Winner", type: "star"},
            { label: "Unread", type: "unread-circle" },
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
            if (d.type === "unread-circle") {
                item.append("circle")
                    .attr("r", 6)
                    .attr("class", "unread");
                item.append("text")
                    .attr("x", 15)
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
                        .style("font-size", "12px");
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
                    .attr("fill", "gold");  // Use gold color for the winner
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
            .text("Hide Legend")
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

        toggleLegend.append("text")
            .attr("x", 45)
            .attr("y", 17)
            .attr("text-anchor", "middle")
            .text("Hide Legend")
            .style("font-size", "14px")
            .style("fill", "black");

       

        this.legend = legend;
        this.legendToggle = toggleButton;

        

         // Handle the legend position on browser resize
         //this.legend = legend;
         //this.updateLegendPosition();
    }

    updateLegendPosition() {
        if (this.legend) {
            const newX = this.container.clientWidth - 112;
            const newY = this.container.clientHeight - 137;
            this.legend.attr("transform", `translate(${newX}, ${newY})`);
            
            // Update toggle button position
            const toggleX = this.container.clientWidth - 95;
            this.legendToggle.attr("transform", `translate(${toggleX}, ${this.container.clientHeight - 30})`);
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
        console.log('toggleLegend');
        const legend = this.svg.select(".legend");
        const isVisible = !legend.classed("hidden");
        legend.classed("hidden", isVisible);
    
        const toggleText = this.legendToggle.select("text");
        toggleText.text(isVisible ? "Show Legend" : "Hide Legend");

        // Hide the toggle button when the legend is visible
        this.legendToggle.style("display", isVisible ? "block" : "none");
    
        this.updateLegendPosition();
    }

    /* updateNodeStatus(nodeId, newStatus) {
        console.log(`Updating node ${nodeId} to status ${newStatus}`);
        console.log('Current container:', this.container);
    
        const circle = this.container.querySelector(`[data-id="${nodeId}"]`);
        console.log('Found circle:', circle);
    
        if (!circle) {
          console.log('Circle not found, aborting update');
          return;
        }
    
        const nodeGroup = circle.closest('g');
        console.log('Found node group:', nodeGroup);
    
        if (nodeGroup) {
          // Update circle
          console.log('Updating circle classes');
          d3.select(circle)
            .classed('tree-node-draft', newStatus === 'draft')
            .classed('tree-node-published', newStatus === 'published');
    
          // Update title
          const titleText = nodeGroup.querySelector('text:not(.text-by)');
          console.log('Updating title text:', titleText);
          d3.select(titleText)
            .classed('tree-title-draft', newStatus === 'draft')
            .classed('tree-title-published', newStatus === 'published');
    
          // Update author text
          const authorText = nodeGroup.querySelector('text.text-by');
          console.log('Updating author text:', authorText);
          d3.select(authorText)
            .classed('tree-author-draft', newStatus === 'draft')
            .classed('tree-author-published', newStatus === 'published');
    
          // Update the "DRAFT" text in the author line if necessary
          if (authorText) {
            let authorContent = authorText.textContent;
            console.log('Current author content:', authorContent);
            if (newStatus === 'draft' && !authorContent.startsWith('DRAFT')) {
              authorText.textContent = 'DRAFT ' + authorContent;
            } else if (newStatus === 'published' && authorContent.startsWith('DRAFT')) {
              authorText.textContent = authorContent.replace('DRAFT ', '');
            }
            console.log('Updated author content:', authorText.textContent);
          }
        } else {
          console.log('Node group not found');
        }
      } */
}
  