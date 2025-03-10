{{ include('header.php', {title: 'Writer'})}}
<!-- TODO: eventually, this page should show a little bio of the writer. also, it should be localized. But let's do this when editing the writer is better designed, and re-instated -->

    <p><strong>first Name : </strong>{{ writer.firstName }}</p>
    <p><strong>last Name : </strong>{{ writer.lastName }}</p>
    <p><strong>birthday : </strong>{{ writer.birthday }}</p>
    <p><strong>bio : </strong>to be added</p>
    <p>
        <strong>role : </strong> 
        {% if writer.privilege_id == 2 %}
        writer
        {% elseif writer.privilege_id == 1 %}
        admin
        {% elseif writer.privilege_id == 3 %}
        editor
        {% else %}
        tbd
        {% endif %}
    </p>

    {% if session.writer_id == writer.id or session.privilege == 1 %}
    <p><strong>email : </strong>{{ writer.email }}</p>
    <form action="{{path}}writer/edit" method="POST">
    <input type="hidden" name="id" value="{{ writer.id }}" >
    <input type="submit" value="edit">
    {% endif %}

{{include('footer.php')}}