{{ include('header.php', {title: 'All Texts!'})}}
<!-- Store the complete data in a hidden script tag -->
<script type="application/json" id="games-data">
    {{ gamesData|raw }}
</script>

<div class="filter-menu" id="gameFilters">
</div>


<!-- an area to show all the starting stories that might be contributed to -->
<div data-stories class="stories">
{% for text in texts %}
    <div class="story {{ text.openForChanges ? '' : 'closed' }}" data-game-id="{{ text.game_id }}" data-unseen-count="{{ text.unseen_count }}" data-seen-count="{{ text.seen_count }}" data-text-count="{{ text.text_count }}" data-text-id="{{ text.id }}">
        <div class="story-title {% if session.writer_id and text.unseen_count %}unreads{% endif %}">
            <h2 class="{{ text.hasContributed ? 'contributed' : '' }}">
                <a data-refresh-modal data-text-id="{{ text.id }}">{{ text.title ? text.title : 'Untitled' }}</a>
            </h2>
        </div>
        <div class="story-btns">
            {% if session.writer_id %}
                <button data-bookmark-story data-text-id="{{ text.id }}" class="story-btn bookmark-btn" data-svg="bookmark">
                </button>
            {% endif %}
            <button data-refresh-tree data-text-id="{{ text.id }}" class="story-btn" data-svg="tree">
                <img class="refresh-tree" src="{{ path }}assets/imgs/icons/tree.svg" alt="view tree">
            </button>
            <button data-refresh-shelf data-text-id="{{ text.id }}" class="story-btn" data-svg="shelf">
                <img class="refresh-shelf" src="{{ path }}assets/imgs/icons/shelf.svg" alt="view shelf"> 
            </button>
        </div>
        <div class="story-writing">
            {% if text.pending %}
            <div class="game-status-indicator pending">
            {% elseif text.openForChanges %}
            <div class="game-status-indicator open">
            {% else %}
            <div class="game-status-indicator closed">
            {% endif %}

                {% if text.pending %}
                    <p class="game-status">    
                        <span>GAME</span>
                        <span>PENDING</span>  
                    </p>
                {% elseif text.openForChanges %}
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
            {% if text.prompt %}
            <div class="story-prompt">
                <h3 class="prompt-title very-small">
                    prompt:
                </h3>
                <p>
                    {{ text.prompt|raw }}
                </p>
            </div>
            {% endif %}
        </div>
    </div>
{% endfor %}
</div>
{{ include('footer.php') }}
