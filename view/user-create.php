{{ include('header.php', {title: 'Join our community'})}}
<section class="form-page">
    {% if errors is defined %}
        <span class='error'>{{ errors|raw}}</span>
    {% endif %}

    <form action="{{path}}user/store" method="post">
        <label> first name
            <input type="text" name="firstName">
        </label>
        <label>last name
            <input type="text" name="lastName">
        </label>
        <label>birthday
            <input type="date" name="birthday">
        </label>
        <label>email (will be used as username to log in)
            <input type="email" name="username">
        </label>
        <label>password
            <input type="text" name="password">
        </label>
        <label>bio
            <input type="text" name="bio">
        </label>
<!--    <label>
            <select name="privilege_id">
                {% for privi in privilege %}
                <option value="{{privi.id}}" {% if privi.id == data.privilege_id %} selected {% endif %}>{{privi.privilege}}</option>
                {% endfor %}
            </select>
        </label> 
-->
        <input type="hidden" name="privilege_id" value="2">
        <input type="submit" value="Save">
    </form>
</section>
{{ include('footer.php')}}