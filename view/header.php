<!DOCTYPE html>
<html lang="{{ current_language }}">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="user" data-user-id="{{ session.writer_id ? session.writer_id : 'null' }}" data-guest="{{ guest ? 'true' : 'false' }}">
    <meta name="base-url" data-base-url="{{ path }}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    {% if not guest %}
        <!-- Store the notifications data for initial load -->
        <script type="application/json" id="notifications-data">
            {{ notificationsData|raw }}
        </script>
    {% endif %}
    
    {% if title_key is defined %}
        <title data-i18n-title="{{ title_key }}">{{ translate(title_key) }}</title>
    {% else %}
        <title>{{ title }}</title>
    {% endif %}
    
    <script src="https://cdn.ckeditor.com/ckeditor5/40.2.0/classic/ckeditor.js"></script>
    <link rel="stylesheet" href="{{path}}assets/css/main.css">
    <script type="module" src="https://d3js.org/d3.v7.min.js" defer></script>
    <script src="{{ path }}assets/js/main.js" type="module" defer></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Livvic:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,900&display=swap" rel="stylesheet">
</head>
<body>
    <nav>  
        {# Places Switcher #}
        <div class="nav-link places-switcher" data-item="places" data-i18n-title="nav.places_tooltip" title="{{ translate('nav.places_tooltip') }}">
            <div class="current-places" data-svg="places" data-i18n-title="nav.places_tooltip" title="{{ translate('nav.places_tooltip') }}">
            </div>
            <div class="nav-text" data-i18n="nav.places">
                {{ translate('nav.places') }}
            </div>
            <div class="places-dropdown">
                {% if guest %}
                    <a href="{{ langUrl('') }}" class="{% if title_key == 'page_title.home' %}active{% endif %}" data-i18n="nav.home" data-i18n-title="nav.home_tooltip" title="{{ translate('nav.home_tooltip') }}">
                        <span class="icon" data-svg="home"></span>
                        <span data-i18n="nav.home">{{ translate('nav.home') }}</span>
                    </a>
                {% endif %}
                {% if not guest %}
                <a href="{{ langUrl('dashboard') }}" class="{% if title_key == 'page_title.dashboard' %}active{% endif %}" data-i18n="nav.dashboard" data-i18n-title="nav.dashboard_tooltip" title="{{ translate('nav.dashboard_tooltip') }}">
                    <span class="icon" data-svg="dashboard"></span>
                    <span data-i18n="nav.dashboard">{{ translate('nav.dashboard') }}</span>
                </a>
                {% endif %}
                <a href="{{ langUrl('text') }}" class="{% if title_key == 'page_title.texts' %}active{% endif %}" data-i18n="nav.browse" data-i18n-title="nav.browse_tooltip" title="{{ translate('nav.browse_tooltip') }}">
                    <span class="icon" data-svg="browse"></span>
                    <span data-i18n="nav.browse">{{ translate('nav.browse') }}</span>
                </a>
            </div>
        </div>

        {# Tutorial Switcher #}
        <div class="nav-link tutorial-switcher" data-item="tutorial" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
            <div class="current-tutorial" data-svg="how" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
            </div>
            <div class="nav-text" data-i18n="nav.tutorial">
                {{ translate('nav.tutorial') }}
            </div>
            <div class="tutorial-dropdown">
                <div class="tutorial-dropdown-subtitle" data-i18n="nav.tutorial">{{ translate('nav.tutorial') }}</div>
                <a data-tutorial="start-game" data-i18n="nav.tutorial_start_game" data-i18n-title="nav.tutorial_start_game_tooltip" title="{{ translate('nav.tutorial_start_game_tooltip') }}">
                    <span class="icon" data-svg="newGame"></span>
                    <span data-i18n="nav.tutorial_start_game">{{ translate('nav.tutorial_start_game') }}</span>
                </a>
                <a data-tutorial="contribute" data-i18n="nav.tutorial_contribute" data-i18n-title="nav.tutorial_contribute_tooltip" title="{{ translate('nav.tutorial_contribute_tooltip') }}">
                    <span class="icon" data-svg="iterate"></span>
                    <span data-i18n="nav.tutorial_contribute">{{ translate('nav.tutorial_contribute') }}</span>
                </a>
                <a data-tutorial="vote" data-i18n="nav.tutorial_vote" data-i18n-title="nav.tutorial_vote_tooltip" title="{{ translate('nav.tutorial_vote_tooltip') }}">
                    <span class="icon" data-svg="vote"></span>
                    <span data-i18n="nav.tutorial_vote">{{ translate('nav.tutorial_vote') }}</span>
                </a>
            </div>
        </div>

        {# Filters Switcher #}
        {% if title_key == 'page_title.texts' or title_key == 'page_title.dashboard' or title_key == 'page_title.story_collab' %}
            <div class="nav-link filters-switcher" data-item="filters" data-i18n-title="nav.filters_tooltip" title="{{ translate('nav.filters_tooltip') }}">
                <div class="current-filters" data-svg="filters" data-i18n-title="nav.filters_tooltip" title="{{ translate('nav.filters_tooltip') }}">
                </div>
                <div class="nav-text" data-i18n="nav.filters">
                    {{ translate('nav.filters') }}
                </div>
                <div class="filters-dropdown">
                    {% if title_key == 'page_title.texts' %}
                        <a data-filter-menu="category" data-i18n="nav.category" data-i18n-title="nav.category_tooltip" title="{{ translate('nav.category_tooltip') }}">
                            <span class="icon" data-svg="category"></span>
                            <span data-i18n="nav.category">{{ translate('nav.category') }}</span>
                        </a>
                    {% endif %}
                    {% if title_key == 'page_title.texts' or title_key == 'page_title.story_collab' or title_key == 'page_title.dashboard' %}
                        <a data-filter-menu="search" data-i18n="nav.search" data-i18n-title="nav.search_tooltip" title="{{ translate('nav.search_tooltip') }}">
                            <span class="icon" data-svg="search"></span>
                            <span data-i18n="nav.search">{{ translate('nav.search') }}</span>
                        </a>
                    {% endif %}
                    {% if title_key == 'page_title.texts' or title_key == 'page_title.dashboard' %}
                        <a data-filter-menu="filter" data-i18n="nav.filter" data-i18n-title="nav.filter_tooltip" title="{{ translate('nav.filter_tooltip') }}">
                            <span class="icon" data-svg="filter"></span>
                            <span data-i18n="nav.filter">{{ translate('nav.filter') }}</span>
                        </a>
                    {% endif %}
                    <div class="filters-dropdown-divider"></div>
                    <a data-filter-action="view-all" data-i18n="nav.view_all" data-i18n-title="nav.view_all_tooltip" title="{{ translate('nav.view_all_tooltip') }}">
                        <span data-i18n="nav.view_all">{{ translate('nav.view_all') }}</span>
                    </a>
                    <a data-filter-action="hide-all" data-i18n="nav.hide_all" data-i18n-title="nav.hide_all_tooltip" title="{{ translate('nav.hide_all_tooltip') }}">
                        <span data-i18n="nav.hide_all">{{ translate('nav.hide_all') }}</span>
                    </a> 
                </div>
            </div>
        {% endif %}

        {# Language Switcher #}
        {% if guest %}
        <div class="nav-link language-switcher" data-item="language" data-i18n-title="nav.language_tooltip" title="{{ translate('nav.language_tooltip') }}">
            <div class="current-language">
                {% if current_language == 'en' %}EN{% else %}FR{% endif %}
            </div>
            <div class="nav-text" data-i18n="nav.language">
                {{ translate('nav.language') }}
            </div>
            <div class="language-dropdown">
                <a data-language="en" class="{% if current_language == 'en' %}active{% endif %}">EN</a>
                <a data-language="fr" class="{% if current_language == 'fr' %}active{% endif %}">FR</a>
            </div>
        </div>
        {% endif %}

        {# Notifications Link #}
        {% if not guest %}
            <a class="nav-link notifications" data-item="notifications">
                <span class="icon" data-svg="notification" data-i18n-title="nav.notifications_tooltip" title="{{ translate('nav.notifications_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.notifications">
                    {{ translate('nav.notifications') }}
                </span>
            </a>
        {% endif %}

    {# Login Link #}
    {% if guest and title_key != 'page_title.login' %}
        <a class="nav-link writers" data-item="login" href="{{ langUrl('login') }}">
            <span class="icon" data-svg="logIn" data-i18n-title="nav.login_tooltip" title="{{ translate('nav.login_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.login">
                {{ translate('nav.login') }}
            </span>
        </a>
    {% endif %}

    {# New Game Link #}
    {% if not guest %}
    {#
        <a class="nav-link newGame" data-item="newGame" href="{{ langUrl('text/create?new=true') }}">
            <span class="icon" data-svg="newGame" data-i18n-title="nav.newGame_tooltip" title="{{ translate('nav.newGame_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.newGame">
                {{ translate('nav.newGame') }}
            </span>
        </a>
    #}
    {% endif %}
    
    {# Journal Link #}
    {% if not guest and session.privilege == 3 %}
        <a class="nav-link writers" data-item="journal" href="{{ langUrl('journal') }}">
            <span class="icon" data-svg="journal" data-i18n-title="nav.journal_tooltip" title="{{ translate('nav.journal_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.journal">
                {{ translate('nav.journal') }}
            </span>
        </a>
    {% endif %}

    {# Dev Mode Toggle #}
    {% if not guest and session.privilege == 1 %}
        <div class="nav-link dev-mode-toggle" data-item="devMode" data-i18n-title="nav.dev_mode_tooltip" title="{{ translate('nav.dev_mode_tooltip') }}">
            <div class="current-privilege">
                {% if session.test_privilege == 2 %}REG{% elseif session.test_privilege == 4 %}BETA{% else %}ADM{% endif %}
            </div>
            <div class="nav-text" data-i18n="nav.dev_mode">
                {{ translate('nav.dev_mode') }}
            </div>
            <div class="dev-mode-dropdown">
                <a data-privilege="1" class="{% if not session.test_privilege or session.test_privilege == 1 %}active{% endif %}" data-i18n="nav.dev_mode_admin" data-i18n-title="nav.dev_mode_admin_tooltip" title="{{ translate('nav.dev_mode_admin_tooltip') }}">{{ translate('nav.dev_mode_admin') }}</a>
                <a data-privilege="2" class="{% if session.test_privilege == 2 %}active{% endif %}" data-i18n="nav.dev_mode_regular" data-i18n-title="nav.dev_mode_regular_tooltip" title="{{ translate('nav.dev_mode_regular_tooltip') }}">{{ translate('nav.dev_mode_regular') }}</a>
                <a data-privilege="4" class="{% if session.test_privilege == 4 %}active{% endif %}" data-i18n="nav.dev_mode_beta" data-i18n-title="nav.dev_mode_beta_tooltip" title="{{ translate('nav.dev_mode_beta_tooltip') }}">{{ translate('nav.dev_mode_beta') }}</a>
            </div>
        </div>
    {% endif %}
        
    {# Header Activity Indicator #}
        {# <div class="activity-indicator" id="header-activity-indicator">
            <div class="activity-content">
                <div class="activity-icon" data-svg="activity"></div>
                <div class="activity-stats">
                    <span class="activity-count total">0</span>
                    <span class="activity-separator">:</span>
                    <span class="activity-count editing">0</span>
                    <span class="activity-label">activity</span>
                </div>
            </div>
        </div> #}

    {# Logout Link #}
    {% if not guest and title_key != 'page_title.login' %}
        {#<a class="nav-link writers" data-item="logout" href="{{ langUrl('login/logout') }}">
            <span class="icon" data-svg="logOut" data-i18n-title="nav.logout_tooltip" title="{{ translate('nav.logout_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.logout">
                {{ translate('nav.logout') }}
            </span>
        </a>#}
    {% endif %}

    {# Me Switcher #}
    {% if not guest %}
        <div class="nav-link me-switcher" data-item="me" data-i18n-title="nav.me_tooltip" title="{{ translate('nav.me_tooltip') }}">
            <div class="current-me" data-svg="user" data-i18n-title="nav.me_tooltip" title="{{ translate('nav.me_tooltip') }}">
            </div>
            <div class="nav-text" data-i18n="nav.me">
                {{ translate('nav.me') }}
            </div>
            <div class="me-dropdown">
                <div class="me-dropdown-subtitle" data-i18n="nav.language" data-i18n-title="nav.language_tooltip" title="{{ translate('nav.language_tooltip') }}">{{ translate('nav.language') }}</div>
                <a data-language="en" data-i18n-title="nav.english" title="{{ translate('nav.english') }}" class="{% if current_language == 'en' %}active{% endif %}">EN</a>
                <a data-language="fr" data-i18n-title="nav.french" title="{{ translate('nav.french') }}" class="{% if current_language == 'fr' %}active{% endif %}">FR</a>
                <div class="me-dropdown-divider"></div>
                <a href="{{ langUrl('login/logout') }}" data-i18n="nav.logout" data-i18n-title="nav.logout_tooltip" title="{{ translate('nav.logout_tooltip') }}">
                    <span class="icon" data-svg="logOut"></span>
                    <span data-i18n="nav.logout">{{ translate('nav.logout') }}</span>
                </a>
            </div>
        </div>
    {% endif %}

    {# Hamburger Button #}
        {#<div class="nav-link hamburger" data-item="hamburger" data-i18n-title="nav.menu_tooltip" title="{{ translate('nav.menu_tooltip') }}">
            <span class="icon" data-svg="hamburger" data-i18n-title="nav.menu_tooltip" title="{{ translate('nav.menu_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.menu">
                {{ translate('nav.menu') }}
            </span>
        </div>#}
    </nav>

    {# Filter and Search Areas #}
    {% if title_key == 'page_title.texts' or title_key == 'page_title.collab' or title_key == 'page_title.dashboard' %}
        <div class="menu-container">
            <div class="filter-menu">
                <!-- filter menu content -->
            </div>

            <div class="search-menu">
                <!-- search menu content -->
            </div>
        </div>
    {% endif %}

    {# Notifications Area #}
    {% if not guest %}
        <div class="notifications-container">
            <div class="notifications-menu display-none">
                {% if notifications and notifications|length > 0 %}
                    {% for n in notifications %}
                    <article class="notification{% if not n.read_at %} unread{% endif %}{% if not n.seen_at %} unseen{% endif %}" data-notification-id="{{ n.id }}">
                        <button class="notification-delete" aria-label="Delete notification">&times;</button>
                        <h3 data-i18n="notifications.notification_{{ n.notification_type }}">
                            {{ translate('notifications.notification_' ~ n.notification_type) }}
                        </h3>
                        <p data-i18n="notifications.notification_{{ n.notification_type }}_text" 
                           data-i18n-html="true"
                           data-i18n-params="{{ {
                               'game_title_link': '<a href=\"' ~ langUrl('text/collab/' ~ n.root_text_id) ~ '\">' ~ n.game_title ~ '</a>',
                               'winning_title': n.winning_title
                           }|json_encode }}">
                            {{ translate('notifications.notification_' ~ n.notification_type ~ '_text', {
                                'game_title_link': '<a href="' ~ langUrl('text/collab/' ~ n.root_text_id) ~ '">' ~ n.game_title ~ '</a>',
                                'winning_title': n.winning_title
                            }, true) }}
                        </p>
                        <time>{{ n.created_at|date('Y-m-d H:i:s') }}</time>
                    </article>
                    {% endfor %}
                {% else %}
                    <p class="no-notifications-message" data-i18n="notifications.no_notifications">
                        {{ translate('notifications.no_notifications') }}
                    </p>
                {% endif %}
            </div>
        </div>
    {% endif %}

    {# Modal for the showcase area (selected text) #}
    <div class="modal-background display-none" data-tree-modal="hidden" data-text-id="">
        <div class="modal-with-btns">
            <div class="modal-btns">
                <div class="modal-dynamic-btns"></div>
            </div>
            <div class="modal">
                <div class="modal-dynamic-content"></div>
            </div>
        </div>
    </div>

<!--         {% if not guest %} 
            {{ translate('greeting', {name: session.writer_firstName ~ " " ~ session.writer_lastName}) }}
        {% endif %} -->

<main>
