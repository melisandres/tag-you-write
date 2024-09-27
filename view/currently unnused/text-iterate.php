{{ include('header.php', {title: 'iterate something!'})}}

<!-- I think I'm sending the parent title here from the controller, I need to.... send it with a differnt key, so that it doesn't get inserted in the form, and call it with the new key in the next line -->
<p><strong>your goal: </strong> {{ data.prompt }}</p>
<p><strong>you are iterating on:</strong><span class="very-small"> {{ data.firstName }} {{ data.lastName }}'s</span> <span>"{{ data.parentTitle }}"</span></p>
<p><strong>text before your changes: </strong>{{ data.parentWriting }}</p>
{% if data.keywords %}<p><strong>keywords: </strong>{{ data.keywords }}</p>{% endif %}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

<!-- {% for key, value in data %}
    Key: {{ key }} - Value: {{ value }}
    <br>
{% endfor %} -->

<form id="main-form" action="{{path}}text/store" method="post">

    <label>
        <span>Make your changes</span>
        <span class="very-small">(add max 50 words): </span>
        <textarea name="writing" placeholder="oh dear! You deleted everything... thankfully the text you're iterating on is on top of the page"rows="10" cols="25">{{ data.writing }}</textarea>
        <div data-wordCountDisplay></div>
    </label>

    <label>
        <span class="">Describe your changes</span>
        <span class="very-small">(max 3 words): </span>
        <input type="text" name="title" placeholder="flowery version" value="{{ data.title }}">
    </label>

    <label>
        <span class="headline">keywords</span>
        <span class="additional-info">(max 3, seperated by commas please):</span>
        <input type="text" name="keywords" placeholder="adventure, rainboots" value="{{ data.keywords }}" >
    </label>

    <input type="hidden" name="prompt" value="{{ data.prompt }}">
    <input type="hidden" name="firstName" value="{{ data.firstName }}">
    <input type="hidden" name="lastName" value="{{ data.lastName }}">
    <input type="hidden" name="parentTitle" value="{{ data.parentTitle }}">
    <input type="hidden" name="parentWriting" value="{{ data.parentWriting }}">
    <input type="hidden" name="writer_id" value="{{ session.writer_id }}">
    <input type="hidden" name="game_id" value="{{ data.game_id }}">
    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="parent_text_id" value="{{ data.parent_text_id is defined ? data.parent_text_id : data.id }}">
    <input type="hidden" name="currentPage" value="text-iterate.php">
    <input type="hidden" name="text_status" data-text-status value=""> 


    <!-- <input type="submit" value="save"> -->
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