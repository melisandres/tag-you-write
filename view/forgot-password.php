{{ include('header.php', {title: 'forgot password'})}}
<section class="form-page">
    <h3>Reset Password</h3>
    {% if errors is defined %}
        <span class='error'>{{ errors|raw }}</span>
    {% endif %}

    <form action="{{path}}login/sendResetLink" method="post">
        <label>Email
            <input type="email" name="email" value="{{data.email}}">
        </label>
        <button type="submit">Send Reset Link</button>
    </form>
</section>
{{ include('footer.php')}}