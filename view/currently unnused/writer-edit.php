{{ include('header.php', {title_key: 'page_title.writer_edit'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<form action=" {{ langUrl('writer/update') }}" method="post">
        <input type="hidden" name="id" value="{{data.id}}">
        <label> 
            <span data-i18n="writer-create.first_name">{{ translate('writer-create.first_name') }}</span>
            <input type="text" name="firstName" value="{{data.firstName}}">
        </label>
        <label>
            <span data-i18n="writer-create.last_name">{{ translate('writer-create.last_name') }}</span>
            <input type="text" name="lastName" value="{{data.lastName}}">
        </label>
        <label>
            <span data-i18n="writer-create.email">{{ translate('writer-create.email') }}</span>
            <input type="email" name="email" value="{{data.email}}">
        </label>
        <label>
            <span data-i18n="writer-create.birthday">{{ translate('writer-create.birthday') }}</span>
            <input type="date" name="birthday" value="{{data.birthday}}">
        </label>
        {% if session.privilege == 1 %}
        <label>
            <select name="privilege_id">
                {% for privi in privilege %}
                <option value="{{privi.id}}" {% if privi.id == data.privilege_id %} selected {% endif %}>{{privi.privilege}}</option>
                {% endfor %}
            </select>
        </label> 
        {% endif %}
        <input type="hidden" name="currentPage" value="writer-edit.php">
        <input type="submit" value="Save">
    </form>
    <form action="{{path}}writer/destroy" method="post">
        <input type="hidden" name="id" value="{{data.id}}">
        <input type="submit" value="delete">
    </form>
{{include('footer.php')}}