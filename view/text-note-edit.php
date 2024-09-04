{{ include('header.php', {title: 'edit something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}
<form action="{{path}}text/update" method="post">

    <label>{{ data.note ? 'Oops! You can change your note:' : 'Oops! You can leave a note for other writers:' }} 
        <div class="very-small" data-wordCountDisplay></div>
        <textarea name="note" placeholder="oh dear! I meant to write 'warm' not 'worm' so embarassing..." rows="10" cols="50">{{data.note}}</textarea>
    </label>

    <input type="hidden" name="note_date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="id" value="{{ data.id }}">
    <input type="hidden" name="writer_id" value="{{ data.writer_id }}">
    <input type="hidden" name="title" value="{{ data.title }}">
    <input type="hidden" name="writing" value="{{ data.writing }}">
    <input type="hidden" name="currentPage" value="text-note-edit.php">
    <input type="hidden" name="text_status" data-text-status value="">

    <div class="form-btns">
        <input type="submit" value="{{ data.note ? 'Change Note' : 'Add Note' }}">
        <button type="button" onclick="window.location.href='{{ path }}text';">Cancel</button>
    </div>
    
</form>
<p>Here's what you wrote: </p>
<h3>{{ data.title }}</h3>
<p>{{ data.writing }}</p>

{{include('footer.php')}}

<script>
    function setStatus(status) {
        document.querySelector('[data-text-status]').value = status;
    }
</script>