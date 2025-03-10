{{ include('header.php', {title_key: 'page_title.texts'})}}
<!-- Store the complete data in a hidden script tag -->
<script type="application/json" id="games-data">
    {{ gamesData|raw }}
</script>

<div class="filter-menu" id="gameFilters">
</div>
<div class="search-menu" id="gameSearch">
</div>

<div data-stories class="stories">
{% for text in texts %}
    <div class="story {{ text.openForChanges ? '' : 'closed' }}" data-game-id="{{ text.game_id }}" data-unseen-count="{{ text.unseen_count }}" data-seen-count="{{ text.seen_count }}" data-text-count="{{ text.text_count }}" data-text-id="{{ text.id }}">
        <div class="story-title {% if session.writer_id and text.unseen_count %}unreads{% endif %}">
            <h2 class="{{ text.hasContributed ? 'contributed' : '' }}">
                <!-- TODO: The chosen language for "Untitled" or "Sans Titre" should be based on the language of that text as defined by the writer. For now, it will be updated based on the language toggle of the website. It's FINE, as Untitled is only possible for DRAFTS... meaning the draft text will ALWAYS BELONG TO THE USER, so having Untitled translated in their chosen language is APROPRIATE. -->
                <a data-refresh-default data-text-id="{{ text.id }}" {{ text.title ? '' : 'data-i18n="general.untitled"' }}>{{ text.title ? text.title : translate('general.untitled') }}</a>
            </h2>
        </div>
        <div class="story-btns">
            {% if session.writer_id %}
                <button data-bookmark-story data-text-id="{{ text.id }}" class="story-btn bookmark-btn" data-svg="bookmark" data-i18n-title="{{ 'general.bookmark_tooltip' }}" title="{{ translate('general.bookmark_tooltip') }}">
                </button>
            {% endif %}
            <button data-refresh-tree data-text-id="{{ text.id }}" class="story-btn" data-svg="tree" data-i18n-title="{{ 'general.view_tree_tooltip' }}" title="{{ translate('general.view_tree_tooltip') }}">
<!--                 <img class="refresh-tree" src="{{ path }}assets/imgs/icons/tree.svg" alt="view tree"> -->
            </button>
            <button data-refresh-shelf data-text-id="{{ text.id }}" class="story-btn" data-svg="shelf" data-i18n-title="{{ 'general.view_shelf_tooltip' }}" title="{{ translate('general.view_shelf_tooltip') }}">
<!--                 <img class="refresh-shelf" src="{{ path }}assets/imgs/icons/shelf.svg" alt="view shelf">  -->
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
                        <span data-i18n="general.game">{{ translate('general.game') }}</span>
                        <span data-i18n="general.pending">{{ translate('general.pending') }}</span>  
                    </p>
                {% elseif text.openForChanges %}
                    <p class="game-status">    
                        <span data-i18n="general.game">{{ translate('general.game') }}</span>
                        <span data-i18n="general.open">{{ translate('general.open') }}</span>  
                    </p>
                {% else %}
                    <p class="game-status">
                        <span data-i18n="general.game">{{ translate('general.game') }}</span>
                        <span data-i18n="general.closed">{{ translate('general.closed') }}</span>
                    </p>
                {% endif %}
            </div>
            {% if text.prompt %}
            <div class="story-prompt">
                <h3 data-i18n="cr_it_ed.prompt" class="prompt-title very-small">
                    {{ translate('cr_it_ed.prompt') }}
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

<!-- Make sure the JSON is properly escaped for HTML -->
<meta name="initial-filters" content="{{ initialFilters|e('html_attr') }}">
