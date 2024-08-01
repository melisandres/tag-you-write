{{ include('header.php', {title: 'edit something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<h1><strong>author: </strong><span class="author">{{ data.firstName }} {{ data.lastName }}</span></h1>

<form action="{{path}}text/update" method="post">

    <label>title
        <input type="text" name="title" value="{{data.title}}">
    </label>
    <label>write max 50 words: 
        <textarea name="writing" value=""rows="10" cols="50">{{data.writing}}</textarea>
    </label>
    <label>keywords (max 3, seperated by commas please)
        <input type="text" name="keywords" value="{{ data.keywords }}"> 
    </label>
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
        <button type="button" onclick="window.location.href='{{ path }}text';">Cancel</button>
    </div>
</form>

{{include('footer.php')}}

<script>
    function setStatus(status) {
        document.querySelector('[data-text-status]').value = status;
    }
</script>