{{ include('header.php', {title: 'reset password'})}}
<section class="form-page">
    <h3>Set New Password</h3>
    {% if errors is defined %}
        <span class='error'>{{ errors|raw }}</span>
    {% endif %}

    <form id="main-form" action="{{path}}login/updatePassword" method="post">
        <input type="hidden" name="token" value="{{token}}">
        <label>New Password
            <input type="password" name="password">
        </label>
<!--         <button type="submit">Update Password</button> -->
        <div class="form-btns">
            <button class="save" type="submit" data-button-type="save">
                <span class="icon"></span>
                <span class="title">Update Password</span>
            </button>
        </div>
    </form>
</section>
{{ include('footer.php')}}