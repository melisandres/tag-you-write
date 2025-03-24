{{ include('header.php', {title_key: 'page_title.home_error'})}}

    {% if message is defined %}
        <h1 class="error" data-i18n="home_error.page_title">{{ translate('home_error.page_title') }}</h1>
        <p data-i18n="{{ message }}">{{ translate(message) }}</p>
    {% else %}
        <h1 class="error" data-i18n="home_error.page_title">{{ translate('home_error.page_title') }}</h1>
        <p> 
            <span data-i18n="home_error.default_error_message">{{ translate('home_error.default_error_message') }}</span>
        </p>
    {% endif %}

{{ include('footer.php')}}