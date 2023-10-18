<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ title }}</title>
    <link rel="stylesheet" href="{{path}}assets/css/main.css">
</head>
<body>
    <nav>     
        <a class="nav-link texts" href="{{path}}text">see all the texts</a>     
    {% if guest %}
        <a class="nav-link writers" href="{{path}}writer/create">join our community</a>
        <a class="nav-link writers" href="{{path}}login">Login</a>
    {% else %}
        <a class="nav-link writers" href="{{path}}writer">show all writers</a>
        <a class="nav-link texts" href="{{path}}text/create">write something</a>
        <a class="nav-link writers" href="{{path}}login/logout">Log out</a>
    {% endif %}

    </nav>
    <p>
        {% if not guest %} Hello{{ " " ~ session.writer_firstName ~ " " ~ session.writer_lastName }},
        {% endif %}
    </p>
<main>
