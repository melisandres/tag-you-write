{{ include('header.php', {title: 'iterate something!'})}}

<h1><strong>title: </strong><span class="title">{{ data.title }}</span></h2>

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<h2><strong>previous author: </strong><span class="author">{{ data.firstName }} {{ data.lastName }}</span></h2>

    <form action="{{path}}text/store" method="post">
    <label for="writer-select">iteration by:</label>
    <select name="writer_id">
        <option value="">...write as:</option>
        {% for writer in writers %}
            <option value="{{ writer.id }}">{{ writer.firstName }}  {{ writer.lastName }}</option>
        {% endfor %}
    </select>

    <label>title <p class="very-small">(be judicious in your alterations)</p>
        <input type="text" name="title" value="{{data.title}}">
    </label>
    <label>Alter the text<p class="very-small">(add max 50 words): </p>
        <textarea name="writing" value=""rows="10" cols="50">{{data.writing}}</textarea>
    </label>
    <label>keywords <p class="very-small">(not too many... you may adjust, this is a way to maintain cohesion between versions, and prompt future collaborators)</p>
        <input type="text" name="keywords" value="{{ data.keywords }}"> 
    </label>

    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="parent_id" value="{{ data.id }}">
    <input type="hidden" name="currentPage" value="text-iterate.php">
    <input type="submit" value="save">
</form>

{{include('footer.php')}}