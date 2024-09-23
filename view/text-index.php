{{ include('header.php', {title: 'All Texts!'})}}


<!-- an area to show all the starting stories that might be contributed to -->
<div data-stories class="stories">
{% for text in texts %}
    <div class="story {{ text.openForChanges ? '' : 'closed' }}" data-game-id="{{ text.game_id }}" data-unseen-count="{{ text.unseen_count }}" data-seen-count="{{ text.seen_count }}" data-text-count="{{ text.text_count }}" data-text-id="{{ text.id }}">
        <div class="story-title">
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
            {% if session.writer_id and text.unseen_count %}
                <i data-unreads data-text-id="{{ text.id }}" class="story-btn unreads" data-svg="unreads">
                </i>
            {% endif %}
        </div>
        <div class="story-writing">
            {% if text.prompt %}
            <p><span class="very-small">prompt:</span> {{ text.prompt }}</p>
            {% endif %}
        </div>
    </div>
{% endfor %}
</div>
{{ include('footer.php') }}
