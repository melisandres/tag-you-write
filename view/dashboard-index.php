{{ include('header.php', {title_key: 'page_title.dashboard'})}}

<!-- Store the flat games data for DataManager compatibility -->
<script type="application/json" id="games-data">
    {{ gamesData|raw }}
</script>

<main class="dashboard">
    {% set sections = [] %}
    
    {% if not guest %}
        {% set sections = sections|merge([
            {
                key: 'myStories',
                title: 'dashboard.my_stories',
                cssClass: 'my-stories',
                subcategories: [
                    { key: 'drafts', title: 'dashboard.drafts' },
                    { key: 'active', title: 'dashboard.active' },
                    { key: 'archives', title: 'dashboard.archives' }
                ]
            }
        ]) %}
    {% endif %}
    
    {% set sections = sections|merge([
        {
            key: 'canJoin',
            title: 'dashboard.games_i_can_join',
            cssClass: 'joinable-games',
            subcategories: [
                { key: 'invitations', title: 'dashboard.invitations' },
                { key: 'other', title: 'dashboard.other' }
            ]
        }
    ]) %}
    
    {% set inspirationSubcategories = [] %}
    
    {% set inspirationSubcategories = inspirationSubcategories|merge([
        { key: 'closed', title: 'dashboard.closed' }
    ]) %}
    
    {% set sections = sections|merge([
        {
            key: 'inspiration',
            title: 'dashboard.inspiration',
            cssClass: 'inspiration',
            subcategories: inspirationSubcategories
        }
    ]) %}
    
    {% for section in sections %}
        <section class="dashboard-section {{ section.cssClass }}">
            <h2 data-i18n="{{ section.title }}">{{ translate(section.title) }}</h2>
            
            {% for subcategory in section.subcategories %}
                {% set categoryData = dashboardData[section.key][subcategory.key] %}
                {% set categoryUrl = section.key ~ '.' ~ subcategory.key %}
                <div class="dashboard-category">
                    <div class="category-header" data-category="{{ section.key }}.{{ subcategory.key }}">
                        <div class="category-header-left">
                            <a href="{{ langUrl('text?category=' ~ categoryUrl) }}" class="browse-button" data-i18n-title="dashboard.browseCategory" title="{{ translate('dashboard.browseCategory') }}">
                                <span class="icon" data-svg="browse"></span>
                            </a>
                            <h3 class="category-title {{ categoryData.hasUnreads ? 'has-unreads' : '' }}">
                                <span data-i18n="dashboard.{{ subcategory.key }}">{{ translate('dashboard.' ~ subcategory.key) }}</span>
                                <span class="count">({{ categoryData.count }})</span>
                            </h3>
                        </div>
                        <span class="collapse-toggle collapsed">▼</span>
                    </div>
                    <div class="category-games collapsed">
                        {% for game in categoryData.games %}
                            <div class="dashboard-game-item" data-game-id="{{ game.game_id }}" data-text-id="{{ game.id }}">
                                <div class="game-title">
                                    <div class="unread-area">
                                        {% if game.unseen_count > 0 %}
                                            <span class="unread-indicator" data-unread-count="{{ game.unseen_count }}">{{ game.unseen_count }}</span>
                                        {% endif %}
                                    </div>
                                    <span class="title">{{ game.title ? game.title : translate('general.untitled') }}</span>
                                </div>
                            </div>
                        {% endfor %}
                    </div>
                </div>
            {% endfor %}
        </section>
    {% endfor %}
</main>

{{ include('footer.php')}}
