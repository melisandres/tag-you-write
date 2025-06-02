{{ include('header.php', {title_key: 'page_title.note_edit'})}}
<section class="form-page">
    <div class="form-info">
        <div class="note-info">
            <div class="info">
                <div class="info-container">
                    <h3 data-i18n="note-edit.here_is_what_you_wrote">{{ translate('note-edit.here_is_what_you_wrote') }}</h3>
                    <div class="info-text-container">
                        <div class="parent-title">
                            {{ data.title }}</div>
                        <div class="parent-author">
                            - <span data-i18n="note-edit.by_you">{{ translate('note-edit.by_you') }}</span> -
                        </div>
                        <div class="parent-text">
                            {{ data.writing|raw }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        {% if errors is defined %}
            <span class='error'>{{ errors|raw}}</span>
        {% endif %}
    </div>


    <form id="main-form" data-form-type="addingNote" data-form-activity="editing" action="{{ langUrl('text/update') }}" method="post">

        <label>
            <div class="title-and-word-count">
            <span class="headline" data-i18n="{{ data.note ? 'note-edit.change_note_message' : 'note-edit.leave_note_message' }}">{{ data.note ? translate('note-edit.change_note_message') : translate('note-edit.leave_note_message') }}</span> 
<!--                 <div class="word-count-display" data-word-count-display>
                    <span class="word-count-number"></span>
                    <span class="word-count-tooltip"></span>
                </div> -->
            </div>
            <textarea name="note" data-i18n-placeholder="note-edit.note_placeholder" placeholder="{{ translate('note-edit.note_placeholder') }}" rows="10" cols="50">{{data.note|raw}}</textarea>
        </label>

        <input type="hidden" name="note_date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
        <input type="hidden" name="id" value="{{ data.id }}">
        <input type="hidden" name="writer_id" value="{{ data.writer_id }}">
        <input type="hidden" name="title" value="{{ data.title }}">
        <input type="hidden" name="writing" value="{{ data.writing }}">
        <input type="hidden" name="currentPage" value="text-note-edit.php">
        <input type="hidden" name="text_status" data-text-status value="">
        <input type="hidden" name="game_id" value="{{ data.game_id|default('') }}">

        <div class="form-btns">
            <button class="publish" type="button" data-status="published"  data-i18n-title="{{ data.note ? 'note-edit.change_note_tooltip' : 'note-edit.add_note_tooltip' }}" title="{{ data.note ? translate('note-edit.change_note_tooltip') : translate('note-edit.add_note_tooltip') }}">
                <span class="icon"></span>
                <span class="title" data-i18n="{{ data.note ? 'note-edit.change_note' : 'note-edit.add_note' }}">{{ data.note ? translate('note-edit.change_note') : translate('note-edit.add_note') }}</span>
            </button>
            <button class="cancel" type="button" data-status="cancel" data-i18n-title="{{ 'general.cancel_tooltip' }}" title="{{ translate('general.cancel_tooltip') }}">
                <span class="icon"></span>
                <span class="title" data-i18n="general.cancel">{{ translate('general.cancel') }}</span>
            </button>
        </div>
        
    </form>
</section>

{{include('footer.php')}}