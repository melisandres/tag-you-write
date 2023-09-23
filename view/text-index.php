{{ include('header.php', {title: 'All Texts!'})}}

<h1>Texts</h1>
<table>
    <tr>
        <th>title</th>
        <th>date</th>
        <th>author</th>
    </tr>
    
    {% for text in texts %}

            <tr>
                <td><a href="{{path}}text/show/{{text.id}}">{{ text.title }}</a></td>
                <td>{{ text.date }}</td>
                <td>{{ text.firstName }} {{ text.lastName }}</td> 
            </tr>

    {% endfor %}

</table>

{{include('footer.php')}}