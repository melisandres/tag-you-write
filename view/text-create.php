{{ include('header.php', {title: 'write something!'})}}

<form action="{{path}}/text/store" method="post">

    <label for="writer-select">writer:</label>
    <select name="writer_id">
        <option value="">...write as:</option>
        {% for writer in writers %}
            <option value="{{ writer.id }}">{{ writer.firstName }}  {{ writer.lastName }}</option>
        {% endfor %}
    </select>


    <label>title
        <input type="text" name="title">
    </label>
    <label>write max 50 words: 
        <textarea name="writing" rows="10" cols="50"></textarea>
    </label>
    <label>keywords (max 3, seperated by commas please)
        <input type="text" name="keywords">
    </label>

    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="submit" value="save">
</form>

{{include('footer.php')}}