{{ include('header.php', {title: 'Story Collaboration'})}}

<!-- Store the complete data in hidden script tags -->
<script type="application/json" id="game-data">
    {{ gameData|raw }}
</script>
<script type="application/json" id="tree-data">
    {{ treeData|raw }}
</script>

<div class="filter-menu" id="gameFilters">
</div>
<div class="search-menu" id="gameSearch">
</div>

<div data-one-story class="one-story">
    <div class="story {{ game.openForChanges ? '' : 'closed' }}" 
        data-game-id="{{ game.game_id }}" 
        data-unseen-count="{{ game.unseen_count }}" 
        data-seen-count="{{ game.seen_count }}" 
        data-text-count="{{ game.text_count }}" 
        data-text-id="{{ game.id }}">
        
        <div class="story-title {% if session.writer_id and game.unseen_count %}unreads{% endif %}">
            <h2 class="{{ game.hasContributed ? 'contributed' : '' }}">
                {{ game.title ? game.title : 'Untitled' }}
            </h2>
        </div>

        <div class="story-btns">
            {% if session.writer_id %}
                <button data-bookmark-story data-text-id="{{ game.id }}" class="story-btn bookmark-btn" data-svg="bookmark">
                </button>
            {% endif %}
            <button data-refresh-tree data-text-id="{{ game.id }}" class="story-btn active" data-svg="tree">
                <img class="refresh-tree" src="{{ path }}assets/imgs/icons/tree.svg" alt="view tree">
            </button>
            <button data-refresh-shelf data-text-id="{{ game.id }}" class="story-btn" data-svg="shelf">
                <img class="refresh-shelf" src="{{ path }}assets/imgs/icons/shelf.svg" alt="view shelf"> 
            </button>
        </div>

        <div class="story-writing">
            {% if game.pending %}
            <div class="game-status-indicator pending">
            {% elseif game.openForChanges %}
            <div class="game-status-indicator open">
            {% else %}
            <div class="game-status-indicator closed">
            {% endif %}
                {% if game.pending %}
                    <p class="game-status">    
                        <span>GAME</span>
                        <span>PENDING</span>  
                    </p>
                {% elseif game.openForChanges %}
                    <p class="game-status">    
                        <span>GAME</span>
                        <span>OPEN</span>  
                    </p>
                {% else %}
                    <p class="game-status">
                        <span>GAME</span>
                        <span>CLOSED</span>
                    </p>
                {% endif %}
            </div>

            {% if game.prompt %}
            <div class="story-prompt">
                <h3 class="prompt-title very-small">
                    prompt:
                </h3>
                <p>
                    {{ game.prompt|raw }}
                </p>
            </div>
            {% endif %}
        </div>

        <!-- Tree visualization will be inserted here by JavaScript -->
        <div id="tree-visualization" class="tree-container active"></div>
        <!-- Shelf visualization will be inserted here by JavaScript -->
        <div id="shelf-visualization" class="shelf-container"></div>
    </div>
</div>

{{ include('footer.php') }}