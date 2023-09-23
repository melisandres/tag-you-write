{{ include('header.php', {title: 'iterate something!'})}}

<h1><strong>title: </strong><span class="title">{{ text.title }}</span></h2>

<h2><strong>previous author: </strong><span class="author">{{ text.firstName }} {{ text.lastName }}</span></h2>

    <form action="{{path}}/text/store" method="post">
    <label for="writer-select">iteration by:</label>
    <select name="writer_id">
        <option value="">...write as:</option>
        {% for writer in writers %}
            <option value="{{ writer.id }}">{{ writer.firstName }}  {{ writer.lastName }}</option>
        {% endfor %}
    </select>

    <label>title <p class="very-small">(be judicious in your alterations)</p>
        <input type="text" name="title" value="{{text.title}}">
    </label>
    <label>Alter the text<p class="very-small">(add max 50 words): </p>
        <textarea name="writing" value=""rows="10" cols="50">{{text.writing}}</textarea>
    </label>
    <label>keywords <p class="very-small">(not too many... you may adjust, this is a way to maintain cohesion between versions, and prompt future collaborators)</p>
        <input type="text" name="keywords" value="{{ keywords }}"> 
    </label>

    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="parent_id" value="{{ text.id }}">
    <input type="submit" value="save">
</form>

{{include('footer.php')}}