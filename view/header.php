<!DOCTYPE html>
<html lang="en">
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
        <a class="nav-link home" data-svg="home" title="about" href="{{path}}">?</a>    
        {% if title == 'All Texts!' %}
            <a class="nav-link filter">
                <span class="icon"></span>
            </a> 
        {% else %} 
            <a class="nav-link texts" data-svg="browse" href="{{path}}text">browse</a>  
        {% endif %}

        {% if title == 'All Texts!' %}
            <a class="nav-link search" href="{{path}}search">
                <span class="icon"></span>
            </a>
        {% elseif title == 'Story Collaboration' %}
            <a class="nav-link search" href="{{path}}search">
                <span class="icon"></span>
            </a>
        {% endif %}

    {% if guest %}
        <a class="nav-link writers" href="{{path}}login"></a>
    {% else %}
        <!-- <a class="nav-link writers" href="{{path}}writer">show all writers</a> -->
        <a class="nav-link texts" data-svg="newGame" href="{{path}}text/create?new=true">new game</a>
        <a class="nav-link notifications" data-svg="notification"></a>
        {% if session.privilege == 1 %}
            <a class="nav-link writers" href="{{path}}journal">journal</a>
        {% endif %}
        <a class="nav-link writers" href="{{path}}login/logout"></a>

    {% endif %}
<!--     {% if session.privilege == 1 or session.privilege == 2 %}
        <a href="{{path}}produit/create">Produits</a>
    {% endif %} -->
    </nav>

    {% if title == 'All Texts!' or title == 'Story Collaboration' %}
        <div class="menu-container">
            <div class="filter-menu">
                <!-- Your existing filter menu content -->
            </div>

            <div class="search-menu">
                <!-- New search menu content -->
            </div>
        </div>
    {% endif %}

    {% if notifications %}
        <div class="notifications-container">
            <div class="notifications-menu display-none">
                {% for n in notifications %}
                <article class="notification">
                    {% if n.notification_type == 'game_won' %}
                        <h3>Game Won!</h3>
                        <p>The "<a href="{{ path }}text/collab/{{ n.root_text_id }}">{{ n.game_title }}</a>" 
                           collaboration is closed. Your iteration: "{{ n.winning_title }}" has been unanimously chosen as the winner!</p>
                    {% elseif n.notification_type == 'game_closed' %}
                        <h3>Game Closed</h3>
                        <p>The "<a href="{{ path }}text/collab/{{ n.root_text_id }}">{{ n.game_title }}</a>" 
                           collaboration is closed. The winning text is "{{ n.winning_title }}"</p>
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
