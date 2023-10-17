{{ include('header.php', {title: 'write something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<form action="{{path}}text/store" method="post">
    
    <label>title
        <input type="text" name="title" value={{data.text}}>
    </label>
    <label>write max 50 words: 
        <textarea name="writing" rows="10" cols="50">{% if data is defined %}{{data.writing}}{% endif %}</textarea>
    </label>
    <label>keywords (max 3, seperated by commas please)
        <input type="text" name="keywords" value={{data.keywords}}>
    </label>

    <input type="hidden" name="writer_id" value="{{ session.writer_id }}">
    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="currentPage" value="text-create.php">

    <input type="submit" value="save">
</form>

{{include('footer.php')}}