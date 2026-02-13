{{ include('header.php', {title_key: 'page_title.texts'})}}
<!-- Store the complete data in a hidden script tag -->
<script type="application/json" id="games-data">
    {{ gamesData|raw }}
</script>

<div class="menu-container">
    <div class="filter-menu" id="gameFilters">
    </div>
    <div class="search-menu" id="gameSearch">
    </div>
</div>

<!-- Category Header -->
{% if category %}
    {% set categoryParts = category|split('.') %}
    {% if categoryParts|length == 1 %}
        {% set categoryTranslationKey = 'category-header.' ~ category ~ '.' %}
    {% else %}
        {% set categoryTranslationKey = 'category-header.' ~ categoryParts[0] ~ '.' ~ categoryParts[1] %}
    {% endif %}
{% else %}
    {% set categoryTranslationKey = 'category-header.all' %}
{% endif %}
    <div class="game-list-category-header visible" id="categoryHeader">
        <div class="category-breadcrumb">
            <span class="category-name" data-i18n="{{ categoryTranslationKey }}">{{ translate(categoryTranslationKey) }}</span>
            <span class="game-count">({{ texts|length }})</span>
        </div>
        <div class="header-actions">
        {% if not guest %}
            <a class="header-new-game-link" href="{{ langUrl('text/create?new=true') }}" data-i18n-title="nav.newGame_tooltip" title="{{ translate('nav.newGame_tooltip') }}">
                <span class="icon" data-svg="newGame"></span>
            </a>
        {% endif %}
        <!-- Close button added via JavaScript -->
    </div>
</div>

<div data-stories class="stories">
{% for text in texts %}
    <div class="story {{ text.openForChanges ? '' : 'closed' }}{{ text.hasTemporaryAccess ? ' has-temporary-access' : '' }}{{ text.filter_mismatch ? ' filter-mismatch' : '' }}" data-game-id="{{ text.game_id }}" data-unseen-count="{{ text.unseen_count }}" data-seen-count="{{ text.seen_count }}" data-text-count="{{ text.text_count }}" data-text-id="{{ text.id }}">
        {% if text.filter_mismatch %}
        <div class="filter-mismatch-banner">
            <div class="banner-text" data-i18n="general.filterMismatchBanner">
                {{ translate('general.filterMismatchBanner') }}
            </div>
        </div>
        {% endif %}
        {% if text.hasTemporaryAccess %}
        <div class="temporary-access-banner">
            <div class="banner-text" data-i18n="{{ session.writer_id ? 'invitation.temporary_access_banner' : 'invitation.temporary_access_banner_not_logged_in' }}">
                {{ translate(session.writer_id ? 'invitation.temporary_access_banner' : 'invitation.temporary_access_banner_not_logged_in') }}
            </div>
            {% if session.writer_id %}
            <button class="link-button" data-action="link-invitation" data-game-id="{{ text.game_id }}" data-token="{{ text.invitation_token }}" data-i18n="invitation.link_to_account" title="{{ translate('invitation.link_to_account') }}">
                <span class="icon" data-svg="linkGameToAccount"></span>
                {{ translate('invitation.link_to_account') }}
            </button>
            {% endif %}
        </div>
        {% endif %}
        <!-- TODO: The chosen language for "Untitled" or "Sans Titre" should 
        be based on the language of that text as defined by the writer. For 
        now, it will be updated based on the language toggle of the website. 
        It's FINE, as Untitled is only possible for DRAFTS... meaning the 
        draft text will ALWAYS BELONG TO THE USER, so having Untitled 
        translated in their chosen language is APROPRIATE. -->
        <div class="story-title {% if session.writer_id and text.unseen_count %}unreads{% endif %}" data-refresh-default data-text-id="{{ text.id }}">
            <h2>
                {% if text.hasContributed %}<span class="contributor-star" data-svg="star" data-i18n-tooltip="tooltips.contributor" data-tooltip-text="{{ translate('tooltips.contributor') }}"></span>{% endif %}
                <a data-text-id="{{ text.id }}" {{ text.title ? '' : 'data-i18n="general.untitled"' }}>{{ text.title ? text.title : translate('general.untitled') }}</a>
            </h2>
        </div>
        <div class="story-btns">
            {% if session.writer_id %}
                <button data-bookmark-story data-text-id="{{ text.id }}" class="story-btn bookmark-btn {{ text.isBookmarked ? 'bookmarked' : '' }}" data-svg="bookmark" data-i18n-title="{{ 'general.bookmark_tooltip' }}" title="{{ translate('general.bookmark_tooltip') }}">
                </button>
            {% endif %}
            <div class="story-btn game-activity-indicator no-activity" data-i18n-title="activity.browsingVsEditing" title="{{ translate('activity.browsingVsEditing') }}" data-game-id="{{ text.game_id }}">
                <span class="icon" data-svg="user"></span>
                <div class="activity-numbers">0:0</div>
            </div>


            {% set privacyInfo = text.visible_to_all and text.joinable_by_all ? 
                {svg: 'public', key: 'general.privacy_public_tooltip'} : 
                (text.visible_to_all ? 
                    {svg: 'locked', key: 'general.privacy_locked_tooltip'} : 
                    {svg: 'invisible', key: 'general.privacy_invisible_tooltip'}) %}
            <div class="story-btn privacy-indicator" data-svg="{{ privacyInfo.svg }}" data-i18n-title="{{ privacyInfo.key }}" title="{{ translate(privacyInfo.key) }}">
            </div>
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
