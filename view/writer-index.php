{{ include('header.php', {title: 'Our Writers'})}}
<!-- TODO: you need to figure consider a better way to show this... maybe by having it show visually based on connections between writers. it also needs localization--eventually... when it's rebuilt. -->
    <h1>Writers</h1>
    <table>
        <tr>
            <th>first name</th>
            <th>last name</th>
            {% if session.privilege == 1 %}
            <th>email<th>
            {% endif %}
        </tr>
      
        {% for writer in writers %}

                <tr>
                    <td><a href="{{path}}writer/show/{{writer.id}}">{{ writer.firstName }}</a></td>
                    <td>{{ writer.lastName }}</td>
                    {% if session.privilege == 1 %}
                    <td>{{ writer.email }}</td>
                    {% endif %}
                </tr>

        {% endfor %}

    </table>
{{include('footer.php')}}