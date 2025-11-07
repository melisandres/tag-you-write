</main>
<footer>
    <div class="footer-content">
        <div class="footer-left">
            <div class="footer-made-with-love" data-i18n="footer.made_with_love">
                {{ translate('footer.made_with_love') }}
            </div>
        </div>
        <div class="footer-right">
            <a class="footer-about-btn" href="{{ langUrl('') }}#about" data-item="about" data-i18n-title="nav.about_tooltip" title="{{ translate('nav.about_tooltip') }}">
                <span class="icon" data-svg="about"></span>
                <span class="footer-about-text" data-i18n="nav.about">{{ translate('nav.about') }}</span>
            </a>
            <div class="footer-activity-indicator" id="footer-activity-indicator" title="{{ translate('activity.browsingVsEditing') }}" data-i18n-title="activity.browsingVsEditing">
                <div class="icon" data-svg="user"></div>
                <div class="activity-numbers">0:0</div>
            </div>
        </div>
    </div>
</footer>
</body>
</html>