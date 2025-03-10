{{ include('header.php', {title_key: 'page_title.writer_create'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<form action="{{ langUrl('writer/store') }}" id="main-form" data-form-type="writerCreate" method="post">
        <label> 
            <span data-i18n="writer-create.first_name">{{ translate('writer-create.first_name') }}</span>
            <input type="text" name="firstName" value="{{ data.firstName }}">
        </label>
        <label>
            <span data-i18n="writer-create.last_name">{{ translate('writer-create.last_name') }}</span>
            <input type="text" name="lastName" value="{{ data.lastName }}">
        </label>
        <label>
            <span data-i18n="writer-create.email">{{ translate('writer-create.email') }}</span>
            <input type="email" name="email" value="{{ data.email }}">
        </label>
            <label>
            <span data-i18n="writer-create.birthday">{{ translate('writer-create.birthday') }}</span>
            <input type="date" name="birthday" value="{{ data.birthday }}">
        </label>
        <label>
            <span data-i18n="writer-create.password">{{ translate('writer-create.password') }}</span>
            <input type="password" name="password">
        </label>
        <!--TODO: admin could create new users, I'd just need the change the Controller logic-->
<!--         {% if session.privilege == 1 %}
        <label>
            <select name="privilege_id">
                {% for privi in privilege %}
                <option value="{{privi.id}}" {% if privi.id == 2 %} selected {% endif %}>{{privi.privilege}}</option>
                {% endfor %}
            </select>
        </label> 
        {% endif %} -->
        <input type="hidden" name="privilege_id" value=2>
        <input type="hidden" name="currentPage" value="writer-create.php">
        <div class="form-btns">
            <button class="save" type="button" data-status="writerSave" data-button-type="save">
                <span class="icon" data-svg="save" data-i18n-title="writer-create.save_tooltip" title="{{ translate('writer-create.save_tooltip') }}"></span>
                <span class="title" data-i18n="writer-create.save">{{ translate('writer-create.save') }}</span>
            </button>
        </div>
    </form>
{{include('footer.php')}}