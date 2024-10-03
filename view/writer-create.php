{{ include('header.php', {title: 'Add a Writer'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<form action="{{path}}writer/store" data-form-type="writerCreate" method="post">
        <label> first name
            <input type="text" name="firstName" value="{{ data.firstName }}">
        </label>
        <label>last name
            <input type="text" name="lastName" value="{{ data.lastName }}">
        </label>
        <label>email (will be used as username to log in)
            <input type="email" name="email" value="{{ data.email }}">
        </label>
        <label>birthday
            <input type="date" name="birthday" value="{{ data.birthday }}">
        </label>
        <label>password
            <input type="password" name="password">
        </label>
        <!--TODO: admin could create new users, I'd just need the change the Controller logic-->
<!--         {% if session.privilege == 1 %}
        <label>
            <select name="privilege_id">
                {% for privi in privilege %}
                <option value="{{privi.id}}" {% if privi.id == 2 %} selected {% endif %}>{{privi.privilege}}</option>
                {% endfor %}
            </select>
        </label> 
        {% endif %} -->
        <input type="hidden" name="privilege_id" value=2>
        <input type="hidden" name="currentPage" value="writer-create.php">
        <input type="submit" value="Save">
    </form>
{{include('footer.php')}}