{{ include('header.php', {title: 'activities journal'})}}

<h1>Journal</h1>
<table>
    <tr>
        <th>user(name or guest)</th>
        <th>page</th>
        <th>date</th>
        <th>ip-address</th>
    </tr>
    
    {% for line in data %}

            <tr>
                <td><a href="{{path}}writer/show/{{writer.id}}">
                    {% if line.writer_id == null %}
                        guest
                    {% else %}
                        {{ line.firstName }} {{ line.lastName }}
                    {% endif %}
                </a></td>
                <td>{{ line.page }}</td>
                <td>{{ line.date }}</td>
                <td>{{ line.ip }}</td> 
            </tr>

    {% endfor %}

</table>
{{include('footer.php')}}