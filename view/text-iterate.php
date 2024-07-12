{{ include('header.php', {title: 'iterate something!'})}}

<!-- I think I'm sending the parent title here from the controller, I need to.... send it with a differnt key, so that it doesn't get inserted in the form, and call it with the new key in the next line -->
 <p><strong>your goal: </strong> {{ data.prompt }}</p>
<p><strong>you are iterating on:</strong><span class="very-small"> {{ data.firstName }} {{ data.lastName }}'s</span> <span>"{{ data.previous_title }}"</span></p>
<p><strong>text before your changes: </strong>{{ data.writing }}</p>
{% if data.keywords %}<p><strong>keywords: </strong>{{ data.keywords }}</p>{% endif %}

{% if errors is defined %}
    <span class='error'>{{ errors|raw}}</span>
{% endif %}



<form action="{{path}}text/store" method="post">

    <label>
        <span>Make your changes</span>
        <span class="very-small">(add max 50 words): </span>
        <textarea name="writing" placeholder="oh dear! You deleted everything... thankfully the text you're iterating on is on top of the page"rows="10" cols="25">{{ data.writing }}</textarea>
    </label>

    <label>
        <span class="">Describe your changes</span>
        <span class="very-small">(max 3 words): </span>
        <input type="text" name="title" placeholder="flowery version" value="{{ data.title }}">
    </label>

    <label>
        <span class="headline">keywords</span>
        <span class="additional-info">(max 3, seperated by commas please):</span>
        <input type="text" name="keywords" placeholder="adventure, rainboots" value={{data.keywords}} >
    </label>

    <input type="hidden" name="firstName" value="{{ data.firstName }}">
    <input type="hidden" name="lastName" value="{{ data.lastName }}">
    <input type="hidden" name="previous_title" value="{{ data.previous_title }}">
    <input type="hidden" name="writer_id" value="{{ session.writer_id }}">
    <input type="hidden" name="prompt" value="{{ data.prompt }}">
    <input type="hidden" name="date" value="{{ 'now'|date('Y-m-d H:i:s') }}">
    <input type="hidden" name="parent_id" value="{{ data.id }}">
    <input type="hidden" name="currentPage" value="text-iterate.php">
    <input type="submit" value="save">
</form>

{{include('footer.php')}}