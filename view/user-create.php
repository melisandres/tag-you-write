{{ include('header.php', {title: 'Join our community'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}


<form action="{{path}}user/store" method="post">
        <label> name
            <input type="text" name="name" value={{data.name}}>
        </label>
        <label>username
            <input type="email" name="username" value={{data.username}}>
        </label>
        <label>password
            <input type="password" name="password" value={{data.password}}>
        </label>
    
        <label>
            <select name="privilege_id">
                {% for privi in privilege %}
                <option value="{{privi.id}}" {% if privi.id == data.privilege_id %} selected {% endif %}>{{privi.privilege}}</option>
                {% endfor %}
            </select>
        </label>
        
        <input type="submit" value="Save">
    </form>
</body>
</html>