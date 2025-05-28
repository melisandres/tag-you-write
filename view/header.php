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
        <div class="nav-link language-switcher" data-i18n-title="nav.language_tooltip" title="{{ translate('nav.language_tooltip') }}">
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
        {% if title_key != 'page_title.home' %}
        <a class="nav-link home" href="{{ langUrl('') }}">
            <span class="icon" data-svg="home" data-i18n-title="nav.home_tooltip" title="{{ translate('nav.home_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.home">
                {{ translate('nav.home') }}
            </span>
        </a>  
        {% endif %}

        {% if title_key == 'page_title.texts' %}
            <a class="nav-link filter">
                <span class="icon" data-svg="filter" data-i18n-title="nav.filter_tooltip" title="{{ translate('nav.filter_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.filter">
                    {{ translate('nav.filter') }}
                </span>
            </a> 
        {% else %} 
            <a class="nav-link texts" href="{{ langUrl('text') }}">
                <span class="icon" data-svg="browse" data-i18n-title="nav.browse_tooltip" title="{{ translate('nav.browse_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.browse">
                    {{ translate('nav.browse') }}
                </span>
            </a>  
        {% endif %}

        {% if title_key == 'page_title.texts' or title_key == 'page_title.collab' %}
            <a class="nav-link search" href="{{ langUrl('search') }}">
                <span class="icon" data-svg="search" data-i18n-title="nav.search_tooltip" title="{{ translate('nav.search_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.search">
                    {{ translate('nav.search') }}
                </span>
            </a>
        {% endif %}

    {% if guest and title_key != 'page_title.login' %}
        <a class="nav-link writers" href="{{ langUrl('login') }}">
            <span class="icon" data-svg="logIn" data-i18n-title="nav.login_tooltip" title="{{ translate('nav.login_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.login">
                {{ translate('nav.login') }}
            </span>
        </a>
    {% endif %}
    {% if not guest %}
        <!-- <a class="nav-link writers" href="{{path}}writer">show all writers</a> -->
        <!-- <a class="nav-link newGame" href="{{path}}text/create?new=true"> -->
        <a class="nav-link newGame" href="{{ langUrl('text/create?new=true') }}">
            <span class="icon" data-svg="newGame" data-i18n-title="nav.newGame_tooltip" title="{{ translate('nav.newGame_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.newGame">
                {{ translate('nav.newGame') }}
            </span>
        </a>

        <a class="nav-link notifications">
            <span class="icon" data-svg="notification" data-i18n-title="nav.notifications_tooltip" title="{{ translate('nav.notifications_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.notifications">
                {{ translate('nav.notifications') }}
            </span>
        </a>
        {% if session.privilege == 1 %}
            <a class="nav-link writers" href="{{ langUrl('journal') }}">
                <span class="icon" data-svg="journal" data-i18n-title="nav.journal_tooltip" title="{{ translate('nav.journal_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.journal">
                    {{ translate('nav.journal') }}
                </span>
            </a>
        {% endif %}
    {% endif %}

    {% if not guest and title_key != 'page_title.login' %}
        <a class="nav-link writers" href="{{ langUrl('login/logout') }}">
            <span class="icon" data-svg="logOut" data-i18n-title="nav.logout_tooltip" title="{{ translate('nav.logout_tooltip') }}"></span>
            <span class="nav-text" data-i18n="nav.logout">
                {{ translate('nav.logout') }}
            </span>
        </a>
    {% endif %}
<!--     {% if session.privilege == 1 or session.privilege == 2 %}
        <a href="{{path}}produit/create">Produits</a>
    {% endif %} -->
    </nav>

    {% if title_key == 'page_title.texts' or title_key == 'page_title.collab' %}
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
                <button class="close-modal">×</button> 
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
