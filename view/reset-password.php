{{ include('header.php', {title_key: 'page_title.reset_password'})}}
<section class="form-page">
    <h3 data-i18n="reset_password.page_title">{{ translate('reset_password.page_title') }}</h3>
    {% if errors is defined %}
        <span class='error'>{{ errors|raw }}</span>
    {% endif %}

    <form id="main-form" action="{{ langUrl('login/updatePassword') }}" method="post">
        <input type="hidden" name="token" value="{{token}}">
        <label><span data-i18n="reset_password.new_password">{{ translate('reset_password.new_password') }}</span>
            <input type="password" name="password">
        </label>
<!--         <button type="submit">Update Password</button> -->
        <div class="form-btns">
            <button class="save" type="submit" data-button-type="save">
                <span class="icon" data-svg="save" data-i18n-title="reset_password.update_password_tooltip" title="{{ translate('reset_password.update_password_tooltip') }}"></span>
                <span class="title" data-i18n="reset_password.update_password">
                    {{ translate('reset_password.update_password') }}
                </span>
            </button>
        </div>
    </form>
</section>
{{ include('footer.php')}}  