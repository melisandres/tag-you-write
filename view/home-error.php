{{ include('header.php', {title: 'Error'})}}

    {% if message is defined %}
        <h1 class="error">We can not do that.</h1>
        <p>{{ message }}</p>
    {% else %}
        <h1 class="error">404! page not found</h1>
        <p>Congratulations! Getting lost is the first step in getting anywhere worthwhile.</p>
    {% endif %}
</body>
</html>