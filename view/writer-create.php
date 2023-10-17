{{ include('header.php', {title: 'Add a Writer'})}}
<form action="{{path}}writer/store" method="post">
        <label> first name
            <input type="text" name="firstName">
        </label>
        <label>last name
            <input type="text" name="lastName">
        </label>
        <label>email (will be used as username to log in)
            <input type="email" name="email">
        </label>
        <label>birthday
            <input type="date" name="birthday">
        </label>
        <label>password
            <input type="text" name="password">
        </label>
        <input type="hidden" name="privilege_id" value="2">
        <input type="submit" value="Save">
    </form>
{{include('footer.php')}}