{{ include('header.php', {title: 'write something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<form action="{{path}}text/store" method="post">
    
    <label>title
        <input type="text" name="title" placeholder="Elsewhere" value={{data.text}}>
    </label>
    <label>
        <span class="headline">kickoff the text</span>
        <span class="additional-info"> (max 50 words):</span>
        <textarea name="writing" rows="10" cols="50" placeholder="When you climb out the window, don't forget your rainboots.">{% if data is defined %}{{data.writing}}{% endif %}</textarea>
    </label>
    <label>
        <span class="headline">create a prompt</span> 
        <span class="additional-info">(a goal, to guide future iterations):</span>
        <textarea name="prompt" rows="2" cols="50" placeholder="Instructions: how to run away from yourself, when you are also chasing yourself...">{% if data is defined %}{{data.prompt}}{% endif %}</textarea>
    <label>
    <label>
        <span class="headline">keywords</span>
        <span class="additional-info">(max 3, seperated by commas please):</span>
        <input type="text" name="keywords" placeholder="adventure, rainboots" value={{data.keywords}} >
    </label>

    <input type="hidden" name="writer_id" value="{{ session.writer_id }}">
    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="currentPage" value="text-create.php">

    <input type="submit" value="save">
</form>

{{include('footer.php')}}