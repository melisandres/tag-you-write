{{ include('header.php', {title: 'edit something!'})}}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}

{% if not data.parent_id == ''  %}
    <p><strong>you are iterating on:</strong><span class="very-small"> {{ data.parentFirstName }} {{ data.parentLastName }}'s</span> <span>"{{ data.parentTitle }}"</span></p>
    <p><strong>text before your changes: </strong>{{ data.parentWriting }}</p>
{% else%}
    <p>Hit publish, and your title and prompt will be carved in STONE.<br>
    Alteratively, your text will be open to edits, disfugations, and flights of fancy.<br>
    Be forewarned. And may the best iteration win!</p>
{% endif %}

<div class="form-container">
    <form id="main-form" action="{{path}}text/update" method="post">
        <div class="form-content">
            <label>title
                <input type="text" name="title" value="{{ data.title}}">
            </label>
            {% if data.parent_id == '' %}
                <!-- Content to display when parent_id is empty or not defined -->
                <label>prompt
                    <input type="text" name="prompt" value="{{ data.prompt }}">
                </label>
            {% endif %}
            <label>
                <div class="very-small" data-wordCountDisplay></div>
                <textarea name="writing" value=""rows="10" cols="50">{{data.writing}}</textarea>
            </label>
            <label>keywords (max 3, seperated by commas please)
                <input type="text" name="keywords" value="{{ data.keywords }}"> 
            </label>
            <input type="hidden" name="parent_id" value="{{ data.parent_id }}">
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
        </div>
        <div class="form-btns">
            <button class="publish" type="button" data-status="published">
                <span class="icon"></span>
                <span class="title">Publish</span>
            </button>
            <button class="save" type="button" data-status="draft">
                <span class="icon"></span>
                <span class="title">Save Draft</span>
            </button>
            <button class="delete" type="button" data-status="delete">
                <span class="icon"></span>
                <span class="title">Delete Draft</span>
            </button>
            <button class="cancel" type="button" data-status= "cancel">
                <span class="icon"></span>
                <span class="title">Cancel</span>
            </button>
        </div>
    </form>
</div>

{{include('footer.php')}}

<!-- <script>
    import { SVGManager } from '{{ path }}js/svgManager.js';
    function setStatusAndSubmit(status) {
        document.querySelector('[data-text-status]').value = status;
        document.getElementById('mainForm').submit(); // Submit the form
    }

    function submitDelete() {
        // Change form action to delete endpoint and submit
        const form = document.getElementById('mainForm');
        form.action = "{{ path }}text/delete";
        form.submit();
    }

    // Function to inject SVGs into buttons
    function injectSVGIcons() {

        document.querySelector('.publish .icon').innerHTML = SVGManager.publishSVG;
        document.querySelector('.draft .icon').innerHTML = SVGManager.draftSVG;
        document.querySelector('.delete .icon').innerHTML = SVGManager.deleteSVG;
        //document.querySelector('.cancel .icon').innerHTML = SVGManager.cancelSVG;
    }


    // Call the function to inject SVGs after the page is loaded
    window.addEventListener('DOMContentLoaded', () => {
        injectSVGIcons();
    });
</script> -->