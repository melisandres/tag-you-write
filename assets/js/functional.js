// D3.js is included in the header FOR EVERYTHING
const path = window.location.origin + "/tag-you-write-repo/tag-you-write/";
// const path = 'http://localhost:8888/tag-you-write-repo/tag-you-write/';

const treeModal = document.querySelector('.tree-modal');
const treeModalContent = treeModal.querySelector('.tree-modal-dynamic-content');
const closeTreeModal = document.querySelector('.close-tree-modal');

// Function to show the modal
function showModal(d) {
  treeModal.classList.remove('display-none');
  treeModalContent.innerHTML =  `
                                <div>
                                    Title: ${d.data.title}\nAuthor: ${d.data.firstName} ${d.data.lastName}
                                </div>
                                <p>
                                    ${d.data.writing}
                                </p>
                                `
}

// Function to hide the modal
function hideModal() {
  treeModal.classList.add('display-none');
}


// Add event listener for the close button (if applicable)
closeTreeModal.addEventListener('click', hideModal);


const storiesContainer = document.querySelector('[data-stories]');

storiesContainer.addEventListener('click', handleTreeRefresh);

function handleTreeRefresh(event) {
    // Check if the clicked target or its parent has the data-refresh-tree attribute
    const treeTarget = event.target.closest("[data-refresh-tree]");
    const shelfTarget = event.target.closest("[data-refresh-shelf]");
    if (treeTarget) {
        const textId = treeTarget.dataset.textId;
        drawTree(textId);
    }
    if (shelfTarget) {
        const textId = shelfTarget.dataset.textId;
        drawShelf(textId);
    }
}

function handleNodeClick(event, d) {
    // Display the node data as needed, e.g., in an alert or a modal
    showModal(d)
    //alert(`Title: ${d.data.title}\nAuthor: ${d.data.firstName} ${d.data.lastName}`);
}


async function fetchTree(id) {
    const url = `${path}text/getTree/${id}`; // Construct URL with optional ID parameter
    const response = await fetch(url);
  
    if (!response.ok) {
      throw new Error(`Error fetching tree data: ${response.status}`);
    }

    const jsonData = await response.json();

    return jsonData; // Use the received JSON data to build your tree visualization
}

async function drawTree(clickedStoryId) {
    // Get the data: it is the first element in the array sent
    const datas = await fetchTree(clickedStoryId);
    const data = datas[0];

    // Get the containner and prepare it (style and empty)
    const container = document.getElementById('tree-container');
    container.classList.add("with-tree");
    container.innerHTML = ''; // Clear any existing content

    // Set width, height, and margins
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const margin = { top: 0, right: 75, bottom: 0, left: 75 };
    const width = containerWidth - margin.left - margin.right;
    const height = containerHeight - margin.top - margin.bottom;

    // Constrain the zoom 
    const minScale = 0.25;
    const maxScale = 2;

    // Minimum spacing between nodes
    const minSpacing = 150;

    // First step in using D3, setting the svg
    const svg = d3.select("#tree-container").append("svg")
        .attr("width", containerWidth)
        .attr("height", containerHeight)
        .style("overflow", "visible"); // Ensure the SVG itself allows overflow

    const g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // To correct the stutter of the tree when it is zoomed out and dragged, append a "g" to the original "g".
    const child = g.append ("g");


    // Use D3 hierarchy to transform the data into a form useable by D3
    const root =  d3.hierarchy(data, d => d.children);

    // Create a tree layout
    const treeLayout = d3.tree()
        .size([height, width])  // Use the full size of the SVG
        .separation((a, b) => a.parent === b.parent ? 1 : 2); // Ensure separation between nodes

    // Calculate the maximum depth and height of the tree
    const maxDepth = d3.max(root.descendants(), d => d.depth);
    //const maxHeight = d3.max(root.descendants(), d => d.x);

    // Calculate the maximum number of nodes at any depth
    const depthCounts = {};
    root.each(d => {
        if (!depthCounts[d.depth]) {
            depthCounts[d.depth] = 0;
        }
        depthCounts[d.depth]++;
    });

    const maxNodesAtDepth = Math.max(...Object.values(depthCounts));

    // Calculate the required width and height
    const requiredWidth = maxDepth * minSpacing;
    const requiredHeight = maxNodesAtDepth * minSpacing;

    // Update tree layout size based on required width
    treeLayout.size([requiredHeight, requiredWidth]);

    // Assigns the x and y position for the nodes
    treeLayout(root);

   


    // Draw the lines between the nodes
    const link = child.selectAll(".link")
        .data(root.descendants().slice(1))
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d => {
            return "M" + d.y + "," + d.x
                + "C" + (d.y + d.parent.y) / 2 + "," + d.x
                + " " + (d.y + d.parent.y) / 2 + "," + d.parent.x
                + " " + d.parent.y + "," + d.parent.x;
        });
    
    // Draw the nodes
    const node = child.selectAll(".node")
        .data(root.descendants())
        .enter().append("g")
        .attr("class", d => "node" +
            (d.children ? " node--internal" : " node--leaf"))
        .attr("transform", d => "translate(" + d.y + "," + d.x + ")")
        .on("click", handleNodeClick);

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
        .attr("class", d => "text-by") 
        .text(d => "by " + d.data.firstName + " " + d.data.lastName);

    // Constraints on zooming
    const zoom = d3.zoom()
        .scaleExtent([minScale, maxScale]) // Set zoom constraints
        .extent([[0,0], [containerWidth, containerHeight]])
        .on("zoom", function(event) {
            child.attr("transform", event.transform);
        });

    svg.call(zoom); // Attach zoom behavior to the SVG element

}




async function drawShelf(id) {
    const datas = await fetchTree(id);
    const data = datas[0];
    console.log(data);

    const treeContainer = document.getElementById('tree-container');
    treeContainer.innerHTML = ''; // Clear any existing content
    treeContainer.classList.remove('with-tree');
    const ul = document.createElement('ul');
    ul.appendChild(drawDrawer(data, 0));
    treeContainer.appendChild(ul);
}


function drawDrawer(node, depth) {
    const li = document.createElement('li');
    li.className = 'node';
    li.style.setProperty('--node-depth', depth); 
    
    const titleDiv = document.createElement('div');
    titleDiv.className = 'node-title';
    titleDiv.innerHTML =    `
                            <span class="arrow">▶</span> 
                            ${node.title}, by ${node.firstName} ${node.lastName}, ${node.date}
                            `;
    
    const writingDiv = document.createElement('div');
    writingDiv.className = 'writing hidden';
    writingDiv.textContent = node.writing;

    const buttonsDiv = document.createElement('div');
    buttonsDiv.className = 'node-buttons';

    // Add edit button if permitted
    if (node.permissions.canEdit) {
        const editForm = document.createElement('form');
        editForm.action = `${path}text/edit`;
        editForm.method = 'POST';
        editForm.innerHTML = `
            <input type="hidden" name="id" value="${node.id}">
            <input type="hidden" name="parent_id" value="${node.parent_id}">
            <input type="submit" value="Edit">
        `;
        buttonsDiv.appendChild(editForm);
    }

    // Add delete button if permitted
    if (node.permissions.canDelete) {
        const deleteForm = document.createElement('form');
        deleteForm.action = `${path}text/delete`;
        deleteForm.method = 'POST';
        deleteForm.innerHTML = `
            <input type="hidden" name="id" value="${node.id}">
            <input type="hidden" name="parent_id" value="${node.parent_id}">
            <input type="hidden" name="writer_id" value="${node.writer_id}">
            <input type="submit" value="Delete">
        `;
        if (node.permissions.isParent || node.permissions.canIterate) {
            deleteForm.querySelector('input[type="submit"]').disabled = true;
            deleteForm.querySelector('input[type="submit"]').title = "Cannot be deleted. Other texts iterate on it.";
        }
        buttonsDiv.appendChild(deleteForm);
    }

    // Add iterate button if permitted
    if (node.permissions.canIterate) {
        const iterateForm = document.createElement('form');
        iterateForm.action = `${path}text/iterate`;
        iterateForm.method = 'POST';
        iterateForm.innerHTML = `
            <input type="hidden" name="id" value="${node.id}">
            <input type="submit" value="Iterate">
        `;
        buttonsDiv.appendChild(iterateForm);
    }

    titleDiv.appendChild(buttonsDiv);


    titleDiv.addEventListener('click', () => {
        const arrow = titleDiv.querySelector('.arrow');
        if (writingDiv.classList.contains('hidden')) {
            writingDiv.classList.remove('hidden');
            arrow.textContent = '▼';
        } else {
            writingDiv.classList.add('hidden');
            arrow.textContent = '▶';
        }
    });

    li.appendChild(titleDiv);
    li.appendChild(writingDiv);

    if (node.children && node.children.length > 0) {
        const ul = document.createElement('ul');
        node.children.forEach(child => {
            ul.appendChild(drawDrawer(child, depth + 1));
        });
        li.appendChild(ul);
    }

    return li;
}