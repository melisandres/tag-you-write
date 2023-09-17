{{ include('header.php', {title: 'Add a Writer'})}}
<form action="{{path}}writer/update" method="post">
        <input type="hidden" name="id" value="{{writer.id}}">
        <label> first name
            <input type="text" name="firstName" value="{{writer.firstName}}">
        </label>
        <label>last name
            <input type="text" name="lastName" value="{{writer.lastName}}">
        </label>
        <label>email
            <input type="email" name="email" value="{{writer.email}}">
        </label>
        <label>Date de naissance
            <input type="date" name="birthday" value="{{writer.birthday}}">
        </label>
        <input type="submit" value="Save">
    </form>
{{include('footer.php')}}