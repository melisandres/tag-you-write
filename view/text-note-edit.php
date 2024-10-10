{{ include('header.php', {title: 'edit something!'})}}
<section class="form-page">
    <div class="form-info">
        {% if errors is defined %}
            <span class='error'>{{ errors|raw}}</span>
        {% endif %}
        <p>Here's what you wrote: </p>
        <h3>{{ data.title }}</h3>
        <p>{{ data.writing }}</p>
    </div>

    <form id="main-form" data-form-type="addingNote" data-form-activity="editing" action="{{path}}text/update" method="post">

        <label>
            <div class="title-and-word-count">
                <span class="headline">{{ data.note ? 'Oops! You can change your note:' : 'Oops! You can leave a note for other writers:' }}</span> 
                <div class="word-count-display" data-word-count-display>
                    <span class="word-count-number"></span>
                    <span class="word-count-tooltip"></span>
                </div>
            </div>
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
            <button class="publish" type="button" data-status="published">
                <span class="icon"></span>
                <span class="title">{{ data.note ? 'Change Note' : 'Add Note' }}</span>
            </button>
            <button class="cancel" type="button" data-status= "cancel">
                <span class="icon"></span>
                <span class="title">Cancel</span>
            </button>
        </div>
        
    </form>
</section>

{{include('footer.php')}}