{{ include('header.php', {title: 'edit something!'})}}

<h1><strong>author: </strong><span class="author">{{ text.firstName }} {{ text.lastName }}</span></h1>
<form action="{{path}}/text/update" method="post">

    <label>title
        <input type="text" name="title" value="{{text.title}}">
    </label>
    <label>write max 50 words: 
        <textarea name="writing" value=""rows="10" cols="50">{{text.writing}}</textarea>
    </label>
    <label>keywords (max 3, seperated by commas please)
        <input type="text" name="keywords" value="{{ keywords }}"> 
    </label>

    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="id" value="{{ text.id }}">
    <input type="hidden" name="lastKeywords" value="{{ keywords }}">
    <input type="submit" value="save">
</form>

{{include('footer.php')}}