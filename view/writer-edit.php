{{ include('header.php', {title: 'Add a Writer'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<form action="{{path}}writer/update" method="post">
        <input type="hidden" name="id" value="{{data.id}}">
        <label> first name
            <input type="text" name="firstName" value="{{data.firstName}}">
        </label>
        <label>last name
            <input type="text" name="lastName" value="{{data.lastName}}">
        </label>
        <label>email
            <input type="email" name="email" value="{{data.email}}">
        </label>
        <label>Date de naissance
            <input type="date" name="birthday" value="{{data.birthday}}">
        </label>
        {% if session.privilege == 1 %}
        <label>
            <select name="privilege_id">
                {% for privi in privilege %}
                <option value="{{privi.id}}" {% if privi.id == data.privilege_id %} selected {% endif %}>{{privi.privilege}}</option>
                {% endfor %}
            </select>
        </label> 
        {% endif %}
        <input type="hidden" name="currentPage" value="writer-edit.php">
        <input type="submit" value="Save">
    </form>
    <form action="{{path}}writer/destroy" method="post">
        <input type="hidden" name="id" value="{{data.id}}">
        <input type="submit" value="delete">
    </form>
{{include('footer.php')}}