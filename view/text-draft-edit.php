{{ include('header.php', {title: 'edit something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<p><strong>you are iterating on:</strong><span class="very-small"> {{ data.parentFirstName }} {{ data.parentLastName }}'s</span> <span>"{{ data.parentTitle }}"</span></p>
<p><strong>text before your changes: </strong>{{ data.parentWriting }}</p>

<form action="{{path}}text/update" method="post">

    <label>title
        <input type="text" name="title" value="{{data.title}}">
    </label>
    <label>
        <div class="very-small" data-wordCountDisplay></div>
        <textarea name="writing" value=""rows="10" cols="50">{{data.writing}}</textarea>
    </label>
    <label>keywords (max 3, seperated by commas please)
        <input type="text" name="keywords" value="{{ data.keywords }}"> 
    </label>
    <input type="hidden" name="parentFirstName" value="{{ data.parentFirstName }}">
    <input type="hidden" name="parentLastName" value="{{ data.parentLastName }}">
    <input type="hidden" name="parentTitle" value="{{ data.parentTitle }}">
    <input type="hidden" name="parentWriting" value="{{ data.parentWriting }}">
    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="id" value="{{ data.id }}">
    <input type="hidden" name="writer_id" value="{{ data.writer_id }}">
    <input type="hidden" name="lastKeywords" value="{{ data.lastKeywords }}">
    <input type="hidden" name="currentPage" value="text-draft-edit.php">
    <input type="hidden" name="text_status" data-text-status value=""> 

    <!-- <input type="submit" value="save"> -->
    <div class="form-btns">
        <input type="submit" value="Publish" onclick="setStatus('published')">
        <input type="submit" value="Save Draft" onclick="setStatus('draft')">

    </div>
</form>
<form  action="{{path}}text/delete" method="post">
    <input type="hidden" name="id" value="{{ data.id }}">
    <input type="submit" value="Delete Draft">
</form>
<button type="button" onclick="window.location.href='{{ path }}text';">Cancel</button>

{{include('footer.php')}}

<script>
    function setStatus(status) {
        document.querySelector('[data-text-status]').value = status;
    }
</script>