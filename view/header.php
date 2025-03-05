<!DOCTYPE html>
<html lang="{{ current_language }}">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="user" data-user-id="{{ session.writer_id ? session.writer_id : 'null' }}" data-guest="{{ guest ? 'true' : 'false' }}">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
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
        <div class="nav-link language-switcher">
            <div class="current-language">
                {% if current_language == 'en' %}EN{% else %}FR{% endif %}
            </div>
            <div class="nav-text" data-i18n="language">
                {{ translate('language') }}
            </div>
            <div class="language-dropdown">
                <a data-language="en" class="{% if current_language == 'en' %}active{% endif %}">EN</a>
                <a data-language="fr" class="{% if current_language == 'fr' %}active{% endif %}">FR</a>
            </div>
        </div>
        {% if title != 'Welcome' %}
        <a class="nav-link home" href="{{ langUrl('') }}">
            <span class="icon" data-svg="home"></span>
            <span class="nav-text" data-i18n="home">
                {{ translate('home') }}
            </span>
        </a>  
        {% endif %}
        {% if title == 'All Texts!' %}
            <a class="nav-link filter">
                <span class="icon"></span>
                <span class="nav-text" data-i18n="filter">
                    {{ translate('filter') }}
                </span>
            </a> 
        {% else %} 
            <a class="nav-link texts" href="{{ langUrl('text') }}">
                <span data-svg="browse" class="icon"></span>
                <span class="nav-text" data-i18n="browse">
                    {{ translate('browse') }}
                </span>
            </a>  
        {% endif %}

        {% if title == 'All Texts!' or title == 'Story Collaboration' %}
            <a class="nav-link search" href="{{ langUrl('search') }}">
                <span class="icon"></span>
                <span class="nav-text" data-i18n="search">
                    {{ translate('search') }}
                </span>
            </a>
        {% endif %}

    {% if guest %}
        <a class="nav-link writers" href="{{ langUrl('login') }}">
            <span class="icon" data-svg="login"></span>
            <span class="nav-text" data-i18n="login">
                {{ translate('login') }}
            </span>
        </a>
    {% else %}
        <!-- <a class="nav-link writers" href="{{path}}writer">show all writers</a> -->
        <!-- <a class="nav-link newGame" href="{{path}}text/create?new=true"> -->
        <a class="nav-link newGame" href="{{ langUrl('text/create?new=true') }}">
            <span class="icon" data-svg="newGame"></span>
            <span class="nav-text" data-i18n="newGame">
                {{ translate('newGame') }}
            </span>
        </a>

        <a class="nav-link notifications">
            <span class="icon" data-svg="notification"></span>
            <span class="nav-text" data-i18n="notifications">
                {{ translate('notifications') }}
            </span>
        </a>
        {% if session.privilege == 1 %}
            <a class="nav-link writers" href="{{ langUrl('journal') }}">
                <span class="icon" data-svg="journal">j</span>
                <span class="nav-text" data-i18n="journal">
                    {{ translate('journal') }}
                </span>
            </a>
        {% endif %}
        <a class="nav-link writers" href="{{ langUrl('login/logout') }}">
            <span class="icon" data-svg="logout"></span>
            <span class="nav-text" data-i18n="logout">
                {{ translate('logout') }}
            </span>
        </a>

    {% endif %}
<!--     {% if session.privilege == 1 or session.privilege == 2 %}
        <a href="{{path}}produit/create">Produits</a>
    {% endif %} -->
    </nav>

    {% if title == 'All Texts!' or title == 'Story Collaboration' %}
        <div class="menu-container">
            <div class="filter-menu">
                <!-- filter menu content -->
            </div>

            <div class="search-menu">
                <!-- search menu content -->
            </div>
        </div>
    {% endif %}

    {% if notifications %}
        <div class="notifications-container">
            <div class="notifications-menu display-none">
                {% for n in notifications %}
                <article class="notification">
                    {% if n.notification_type == 'game_won' %}
                        <h3 data-i18n="notification_game_won">
                            {{ translate('notification_game_won') }}
                        </h3>
                        <p data-i18n="notification_game_won_text" 
                           data-i18n-params="{{ {
                               'game_title_link': '<a href=\"' ~ langUrl('text/collab/' ~ n.root_text_id) ~ '\">' ~ n.game_title ~ '</a>',
                               'winning_title': n.winning_title
                           }|json_encode }}">
                            {{ translate('notification_game_won_text', {
                                'game_title_link': '<a href="' ~ langUrl('text/collab/' ~ n.root_text_id) ~ '">' ~ n.game_title ~ '</a>',
                                'winning_title': n.winning_title
                            }, true) }}
                        </p>
                    {% elseif n.notification_type == 'game_closed' %}
                        <h3 data-i18n="notification_game_closed">
                            {{ translate('notification_game_closed') }}
                        </h3>
                        <p data-i18n="notification_game_closed_text" 
                           data-i18n-params="{{ {
                               'game_title_link': '<a href=\"' ~ langUrl('text/collab/' ~ n.root_text_id) ~ '\">' ~ n.game_title ~ '</a>',
                               'winning_title': n.winning_title
                           }|json_encode }}">
                            {{ translate('notification_game_closed_text', {
                                'game_title_link': '<a href="' ~ langUrl('text/collab/' ~ n.root_text_id) ~ '">' ~ n.game_title ~ '</a>',
                                'winning_title': n.winning_title
                            }, true) }}
                        </p>
                    {% endif %}
                    <time>{{ n.created_at }}</time>
                </article>
                {% endfor %}
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
<!--     <p>
        {% if not guest %} 
            Hello{{ " " ~ session.writer_firstName ~ " " ~ session.writer_lastName }},
        {% endif %}
    </p> -->
<main>
