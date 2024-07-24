//import * as d3 from 'https://d3js.org/d3.v7.min.js';

export class TreeVisualizer {
    constructor(container, modal) {
        this.container = container;
        this.modal = modal;

        // Constraints for the zoom 
        this.minScale = 0.25;
        this.maxScale = 2;

        // Minimum spacing between the nodes
        this.minSpacing = 150;

        // Margins
        this.leftMargin = 200;
        this.rightMargin = 75;
    }
  
    drawTree(data) {
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
        const containerWidth = this.container.clientWidth;
        const containerHeight = this.container.clientHeight
        const margin = { top: 0, right: this.rightMargin, bottom: 0, left: this.leftMargin };
        const width = containerWidth - margin.left - margin.right;
        const height = containerHeight - margin.top - margin.bottom;
  
        // Create SVG element
        const svg = d3.select(this.container).append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .style("overflow", "visible");
  
        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
  
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
            .on("click", (event, d) => this.modal.showModal(d.data));
  
        node.append("circle").attr("r", 10);
  
        // Add the title
        node.append("text")
            .attr("dy", "-0.35em")
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .text(d => d.data.title);
  
        // Add additional text line below the title
        node.append("text")
            .attr("dy", "1.25em")
            .attr("x", d => d.children ? -13 : 13)
            .style("text-anchor", d => d.children ? "end" : "start")
            .attr("class", "text-by")
            .text(d => `by ${d.data.firstName} ${d.data.lastName}`);
  
        // Constraints on zooming
        const zoom = d3.zoom()
            .scaleExtent([this.minScale, this.maxScale])
            .extent([[0, 0], [containerWidth, containerHeight]])
            .on("zoom", event => child.attr("transform", event.transform));
  
        svg.call(zoom);
    }
}
  