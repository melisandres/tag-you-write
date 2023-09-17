{{ include('header.php', {title: 'Writer'})}}

    <p><strong>first Name : </strong>{{ writer.firstName }}</p>
    <p><strong>last Name : </strong>{{ writer.lastName }}</p>
    <p><strong>email : </strong>{{ writer.email }}</p>
    <p><strong>birthday : </strong>{{ writer.birthday }}</p>
    <p><a href="{{path}}writer/edit/{{writer.id}}.php">Edit</a></p>
{{include('footer.php')}}