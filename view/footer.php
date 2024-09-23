</main>
<footer>
        made with love by Melisandre
</footer>
</body>
</html>

<script>
    {% if toastMessage is defined and toastType is defined %}
        document.addEventListener('DOMContentLoaded', () => {
            eventBus.emit('showToast', { message: '{{ toastMessage }}', type: '{{ toastType }}' });
        });
    {% endif %}
</script>