{{ include('header.php', {title: 'Our Writers'})}}
    <h1>Writers</h1>
    <table>
        <tr>
            <th>first name</th>
            <th>last name</th>
            <th>email<th>
        </tr>
      
        {% for writer in writers %}

                <tr>
                    <td><a href="{{path}}writer/show/{{writer.id}}">{{ writer.firstName }}</a></td>
                    <td>{{ writer.lastName }}</td>
                    <td>{{ writer.email }}</td>
                </tr>

        {% endfor %}

    </table>
{{include('footer.php')}}