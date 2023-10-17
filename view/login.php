{{ include('header.php', {title: 'Log in'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<h3>Login</h3>


<form action="{{path}}login/auth" method="post">

        <label>username
            <input type="email" name="email" value={{data.email}}>
        </label>
        <label>password
            <input type="password" name="password">
        </label>
       
        <input type="submit" value="Login">
    </form>
</body>
</html>