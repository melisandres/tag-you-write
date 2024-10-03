{{ include('header.php', {title: data.id ? 'Edit Text' : (data.parent_id ? 'Iterate Text' : 'Create Text')})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw }}</span>
{% endif %}

{% if data.parent_id %}
    <p><strong>you are iterating on:</strong><span class="very-small"> {{ data.parentFirstName }} {{ data.parentLastName }}'s</span> <span>"{{ data.parentTitle }}"</span></p>
    <p><strong>text before your changes: </strong>{{ data.parentWriting }}</p>
{% elseif not data.id %}
    <p>Hit publish, and your title and prompt will be carved in STONE.<br>
    Alternatively, your text will be open to edits, disfigurations, and flights of fancy.<br>
    Be forewarned. And may the best iteration win!</p>
{% endif %}
<!-- action="{{ path }}text/{{ data.id ? 'update' : 'store' }}" -->

<form id="main-form" data-form-type="{{ data.id ? 'iterating' : 'writing' }}" method="post">
    <label>title
        <input type="text" name="title" placeholder="Elsewhere" value="{{ data.title|default('') }}">
    </label>
    
    {% if not data.parent_id %}
        <label>
            <span class="headline">create a prompt</span> 
            <span class="additional-info">(a goal to guide future iterations):</span>
            <textarea name="prompt" rows="2" cols="50" placeholder="Instructions: how to run away from yourself, when you are also chasing yourself...">{{ data.prompt|default('') }}</textarea>
        </label>
    {% endif %}
    
    <label>
        <span class="headline">{{ data.id ? '' : 'kickoff the ' }}text</span>
        <div class="very-small" data-wordCountDisplay></div>
        <textarea name="writing" rows="10" cols="50" placeholder="When you climb out the window, don't forget your rainboots.">{{ data.writing|default('') }}</textarea>
    </label>
    
    <label>
        <span class="headline">keywords</span>
        <span class="additional-info">(max 3, separated by commas please):</span>
        <input type="text" name="keywords" placeholder="adventure, rainboots" value="{{ data.keywords|default('') }}">
    </label>

    <input type="hidden" name="writer_id" value="{{ session.writer_id }}"> 
    <input type="hidden" name="currentPage" value="{{ data.id ? 'text-draft-edit.php' : 'text-create.php' }}">
    <input type="hidden" name="text_status" data-text-status value="{{ data.id ? 'draft' : '' }}">
    <input type="hidden" name="game_id" value="{{ data.game_id|default('') }}">
    <input type="hidden" name="parent_id" value="{{ data.parent_id|default('') }}">
    <input type="hidden" data-id name="id" value="{{ data.id|default('') }}">
    <input type="hidden" name="lastKeywords" value="{{ data.lastKeywords|default('') }}">
    <input type="hidden" name="parentWriting" value="{{ data.parentWriting }}">
    
    {% if data.parent_id %}
        <input type="hidden" name="parentFirstName" value="{{ data.parentFirstName }}">
        <input type="hidden" name="parentLastName" value="{{ data.parentLastName }}">
        <input type="hidden" name="parentTitle" value="{{ data.parentTitle }}">
    {% endif %}

    <div class="form-btns">
        <button class="publish" type="button" data-status="published" data-button-type="publish">
            <span class="icon"></span>
            <span class="title">Publish</span>
        </button>
        <button class="save" type="button" data-status="draft" data-button-type="save">
            <span class="icon"></span>
            <span class="title">Save Draft</span>
        </button>
        <button class="delete" type="button" data-status="delete" data-button-type="delete">
            <span class="icon"></span>
            <span class="title">Delete Draft</span>
        </button>
        <button class="cancel" type="button" data-status="cancel" data-button-type="exit">
            <span class="icon"></span>
            <span class="title">Cancel</span>
        </button>
    </div>
</form>

{{ include('footer.php') }}