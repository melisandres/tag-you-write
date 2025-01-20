{{ include('header.php', {title: data.id ? 'Edit Text' : (data.parent_id ? 'Iterate Text' : 'Create Text')})}}
<section class="form-page">
    <div class="form-info">
    {% if errors is defined %}
        <span class='error'>{{ errors|raw }}</span>
    {% endif %}

<!--     {% if data.game_title %}
        <p><strong>{{ data.game_title }}</strong></p>
    {% endif %} -->

<!--     {% for key, value in data %}
        <pre>{{ key }}: {{ value }}</pre>
    {% endfor %} -->

    {% if data.parent_id %}
        <div class="game-info">
            <h1 class="game-title"> 
                {{ data.game_title|default('Untitled') }}
            </h1>
            <div class="info iterate">
                <div class="info-container">
                    <h3>iterating on: </h3>
                    <div class="info-text-container parent">
                        <div class="parent-title">
                            {{ data.parentTitle }}
                        </div>
                        <div class="parent-author">
                        - {{ data.parentFirstName }} {{ data.parentLastName }} -
                        </div>
                        <div class="parent-text">
                            {{ data.parentWriting|raw }}
                        </div>
                    </div>  
                </div>
                <div class="info-container">
                    <div class="info-text-container">
                        <h3>prompt:</h3>
                        <p> {{ data.prompt|raw }}</p>
                    </div>
                </div>
            </div>
        </div>
    {% elseif not data.id %}
        <div class="info">
            <div class="info-container">
                <h3>good to know: </h3>
                <div class="info-text-container">
                    <p>While your title and prompt will be carved in STONE,
                    your text will be rehashed by all who join the game.</p>
                    <p>May the best iteration win!</p>
                </div>
            </div>
        </div>
    {% endif %}
    <!-- action="{{ path }}text/{{ data.id ? 'update' : 'store' }}" -->
    </div>

    <form id="main-form" data-form-type="{{ data.parent_id ? 'iteration' : 'root' }}" data-form-activity="{{ data.id ? 'editing' : 'creating' }}" method="post">
        <label>
        {% if not data.parent_id %}
            <span class="headline">choose a title</span>
        {% else %}
            <span class="headline">describe your changes</span>
        {% endif %}
        {% if not data.parent_id %}
            <input type="text" name="title" placeholder="Elsewhere" value="{{ data.title|default('') }}">
        {% else %}
            <input type="text" name="title" placeholder="Added a panda" value="{{ data.title|default('') }}">
        {% endif %}
        </label>
        
        {% if not data.parent_id %}
            <label>
                <span class="headline">create a prompt</span> 
                <textarea name="prompt" rows="2" cols="50" placeholder="Instructions: how to run away from yourself, when you are also chasing yourself...">{{ data.prompt|default('') }}</textarea>
            </label>
        {% endif %}
        
        <label>
            <div class="title-and-word-count">
                <span class="headline">{{ data.parent_id ? "your version of \"#{data.game_title|default('Untitled')}\"" : 'kickoff the text' }}</span>
                <div class="word-count-display" data-word-count-display>
                    <span class="word-count-number"></span>
                    <span class="word-count-tooltip"></span>
                </div>
            </div>
            {% if data.parent_id %}
                <textarea name="writing" rows="10" cols="50" placeholder="{{ data.parentWriting|striptags|raw }}">{{ data.writing|default('') }}</textarea>
            {% else %}
                <textarea name="writing" rows="10" cols="50" placeholder="When you climb out the window, don't forget your rainboots.">{{ data.writing|default('') }}</textarea>
            {% endif %}
        </label>
        
        <label>
            <span class="headline">keywords</span>
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
                <span class="title">Save <span class="draft-text">Draft</span></span>
            </button>
            <button class="delete" type="button" data-status="delete" data-button-type="delete">
                <span class="icon"></span>
                <span class="title">Delete <span class="draft-text">Draft</span></span>
            </button>
            <button class="cancel" type="button" data-status="cancel" data-button-type="exit">
                <span class="icon"></span>
                <span class="title">Cancel</span>
            </button>
        </div>
    </form>
</section>
{{ include('footer.php') }}