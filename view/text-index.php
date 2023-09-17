{{ include('header.php', {title: 'All Texts!'})}}
    <h1>Texts</h1>
    <table>
        <tr>
            <th>title</th>
        </tr>
      
        {% for text in texts %}

                <tr>
                    <td><a href="{{path}}text/show/{{text.id}}">{{ text.title }}</a></td>
<!--                <td>{{ writer.lastName }}</td>
                    <td>{{ writer.email }}</td> -->
                </tr>

        {% endfor %}

    </table>
{{include('footer.php')}}