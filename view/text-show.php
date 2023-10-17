{{ include('header.php', {title: 'read quietly'})}}

<h1><strong>author: </strong><span class="author">{{ text.firstName }} {{ text.lastName }}</span></h1>
    <p><strong>title: </strong>{{ text.title }}</p>
    <p><strong>date: </strong>{{ text.date }}</p>

    {% set count = 0 %}
    {% for key, value in keywords %}
        {% set count = count + 1 %}
        <p class='keyword' data-keyword-index='{{ key }}'>keyword {{ count }}: {{ value }}</p>
    {% endfor %}

    <p><strong>text: </strong>{{ text.writing }}</p>

    {% if session.writer_id == text.writer_id %}
    <form action="{{path}}text/delete" method="POST">
        <input type="hidden" name="id" value="{{ text.id }}" >
        <input type="hidden" name="parent_id" value="{{ text.parent_id}}">
        {% if isParent or session.writer_id != text.writer_id %}
        <input type="submit" disabled="true" value="delete" title="Can not be deleted. Other texts iterate on it.">
        {% else %}
        <input type="submit" value="delete">
        {% endif %}
    </form>
    {% endif %}

    {% if session.writer_id == text.writer_id %}
    <form action="{{path}}text/edit" method="POST">
        <input type="hidden" name="id" value="{{ text.id }}" >
        <input type="hidden" name="parent_id" value="{{ text.parent_id}}">
        {% if isParent or session.writer_id != text.writer_id %}
        <input type="submit" disabled="true" value="edit" title="Can not be changed. Other texts iterate on it.">
        {% else %}
        <input type="submit" value="edit">
        {% endif %}
    </form>
    {% endif %}

    {% if session.fingerPrint %}
    <form action="{{path}}text/iterate" method="POST">  
        <!--parent id is the id of the parent text-->    
        <input type="hidden" name="id" value="{{ text.id }}" >
        <input type="submit" value="iterate" >
    </form>
    {% endif %}

{{include('footer.php')}}