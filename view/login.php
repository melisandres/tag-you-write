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
            <button type="submit" value="Login">    
                <div class="icon"></div>
                <div class="title">login</div>
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