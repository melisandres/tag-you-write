{{ include('header.php', {title: 'All Texts!'})}}


<!-- an area to show all the starting stories that might be contributed to -->
<div data-stories class="stories">
{% for text in texts %}
    <div class="story {{ text.openForChanges ? '' : 'closed' }}" data-game-id="{{ text.game_id }}" data-text-id="{{ text.id }}">
        <div class="story-title">
            <h2 class="{{ text.hasContributed ? 'contributed' : '' }}">
                <!-- <a href="{{ path }}text/show/{{ text.id }}">{{ text.title }}</a> -->
                <a data-refresh-modal data-text-id="{{ text.id }}">{{ text.title }}</a>
            </h2>
        </div>
        <div class="story-btns">
            <button data-bookmark-story data-text-id="{{ text.id }}" class="story-btn bookmark-btn" data-svg="bookmark">
            </button>
            <button data-refresh-tree data-text-id="{{ text.id }}" class="story-btn" data-svg="tree">
                <img class="refresh-tree" src="{{ path }}assets/imgs/icons/tree.svg" alt="view tree">
            </button>
            <button data-refresh-shelf data-text-id="{{ text.id }}" class="story-btn" data-svg="shelf">
                <img class="refresh-shelf" src="{{ path }}assets/imgs/icons/shelf.svg" alt="view shelf"> 
            </button>
        </div>
        <div class="story-writing">
            {% if text.prompt %}
            <p><span class="very-small">prompt:</span> {{ text.prompt }}</p>
            {% endif %}
        </div>
    </div>
{% endfor %}
</div>
{{ include('footer.php') }}

















<!-- <table  data-stories>
    <tr>
        <th>title</th>
        <th>date</th>
        <th>author</th>
    </tr>
    
    {% for text in texts %}

            <tr>
                <td><button data-refresh-tree data-text-id="{{ text.id }}" class="refresh-tree">t</button><a href="{{path}}text/show/{{text.id}}">{{ text.title }}</a><button data-refresh-shelf data-text-id="{{ text.id }}" class="refresh-shelf">s</button></td>
                <td>{{ text.date }}</td>
                <td>{{ text.firstName }} {{ text.lastName }} </td> 
            </tr>

    {% endfor %}

</table>  -->