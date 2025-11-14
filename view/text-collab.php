{{ include('header.php', {title_key: 'page_title.story_collab'})}}

<!-- Store the complete data in hidden script tags -->
<script type="application/json" id="game-data">
    {{ gameData|raw }}
</script>
<script type="application/json" id="tree-data">
    {{ treeData|raw }}
</script>

<div class="menu-container">
<div class="filter-menu" id="gameFilters">
</div>
<div class="search-menu" id="gameSearch">
    </div>
</div>

<div data-one-story class="one-story">
    <div class="story {{ game.openForChanges ? '' : 'closed' }}{{ game.hasTemporaryAccess ? ' has-temporary-access' : '' }}" 
        data-game-id="{{ game.game_id }}" 
        data-unseen-count="{{ game.unseen_count }}" 
        data-seen-count="{{ game.seen_count }}" 
        data-text-count="{{ game.text_count }}" 
        data-text-id="{{ game.id }}">
        {% if game.hasTemporaryAccess %}
        <div class="temporary-access-banner">
            <div class="banner-text" data-i18n="{{ session.writer_id ? 'invitation.temporary_access_banner' : 'invitation.temporary_access_banner_not_logged_in' }}">
                {{ translate(session.writer_id ? 'invitation.temporary_access_banner' : 'invitation.temporary_access_banner_not_logged_in') }}
            </div>
            {% if session.writer_id %}
            <button class="link-button" data-action="link-invitation" data-game-id="{{ game.game_id }}" data-token="{{ game.invitation_token }}" data-i18n="invitation.link_to_account" title="{{ translate('invitation.link_to_account') }}">
                <span class="icon" data-svg="linkGameToAccount"></span>
                {{ translate('invitation.link_to_account') }}
            </button>
            {% endif %}
        </div>
        {% endif %}
        
        <div class="story-title {% if session.writer_id and game.unseen_count %}unreads{% endif %}" data-refresh-default data-text-id="{{ game.id }}">
            <h2>
                {% if game.hasContributed %}<span class="contributor-star" data-svg="star" data-i18n-tooltip="tooltips.contributor" data-tooltip-text="{{ translate('tooltips.contributor') }}"></span>{% endif %}
                {{ game.title ? game.title : translate('general.untitled') }}
            </h2>
        </div>

        <div class="story-btns">
            {% if session.writer_id %}
                <button data-bookmark-story data-text-id="{{ game.id }}" class="story-btn bookmark-btn {{ game.isBookmarked ? 'bookmarked' : '' }}" data-svg="bookmark"  data-i18n-title="general.bookmark_tooltip" title="{{ translate('general.bookmark_tooltip') }}">
                </button>
            {% endif %}
            <div class="story-btn game-activity-indicator no-activity" data-i18n-title="activity.browsingVsEditing" title="{{ translate('activity.browsingVsEditing') }}" data-game-id="{{ game.game_id }}">
                <span class="icon" data-svg="user"></span>
                <div class="activity-numbers">0:0</div>
            </div>
            {% set privacyInfo = game.visible_to_all and game.joinable_by_all ? 
                {svg: 'public', key: 'general.privacy_public_tooltip'} : 
                (game.visible_to_all ? 
                    {svg: 'locked', key: 'general.privacy_locked_tooltip'} : 
                    {svg: 'invisible', key: 'general.privacy_invisible_tooltip'}) %}
            <div class="story-btn privacy-indicator" data-svg="{{ privacyInfo.svg }}" data-i18n-title="{{ privacyInfo.key }}" title="{{ translate(privacyInfo.key) }}">
            </div>
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
                        <span data-i18n="general.game">{{ translate('general.game') }}</span>
                        <span data-i18n="general.pending">{{ translate('general.pending') }}</span>  
                    </p>
                {% elseif game.openForChanges %}
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

            {% if game.prompt %}
            <div class="story-prompt">
                <h3 data-i18n="cr_it_ed.prompt" class="prompt-title very-small">
                    {{ translate('cr_it_ed.prompt') }}
                </h3>
                <p>
                    {{ game.prompt|raw }}
                </p>
            </div>
            {% endif %}
        </div>

        <!-- Tree visualization will be inserted here by JavaScript -->
        <div id="tree-visualization" class="tree-container active collab"></div>
        <!-- Shelf visualization will be inserted here by JavaScript -->
        <div id="shelf-visualization" class="shelf-container"></div>
    </div>
</div>

{{ include('footer.php') }}