{{ include('header.php', {title_key: 'page_title.login'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}
{% if message is defined %}
    <span class='message' data-i18n="{{ message }}">{{ translate(message)|raw}}</span>
{% endif %}
<section class="form-page">
    <h3 data-i18n="login.page_title">{{ translate('login.page_title') }}</h3>


    <form id="main-form" data-form-type="login" action="{{ langUrl('login/auth') }}" method="post">

        <label>
            <span data-i18n="general.email">
                {{ translate('general.email') }}
            </span>
            <input type="email" name="email" value={{data.email}}>
        </label>
        <label>
            <span data-i18n="general.password">
                {{ translate('general.password') }}
            </span>
            <input type="password" name="password">        
        </label>

        <div class="form-btns">
            <button class="login" type="submit" value="login" data-button-type="login">
                <span class="icon" data-svg="logIn" data-i18n-title="login.login_tooltip" title="{{ translate('login.login_tooltip') }}"></span>
                <span data-i18n="login.login" class="title">{{ translate('login.login') }}</span>
            </button>
        </div>
    </form>
    <p>
        <a href="{{ langUrl('login/forgotPassword') }}" data-i18n="login.forgot_password" >{{ translate('login.forgot_password') }}</a>
    </p>
    <p>
        <a class="" href="{{ langUrl('writer/create') }}" data-i18n="login.create_account" >{{ translate('login.create_account') }}</a>
    </p>
</section>
{{ include('footer.php')}}