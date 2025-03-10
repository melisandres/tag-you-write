{{ include('header.php', {title_key: 'page_title.forgot_password'})}}
<section class="form-page">
    <h3 data-i18n="forgot_password.reset_password">{{ translate('forgot_password.reset_password') }}</h3>
    {% if errors is defined %}
        <span class='error'>{{ errors|raw }}</span>
    {% endif %}

    <form id="main-form" action="{{ langUrl('login/send_reset_link') }}" method="post">
        <label>
            <span data-i18n="forgot_password.email">{{ translate('forgot_password.email') }}</span>
            <input type="email" name="email" value="{{data.email}}">
        </label>
        <!-- <button type="submit">Send Reset Link</button> -->
        <div class="form-btns">
            <button class="publish" type="submit" data-button-type="publish">
                <span class="icon" data-i18n-title="forgot_password.request_reset_link_tooltip" title="{{ translate('forgot_password.request_reset_link_tooltip') }}"></span>
                <span data-i18n="forgot_password.request_reset_link" class="title">{{ translate('forgot_password.request_reset_link') }}</span>
            </button>
        </div>
    </form>
</section>
{{ include('footer.php')}}