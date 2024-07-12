{{ include('header.php', {title: 'All Texts!'})}}


<!-- an area to show all the starting stories that might be contributed to -->
<div data-stories class="stories">
{% for text in texts %}
    <div class="story">
        <div class="story-title">
            <h2 class="{{ text.hasContributed ? 'contributed' : '' }}">
                <!-- <a href="{{ path }}text/show/{{ text.id }}">{{ text.title }}</a> -->
                <a data-refresh-modal data-text-id="{{ text.id }}">{{ text.title }}</a>
            </h2>
        </div>
        <div class="story-btns">
            <button data-bookmark-story data-text-id="{{ text.id }}" class="story-btn bookmark-btn">
                <svg
                version="1.1"
                viewBox="-5 -10 28.78447 100.00342"
                id="svg2"
                sodipodi:docname="noun-bookmark-6789846.svg"
                width="14.4"
                height="50"
                inkscape:version="1.3.2 (091e20e, 2023-11-25)"
                xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"
                xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"
                xmlns="http://www.w3.org/2000/svg"
                xmlns:svg="http://www.w3.org/2000/svg">
                <defs
                    id="defs2" />
                <title
                    id="title1">bookmark (coming soon!)</title>
                <path
                    fill="currentColor"
                    d="m 9.4289287,77.394656 c -1.5742,1.5859 -3.0273,3.0703 -4.4961,4.543 l -7.3086,7.3164 -0.17188,0.17578 c -1,0.95703 -1.9727,0.69922 -2.3281,-0.64453 l -0.0039,-0.0039 c -0.08984,-0.41016 -0.13281,-0.83203 -0.11719,-1.2539 v -27.625 -67.797 c 0,-1.3633 0.23828,-2.1055 2.0703,-2.1055 8.2344,0.042969 16.4800003,0 24.7070003,0 1.6328,0 2.0039,0.36328 2.0039,1.9883 v 95.652 c 0.0039,0.52344 -0.08984,1.043 -0.27344,1.5352 -0.11719,0.39062 -0.43359,0.6875 -0.82813,0.78125 -0.39453,0.09375 -0.80859,-0.03125 -1.0859,-0.32812 -0.19922,-0.17188 -0.37891,-0.36328 -0.5625,-0.55078 l -10.953,-10.922 c -0.2031203,-0.19922 -0.3710903,-0.4375 -0.6523403,-0.76172 z m -12.023,8.6562 c 0.12891,-0.07813 0.25391,-0.16797 0.37109,-0.26562 l 10.582,-10.625 c 0.23438,-0.32812 0.61328,-0.51953 1.0156,-0.51953 0.40234,0 0.7812503,0.19141 1.0156003,0.51953 l 10.582,10.602 c 0.11719,0.09766 0.24609,0.18359 0.37891,0.25391 0.17188,-1.4844 0.10547,-80.227 -0.05859,-80.762 H -2.5944613 Z m 0,-83.262 23.9960003,0.0039 v -10.387 l -23.9960003,-0.0039 z"
                    id="path1" />
                <text
                    x="-40.606071"
                    y="107.49966"
                    font-size="5px"
                    font-weight="bold"
                    font-family="'Arbeit Regular', Helvetica, Arial-Unicode, Arial, Sans-serif"
                    fill="#000000"
                    id="text1">Created by carna diri</text>
                <text
                    x="-40.606071"
                    y="112.49966"
                    font-size="5px"
                    font-weight="bold"
                    font-family="'Arbeit Regular', Helvetica, Arial-Unicode, Arial, Sans-serif"
                    fill="#000000"
                    id="text2">from Noun Project</text>
                </svg>
            </button>
            <button data-refresh-tree data-text-id="{{ text.id }}" class="story-btn">
                <img class="refresh-tree" src="{{ path }}assets/imgs/icons/tree.svg" alt="view tree">
            </button>
            <button data-refresh-shelf data-text-id="{{ text.id }}" class="story-btn">
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