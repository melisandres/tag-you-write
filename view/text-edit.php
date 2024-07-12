{{ include('header.php', {title: 'edit something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}
<form action="{{path}}text/update" method="post">

    <label>Oops! You can leave a note for other writers: 
        <textarea name="note" placeholder="oh dear! I meant to write 'warm' not 'worm' so embarassing..." rows="10" cols="50">{{data.note}}</textarea>
    </label>

    <input type="hidden" name="note_date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="id" value="{{ data.id }}">
    <input type="hidden" name="writer_id" value="{{ data.writer_id }}">
    <input type="hidden" name="lastKeywords" value="{{ data.lastKeywords }}">
    <input type="hidden" name="currentPage" value="text-edit.php">
    <input type="submit" value="save">
</form>
<p>Here's what you wrote: </p>
<h3>{{ data.title }}</h3>
<p>{{ data.writing }}</p>

{{include('footer.php')}}