{{ include('header.php', {title: 'write something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<form id="main-form" action="{{path}}text/store" method="post">
    
    <label>title
        <input type="text" name="title" placeholder="Elsewhere" value="{{ data.title|default('') }}">
    </label>
    <label>
        <span class="headline">kickoff the text</span>
        <div class="very-small" data-wordCountDisplay></div>
        <textarea name="writing" rows="10" cols="50" placeholder="When you climb out the window, don't forget your rainboots.">{% if data is defined %}{{data.writing}}{% endif %}</textarea>

    </label>
    <label>
        <span class="headline">create a prompt</span> 
        <span class="additional-info">(a goal to guide future iterations):</span>
        <textarea name="prompt" rows="2" cols="50" placeholder="Instructions: how to run away from yourself, when you are also chasing yourself...">{% if data is defined %}{{data.prompt}}{% endif %}</textarea>
    <label>
    <label>
        <span class="headline">keywords</span>
        <span class="additional-info">(max 3, seperated by commas please):</span>
        <input type="text" name="keywords" placeholder="adventure, rainboots" value="{{ data.keywords }}" >
    </label>

    <input type="hidden" name="writer_id" value="{{ session.writer_id }}">
    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="currentPage" value="text-create.php">
    <input type="hidden" name="text_status" data-text-status value="">

    <div class="form-btns">
    <button class="publish" type="button" data-status="published">
                <span class="icon"></span>
                <span class="title">Publish</span>
            </button>
            <button class="save" type="button" data-status="draft">
                <span class="icon"></span>
                <span class="title">Save Draft</span>
            </button>
            <button class="cancel" type="button" data-status= "cancel">
                <span class="icon"></span>
                <span class="title">Cancel</span>
            </button>
    </div>
</form>

{{include('footer.php')}}