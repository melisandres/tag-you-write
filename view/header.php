<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <link rel="stylesheet" href="{{path}}assets/css/main.css">
    <script type="module" src="https://d3js.org/d3.v7.min.js" defer></script>
    <script src="{{ path }}assets/js/main.js" type="module" defer></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Livvic:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,900&display=swap" rel="stylesheet">
</head>
<body>
    <nav>   
        <a class="nav-link home" href="{{path}}">?</a>    
        <a class="nav-link texts" href="{{path}}text">all games</a>     
    {% if guest %}
        <a class="nav-link writers" href="{{path}}login">login</a>
    {% else %}
        <!-- <a class="nav-link writers" href="{{path}}writer">show all writers</a> -->
        <a class="nav-link texts" href="{{path}}text/create">new game</a>
        {% if session.privilege == 1 %}
            <a class="nav-link writers" href="{{path}}journal">journal</a>
        {% endif %}
        <a class="nav-link writers" href="{{path}}login/logout">logout</a>
    {% endif %}
<!--     {% if session.privilege == 1 or session.privilege == 2 %}
        <a href="{{path}}produit/create">Produits</a>
    {% endif %} -->
    </nav>



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
