{{ include('header.php', {title: 'read quietly'})}}

<h1><strong>author: </strong><span class="author">{{ text.firstName }} {{ text.lastName }}</span></h1>
    <p><strong>title: </strong>{{ text.title }}</p>
    <p><strong>date: </strong>{{ text.date }}</p>

    {% set count = 0 %}
    {% for key, value in keywords %}
        {% set count = count + 1 %}
        <p class='keyword' data-keyword-index='{{ key }}'>keyword {{ count }}: {{ value }}</p>
    {% endfor %}


    <p><strong>text: </strong>{{ text.writing }}</p>



    <form action="text-delete.php" method="POST">
        <input type="hidden" name="id" value="{{ text.id }}" >
        <input type="submit" value="delete" >
    </form>
    <form action="text-edit.php" method="POST">
        <input type="hidden" name="id" value="{{ text.id }}" >
        <input type="submit" value="edit" >
    </form>
    <form action="text-iterate.php" method="POST">  
        <!--parent id is the id of the parent text-->    
        <input type="hidden" name="parent_id" value="{{ text.id }}" >
        <input type="submit" value="iterate" >
    </form>

{{include('footer.php')}}