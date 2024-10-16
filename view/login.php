{{ include('header.php', {title: 'Log in'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}
<section class="form-page">
    <h3>Login</h3>


    <form id="main-form" data-form-type="login" action="{{path}}login/auth" method="post">

        <label>username
            <input type="email" name="email" value={{data.email}}>
        </label>
        <label>password
            <input type="password" name="password">        
        </label>

        <div class="form-btns">
            <button class="login" type="submit" value="login" data-button-type="login">
                <span class="icon"></span>
                <span class="title">login</span>
            </button>
        </div>
    </form>
    <p>
        <a href="">forgot password</a>
    </p>
    <p>
        <a class="" href="{{path}}writer/create">create an account</a>
    </p>
</section>
{{ include('footer.php', {title: 'Log in'})}}