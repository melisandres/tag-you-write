{{ include('header.php', {title: 'Our Writers'})}}
    <h1>Writers</h1>
    <table>
        <tr>
            <th>first name</th>
            <th>last name</th>
            {% if session.privilege_id == 1 %}
            <th>email<th>
            {% endif %}
        </tr>
      
        {% for writer in writers %}

                <tr>
                    <td><a href="{{path}}writer/show/{{writer.id}}">{{ writer.firstName }}</a></td>
                    <td>{{ writer.lastName }}</td>
                    {% if session.privilege_id == 1 %}
                    <td>{{ writer.email }}</td>
                    {% endif %}
                </tr>

        {% endfor %}

    </table>
{{include('footer.php')}}