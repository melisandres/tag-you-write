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
        <div class="nav-link tutorial-switcher" data-item="tutorial" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
            <div class="current-tutorial" data-svg="how" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
            </div>
            <div class="nav-text" data-i18n="nav.tutorial">
                {{ translate('nav.tutorial') }}
            </div>
            <div class="tutorial-dropdown">
                <a data-tutorial="start-game" data-i18n="nav.tutorial_start_game" data-i18n-title="nav.tutorial_start_game_tooltip" title="{{ translate('nav.tutorial_start_game_tooltip') }}">{{ translate('nav.tutorial_start_game') }}</a>
                <a data-tutorial="contribute" data-i18n="nav.tutorial_contribute" data-i18n-title="nav.tutorial_contribute_tooltip" title="{{ translate('nav.tutorial_contribute_tooltip') }}">{{ translate('nav.tutorial_contribute') }}</a>
                <a data-tutorial="vote" data-i18n="nav.tutorial_vote" data-i18n-title="nav.tutorial_vote_tooltip" title="{{ translate('nav.tutorial_vote_tooltip') }}">{{ translate('nav.tutorial_vote') }}</a>
            </div>
        </div>
        {% if title_key != 'page_title.home' %}
        <a class="nav-link home" data-item="home" href="{{ langUrl('') }}">
            <span class="icon" data-svg="home" data-i18n-title="nav.home_tooltip" title="{{ translate('nav.home_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.home">
                {{ translate('nav.home') }}
            </span>
        </a>
        {% endif %}
        {% if title_key != 'page_title.dashboard' %}
        <a class="nav-link dashboard-nav" data-item="dashboard" href="{{ langUrl('dashboard') }}">
            <span class="icon" data-svg="dashboard" data-i18n-title="nav.dashboard_tooltip" title="{{ translate('nav.dashboard_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.dashboard">
                {{ translate('nav.dashboard') }}
            </span>
        </a>
        {% endif %}

        {% if title_key == 'page_title.texts' or title_key == 'page_title.dashboard' %}
            <a class="nav-link filter" data-item="filter">
                <span class="icon" data-svg="filter" data-i18n-title="nav.filter_tooltip" title="{{ translate('nav.filter_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.filter">
                    {{ translate('nav.filter') }}
                </span>
            </a> 
        {% else %} 
            <a class="nav-link texts" data-item="browse" href="{{ langUrl('text') }}">
                <span class="icon" data-svg="browse" data-i18n-title="nav.browse_tooltip" title="{{ translate('nav.browse_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.browse">
                    {{ translate('nav.browse') }}
                </span>
            </a>  
        {% endif %}

        {% if title_key == 'page_title.texts' or title_key == 'page_title.collab' or title_key == 'page_title.dashboard' %}
            <a class="nav-link search" data-item="search" href="{{ langUrl('search') }}">
                <span class="icon" data-svg="search" data-i18n-title="nav.search_tooltip" title="{{ translate('nav.search_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.search">
                    {{ translate('nav.search') }}
                </span>
            </a>
        {% endif %}

    {% if guest and title_key != 'page_title.login' %}
        <a class="nav-link writers" data-item="login" href="{{ langUrl('login') }}">
            <span class="icon" data-svg="logIn" data-i18n-title="nav.login_tooltip" title="{{ translate('nav.login_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.login">
                {{ translate('nav.login') }}
            </span>
        </a>
    {% endif %}
    {% if not guest %}
        <!-- <a class="nav-link writers" href="{{path}}writer">show all writers</a> -->
        <!-- <a class="nav-link newGame" href="{{path}}text/create?new=true"> -->
        <a class="nav-link newGame" data-item="newGame" href="{{ langUrl('text/create?new=true') }}">
            <span class="icon" data-svg="newGame" data-i18n-title="nav.newGame_tooltip" title="{{ translate('nav.newGame_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.newGame">
                {{ translate('nav.newGame') }}
            </span>
        </a>

        <a class="nav-link notifications" data-item="notifications">
            <span class="icon" data-svg="notification" data-i18n-title="nav.notifications_tooltip" title="{{ translate('nav.notifications_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.notifications">
                {{ translate('nav.notifications') }}
            </span>
        </a>
        {% if session.privilege == 3 %}
            <a class="nav-link writers" data-item="journal" href="{{ langUrl('journal') }}">
                <span class="icon" data-svg="journal" data-i18n-title="nav.journal_tooltip" title="{{ translate('nav.journal_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.journal">
                    {{ translate('nav.journal') }}
                </span>
            </a>
        {% endif %}
        {% if session.privilege == 1 %}
            <div class="nav-link dev-mode-toggle" data-item="devMode" data-i18n-title="nav.dev_mode_tooltip" title="{{ translate('nav.dev_mode_tooltip') }}">
                <div class="current-privilege">
                    {% if session.test_privilege == 2 %}REG{% elseif session.test_privilege == 4 %}BETA{% else %}ADM{% endif %}
                </div>
                <div class="nav-text" data-i18n="nav.dev_mode">
                    {{ translate('nav.dev_mode') }}
                </div>
                <div class="dev-mode-dropdown">
                    <a data-privilege="1" class="{% if not session.test_privilege or session.test_privilege == 1 %}active{% endif %}" data-i18n="nav.dev_mode_admin">Admin</a>
                    <a data-privilege="2" class="{% if session.test_privilege == 2 %}active{% endif %}" data-i18n="nav.dev_mode_regular">Regular User</a>
                    <a data-privilege="4" class="{% if session.test_privilege == 4 %}active{% endif %}" data-i18n="nav.dev_mode_beta">Beta Tester</a>
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
    {% endif %}

    {% if not guest and title_key != 'page_title.login' %}
        <a class="nav-link writers" data-item="logout" href="{{ langUrl('login/logout') }}">
            <span class="icon" data-svg="logOut" data-i18n-title="nav.logout_tooltip" title="{{ translate('nav.logout_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.logout">
                {{ translate('nav.logout') }}
            </span>
        </a>
    {% endif %}
        <div class="nav-link hamburger" data-item="hamburger" data-i18n-title="nav.menu_tooltip" title="{{ translate('nav.menu_tooltip') }}">
            <span class="icon" data-svg="hamburger" data-i18n-title="nav.menu_tooltip" title="{{ translate('nav.menu_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.menu">
                {{ translate('nav.menu') }}
            </span>
        </div>
<!--     {% if session.privilege == 1 or session.privilege == 2 %}
        <a href="{{path}}produit/create">Produits</a>
    {% endif %} -->
    </nav>

    <!-- Overflow Menu -->
    <div class="overflow-menu-overlay"></div>
    <div class="overflow-menu">
        <div class="overflow-menu-header">
            <!-- Back Button (hidden by default, shown when submenu is active) -->
            <button class="overflow-menu-back" aria-label="Back to main menu" style="display: none;">
                <span class="back-arrow">←</span>
                <span class="back-text" data-i18n="nav.back">{{ translate('nav.back') }}</span>
            </button>
            
            <!-- Close Button -->
            <button class="overflow-menu-close" aria-label="Close menu">
                <span class="icon" data-svg="close"></span>
            </button>
        </div>
        <div class="overflow-menu-content">
            <!-- Main Menu Column -->
            <div class="overflow-menu-main">
                <!-- Language Switcher -->
                <div class="overflow-menu-item">
                    <div class="nav-link language-switcher" data-item="language" data-i18n-title="nav.language_tooltip" title="{{ translate('nav.language_tooltip') }}">
                        <div class="current-language">
                            {% if current_language == 'en' %}EN{% else %}FR{% endif %}
                        </div>
                        <div class="nav-text" data-i18n="nav.language">
                            {{ translate('nav.language') }}
                        </div>
                    </div>
                </div>

                <!-- Tutorial Switcher -->
                <div class="overflow-menu-item">
                    <div class="nav-link tutorial-switcher" data-item="tutorial" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
                        <div class="current-tutorial" data-svg="how" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
                        </div>
                        <div class="nav-text" data-i18n="nav.tutorial">
                            {{ translate('nav.tutorial') }}
                        </div>
                    </div>
                </div>

            

            <!-- Home Link -->
            {% if title_key != 'page_title.home' %}
            <div class="overflow-menu-item">
                <a class="nav-link home" data-item="home" href="{{ langUrl('') }}">
                    <span class="icon" data-svg="home" data-i18n-title="nav.home_tooltip" title="{{ translate('nav.home_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.home">
                        {{ translate('nav.home') }}
                    </span>
                </a>
            </div>
            {% endif %}

            <!-- Dashboard Link -->
            {% if title_key != 'page_title.dashboard' %}
            <div class="overflow-menu-item">
                <a class="nav-link dashboard-nav" data-item="dashboard" href="{{ langUrl('dashboard') }}">
                    <span class="icon" data-svg="dashboard" data-i18n-title="nav.dashboard_tooltip" title="{{ translate('nav.dashboard_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.dashboard">
                        {{ translate('nav.dashboard') }}
                    </span>
                </a>
            </div>
            {% endif %}

            <!-- Browse/Filter Link -->
            {% if title_key == 'page_title.texts' %}
            <div class="overflow-menu-item">
                <a class="nav-link filter" data-item="filter">
                    <span class="icon" data-svg="filter" data-i18n-title="nav.filter_tooltip" title="{{ translate('nav.filter_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.filter">
                        {{ translate('nav.filter') }}
                    </span>
                </a>
            </div>
            {% else %}
            <div class="overflow-menu-item">
                <a class="nav-link texts" data-item="browse" href="{{ langUrl('text') }}">
                    <span class="icon" data-svg="browse" data-i18n-title="nav.browse_tooltip" title="{{ translate('nav.browse_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.browse">
                        {{ translate('nav.browse') }}
                    </span>
                </a>
            </div>
            {% endif %}

            <!-- Search Link -->
            {% if title_key == 'page_title.texts' or title_key == 'page_title.collab' %}
            <div class="overflow-menu-item">
                <a class="nav-link search" data-item="search" href="{{ langUrl('search') }}">
                    <span class="icon" data-svg="search" data-i18n-title="nav.search_tooltip" title="{{ translate('nav.search_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.search">
                        {{ translate('nav.search') }}
                    </span>
                </a>
            </div>
            {% endif %}

            <!-- Login Link (for guests) -->
            {% if guest and title_key != 'page_title.login' %}
            <div class="overflow-menu-item">
                <a class="nav-link writers" data-item="login" href="{{ langUrl('login') }}">
                    <span class="icon" data-svg="logIn" data-i18n-title="nav.login_tooltip" title="{{ translate('nav.login_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.login">
                        {{ translate('nav.login') }}
                    </span>
                </a>
            </div>
            {% endif %}

            <!-- New Game Link (for logged in users) -->
            {% if not guest %}
            <div class="overflow-menu-item">
                <a class="nav-link newGame" data-item="newGame" href="{{ langUrl('text/create?new=true') }}">
                    <span class="icon" data-svg="newGame" data-i18n-title="nav.newGame_tooltip" title="{{ translate('nav.newGame_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.newGame">
                        {{ translate('nav.newGame') }}
                    </span>
                </a>
            </div>

            <!-- Notifications Link -->
            <div class="overflow-menu-item">
                <a class="nav-link notifications" data-item="notifications">
                    <span class="icon" data-svg="notification" data-i18n-title="nav.notifications_tooltip" title="{{ translate('nav.notifications_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.notifications">
                        {{ translate('nav.notifications') }}
                    </span>
                </a>
            </div>

            <!-- Journal Link (for admin) -->
            {% if session.privilege == 1 %}
            <div class="overflow-menu-item">
                <a class="nav-link writers" data-item="journal" href="{{ langUrl('journal') }}">
                    <span class="icon" data-svg="journal" data-i18n-title="nav.journal_tooltip" title="{{ translate('nav.journal_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.journal">
                        {{ translate('nav.journal') }}
                    </span>
                </a>
            </div>

            <!-- Dev Mode Toggle (for admin) -->
            <div class="overflow-menu-item">
                <div class="nav-link dev-mode-toggle" data-item="devMode" data-i18n-title="nav.dev_mode_tooltip" title="{{ translate('nav.dev_mode_tooltip') }}">
                    <div class="current-privilege">
                        {% if session.test_privilege == 2 %}REG{% elseif session.test_privilege == 4 %}BETA{% else %}ADM{% endif %}
                    </div>
                    <div class="nav-text" data-i18n="nav.dev_mode">
                        {{ translate('nav.dev_mode') }}
                    </div>
                </div>
            </div>
            {% endif %}
        {% endif %}
            <!-- About Link -->
            <div class="overflow-menu-item">
                <button class="nav-link about" data-item="about" data-i18n-title="nav.about_tooltip" title="{{ translate('nav.about_tooltip') }}">
                    <span class="icon" data-svg="about" data-i18n-title="nav.about_tooltip" title="{{ translate('nav.about_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.about">
                        {{ translate('nav.about') }}
                    </span>
                </button>
            </div>
        {% if not guest %}
            <!-- Logout Link -->
            {% if title_key != 'page_title.login' %}
            <div class="overflow-menu-item">
                <a class="nav-link writers" data-item="logout" href="{{ langUrl('login/logout') }}">
                    <span class="icon" data-svg="logOut" data-i18n-title="nav.logout_tooltip" title="{{ translate('nav.logout_tooltip') }}"></span>
                    <span class="nav-text" data-i18n="nav.logout">
                        {{ translate('nav.logout') }}
                    </span>
                </a>
            </div>
            {% endif %}
            {% endif %}
            </div>
            
            <!-- Submenu Column -->
            <div class="overflow-menu-submenu">
                <!-- Language Submenu -->
                <div class="submenu-content language-submenu" data-submenu="language">
                    <h3 data-i18n="nav.language">{{ translate('nav.language') }}</h3>
                    <a data-language="en" class="{% if current_language == 'en' %}active{% endif %}">English</a>
                    <a data-language="fr" class="{% if current_language == 'fr' %}active{% endif %}">Français</a>
                </div>
                
                <!-- Tutorial Submenu -->
                <div class="submenu-content tutorial-submenu" data-submenu="tutorial">
                    <h3 data-i18n="nav.tutorial">{{ translate('nav.tutorial') }}</h3>
                    <a data-tutorial="start-game" data-i18n="nav.tutorial_start_game">{{ translate('nav.tutorial_start_game') }}</a>
                    <a data-tutorial="contribute" data-i18n="nav.tutorial_contribute">{{ translate('nav.tutorial_contribute') }}</a>
                    <a data-tutorial="vote" data-i18n="nav.tutorial_vote">{{ translate('nav.tutorial_vote') }}</a>
                </div>
                
                <!-- Dev Mode Submenu (for admin) -->
                {% if session.privilege == 1 %}
                <div class="submenu-content dev-mode-submenu" data-submenu="devMode">
                    <h3 data-i18n="nav.dev_mode">{{ translate('nav.dev_mode') }}</h3>
                    <a data-privilege="1" class="{% if not session.test_privilege or session.test_privilege == 1 %}active{% endif %}" data-i18n="nav.dev_mode_admin">{{ translate('nav.dev_mode_admin') }}</a>
                    <a data-privilege="2" class="{% if session.test_privilege == 2 %}active{% endif %}" data-i18n="nav.dev_mode_regular">{{ translate('nav.dev_mode_regular') }}</a>
                    <a data-privilege="4" class="{% if session.test_privilege == 4 %}active{% endif %}" data-i18n="nav.dev_mode_beta">{{ translate('nav.dev_mode_beta') }}</a>
                </div>
                {% endif %}
            </div>
        </div>
    </div>

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

    <!-- a modal for the showcase area (selected text) -->
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
