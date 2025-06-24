{{ include('header.php', {title_key: data.id ? 'page_title.text_edit' : (data.parent_id ? 'page_title.text_iterate' : 'page_title.text_create')})}}
<section class="form-page">
    <div class="form-info">
    {% if errors is defined %}
        <span class='error'>{{ errors|raw }}</span>
    {% endif %}

    {% if data.parent_id %}
        <div class="game-info">
            <h1 class="game-title"> 
                {{ data.game_title }}
            </h1>
            <section class="info iterate">
                <div class="info-container">
                    <h3 data-i18n="cr_it_ed.iterating_on">{{ translate('cr_it_ed.iterating_on') }}</h3>
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
                        <h3 data-i18n="cr_it_ed.prompt">{{ translate('cr_it_ed.prompt') }}</h3>
                        <p> {{ data.prompt|raw }}</p>
                    </div>
                </div>
            </section>
        </div>
    {% elseif not data.parent_id %}
        <section class="info">
            <div class="info-container">
                <h3 data-i18n="cr_it_ed.good_to_know">{{ translate('cr_it_ed.good_to_know') }}</h3>
                <div class="info-text-container">
                    <article data-i18n="cr_it_ed.good_to_know_text" data-i18n-html="true">{{ translate('cr_it_ed.good_to_know_text')|raw }}</article>
                </div>
            </div>
        </section>
    {% endif %}
    <!-- action="{{ path }}text/{{ data.id ? 'update' : 'store' }}" -->
    </div>

    <form id="main-form" data-form-type="{{ data.parent_id ? 'iteration' : 'root' }}" data-form-activity="{{ data.id ? 'editing' : 'creating' }}" method="post">
        <label>
        {% if not data.parent_id %}
            <span class="headline" data-i18n="cr_it_ed.choose_a_title">{{ translate('cr_it_ed.choose_a_title') }}</span>
        {% else %}
            <span class="headline" data-i18n="cr_it_ed.describe_your_changes">{{ translate('cr_it_ed.describe_your_changes') }}</span>
        {% endif %}
        {% if not data.parent_id %}
            <input type="text" name="title" data-i18n-placeholder="cr_it_ed.title_placeholder" placeholder="{{ translate('cr_it_ed.title_placeholder') }}" value="{{ data.title|default('') }}">
        {% else %}
            <input type="text" name="title" data-i18n-placeholder="cr_it_ed.changes_placeholder" placeholder="{{ translate('cr_it_ed.changes_placeholder') }}" value="{{ data.title|default('') }}">
        {% endif %}
        </label>
        
        {% if not data.parent_id %}
            <label>
                <span class="headline" data-i18n="cr_it_ed.create_prompt">{{ translate('cr_it_ed.create_prompt') }}</span> 
                <textarea name="prompt" rows="2" cols="50" data-i18n-placeholder="cr_it_ed.prompt_placeholder" placeholder="{{ translate('cr_it_ed.prompt_placeholder') }}">{{ data.prompt|default('') }}</textarea>
            </label>
        {% endif %}
        
        <label>
            <div class="title-and-word-count">
                {% if data.parent_id %}
                    <span data-i18n="cr_it_ed.your_version" data-i18n-params='{"game_title": "{{ data.game_title|default(translate('general.untitled'))|e('js') }}"}' class="headline">
                        {{ translate('cr_it_ed.your_version', {game_title: data.game_title|default(translate('general.untitled'))}) }}
                    </span>
                {% else %}
                    <span data-i18n="cr_it_ed.kickoff_text" class="headline">
                        {{ translate('cr_it_ed.kickoff_text') }}
                    </span>
                {% endif %}
                <div class="word-count-display" data-word-count-display>
                    <span class="word-count-number"></span>
                    <span class="word-count-tooltip"></span>
                </div>
            </div>
            {% if data.parent_id %}
                <textarea name="writing" rows="10" cols="50" placeholder="{{ data.parentWriting|striptags|raw }}">{{ data.writing|default('') }}</textarea>
            {% else %}
                <textarea name="writing" rows="10" cols="50" data-i18n-placeholder="cr_it_ed.writing_placeholder" placeholder="{{ translate('cr_it_ed.writing_placeholder') }}">{{ data.writing|default('') }}</textarea>
            {% endif %}
        </label>
        
        <label>
            <span data-i18n="cr_it_ed.keywords" class="headline">
                {{ translate('cr_it_ed.keywords') }}
            </span>
            <input type="text" name="keywords" data-i18n-placeholder="cr_it_ed.keywords_placeholder" placeholder="{{ translate('cr_it_ed.keywords_placeholder') }}" value="{{ data.keywords|default('') }}">
        </label>

        <label>
            <span data-i18n="cr_it_ed.invite_collaborators" class="headline">
                {{ translate('cr_it_ed.invite_collaborators') }}
            </span>
            <input type="text" 
                   id="invitee-input" 
                   data-ui-helper="true"
                   data-i18n-placeholder="cr_it_ed.invite_placeholder" 
                   placeholder="{{ translate('cr_it_ed.invite_placeholder') }}" 
                   autocomplete="off">
            <div class="invitees-display" id="invitees-display"></div>
        </label>

        <input type="hidden" name="invitees" id="invitees-data" value="">

        <input type="hidden" name="writer_id" value="{{ session.writer_id }}"> 
        <input type="hidden" name="currentPage" value="{{ data.id ? 'text-draft-edit.php' : 'text-create.php' }}">
        <input type="hidden" name="text_status" data-text-status value="{{ data.id ? 'draft' : 'draft' }}">
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
                <span dat-svg="publish" class="icon" data-i18n-title="general.publish_tooltip"></span>
                <span class="title" data-i18n="general.publish">
                    {{ translate('general.publish') }}
                </span>
            </button>
            <button class="save" type="button" data-status="draft" data-button-type="save">
                <span data-svg="save" class="icon" data-i18n-title="general.save_tooltip"></span>
                <div class="btn-2wordtitle">
                    <span class="title" data-i18n="general.save">
                        {{ translate('general.save') }}
                    </span>
                    <span class="title" data-i18n="general.draft">
                        {{ translate('general.draft') }}
                    </span>
                </div>
            </button>
            <button class="delete" type="button" data-status="delete" data-button-type="delete">
                <span data-svg="delete" class="icon" data-i18n-title="general.delete_tooltip"></span>
                <div class="btn-2wordtitle">
                    <span class="title" data-i18n="general.delete">
                        {{ translate('general.delete') }}
                    </span>
                    <span class="title" data-i18n="general.draft">
                        {{ translate('general.draft') }}
                    </span>
                </div>
            </button>
            <button class="cancel" type="button" data-status="cancel" data-button-type="exit">
                <span data-svg="cancel" class="icon" data-i18n-title="general.cancel_tooltip"></span>
                <span class="title" data-i18n="general.cancel">
                    {{ translate('general.cancel') }}
                </span>
            </button>
        </div>
    </form>
</section>
{{ include('footer.php') }}