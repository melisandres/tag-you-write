<!-- Overflow Menu -->
<div class="overflow-menu-overlay"></div>
<div class="overflow-menu">
    <div class="overflow-menu-header">
        <!-- Back Button (hidden by default, shown when submenu is active) -->
        <button class="overflow-menu-back" aria-label="Back to main menu" style="display: none;">
            <span class="back-arrow">←</span>
            <span class="back-text" data-i18n="nav.back">{{ translate('nav.back') }}</span>
        </button>
        
        <!-- Close Button -->
        <button class="overflow-menu-close" aria-label="Close menu">
            <span class="icon" data-svg="close"></span>
        </button>
    </div>
    <div class="overflow-menu-content">
        <!-- Main Menu Column -->
        <div class="overflow-menu-main">
            <!-- Language Switcher -->
            <div class="overflow-menu-item">
                <div class="nav-link language-switcher" data-item="language" data-i18n-title="nav.language_tooltip" title="{{ translate('nav.language_tooltip') }}">
                    <div class="current-language">
                        {% if current_language == 'en' %}EN{% else %}FR{% endif %}
                    </div>
                    <div class="nav-text" data-i18n="nav.language">
                        {{ translate('nav.language') }}
                    </div>
                </div>
            </div>

            <!-- Tutorial Switcher -->
            <div class="overflow-menu-item">
                <div class="nav-link tutorial-switcher" data-item="tutorial" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
                    <div class="current-tutorial" data-svg="how" data-i18n-title="nav.tutorial_tooltip" title="{{ translate('nav.tutorial_tooltip') }}">
                    </div>
                    <div class="nav-text" data-i18n="nav.tutorial">
                        {{ translate('nav.tutorial') }}
                    </div>
                </div>
            </div>

        

        <!-- Home Link -->
        {% if title_key != 'page_title.home' %}
        <div class="overflow-menu-item">
            <a class="nav-link home" data-item="home" href="{{ langUrl('') }}">
                <span class="icon" data-svg="home" data-i18n-title="nav.home_tooltip" title="{{ translate('nav.home_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.home">
                    {{ translate('nav.home') }}
                </span>
            </a>
        </div>
        {% endif %}

        <!-- Dashboard Link -->
        {% if not guest and title_key != 'page_title.dashboard' %}
        <div class="overflow-menu-item">
            <a class="nav-link dashboard-nav" data-item="dashboard" href="{{ langUrl('dashboard') }}">
                <span class="icon" data-svg="dashboard" data-i18n-title="nav.dashboard_tooltip" title="{{ translate('nav.dashboard_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.dashboard">
                    {{ translate('nav.dashboard') }}
                </span>
            </a>
        </div>
        {% endif %}

        {# Filters Switcher - replaces individual filter, search, and category links #}
        {% if title_key == 'page_title.texts' or title_key == 'page_title.dashboard' or title_key == 'page_title.story_collab' %}
        <div class="overflow-menu-item">
            <div class="nav-link filters-switcher" data-item="filters" data-i18n-title="nav.filters_tooltip" title="{{ translate('nav.filters_tooltip') }}">
                <div class="current-filters" data-svg="filters" data-i18n-title="nav.filters_tooltip" title="{{ translate('nav.filters_tooltip') }}">
                </div>
                <div class="nav-text" data-i18n="nav.filters">
                    {{ translate('nav.filters') }}
                </div>
                <div class="filters-dropdown">
                    {% if title_key == 'page_title.texts' %}
                        <a data-filter-menu="category" data-i18n="nav.category" data-i18n-title="nav.category_tooltip" title="{{ translate('nav.category_tooltip') }}">
                            <span class="icon" data-svg="category"></span>
                            <span data-i18n="nav.category">{{ translate('nav.category') }}</span>
                        </a>
                    {% endif %}
                    {% if title_key == 'page_title.texts' or title_key == 'page_title.story_collab' or title_key == 'page_title.dashboard' %}
                        <a data-filter-menu="search" data-i18n="nav.search" data-i18n-title="nav.search_tooltip" title="{{ translate('nav.search_tooltip') }}">
                            <span class="icon" data-svg="search"></span>
                            <span data-i18n="nav.search">{{ translate('nav.search') }}</span>
                        </a>
                    {% endif %}
                    {% if title_key == 'page_title.texts' or title_key == 'page_title.dashboard' %}
                        <a data-filter-menu="filter" data-i18n="nav.filter" data-i18n-title="nav.filter_tooltip" title="{{ translate('nav.filter_tooltip') }}">
                            <span class="icon" data-svg="filter"></span>
                            <span data-i18n="nav.filter">{{ translate('nav.filter') }}</span>
                        </a>
                    {% endif %}
                    <div class="filters-dropdown-divider"></div>
                    <a data-filter-action="view-all" data-i18n="nav.view_all" data-i18n-title="nav.view_all_tooltip" title="{{ translate('nav.view_all_tooltip') }}">
                        <span data-i18n="nav.view_all">{{ translate('nav.view_all') }}</span>
                    </a>
                    <a data-filter-action="hide-all" data-i18n="nav.hide_all" data-i18n-title="nav.hide_all_tooltip" title="{{ translate('nav.hide_all_tooltip') }}">
                        <span data-i18n="nav.hide_all">{{ translate('nav.hide_all') }}</span>
                    </a>
                </div>
            </div>
        </div>
        {% else %}
        <div class="overflow-menu-item">
            <a class="nav-link texts" data-item="browse" href="{{ langUrl('text') }}">
                <span class="icon" data-svg="browse" data-i18n-title="nav.browse_tooltip" title="{{ translate('nav.browse_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.browse">
                    {{ translate('nav.browse') }}
                </span>
            </a>
        </div>
        {% endif %}

        <!-- Login Link (for guests) -->
        {% if guest and title_key != 'page_title.login' %}
        <div class="overflow-menu-item">
            <a class="nav-link writers" data-item="login" href="{{ langUrl('login') }}">
                <span class="icon" data-svg="logIn" data-i18n-title="nav.login_tooltip" title="{{ translate('nav.login_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.login">
                    {{ translate('nav.login') }}
                </span>
            </a>
        </div>
        {% endif %}

        <!-- New Game Link (for logged in users) -->
        {% if not guest %}
        <div class="overflow-menu-item">
            <a class="nav-link newGame" data-item="newGame" href="{{ langUrl('text/create?new=true') }}">
                <span class="icon" data-svg="newGame" data-i18n-title="nav.newGame_tooltip" title="{{ translate('nav.newGame_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.newGame">
                    {{ translate('nav.newGame') }}
                </span>
            </a>
        </div>

        <!-- Notifications Link -->
        <div class="overflow-menu-item">
            <a class="nav-link notifications" data-item="notifications">
                <span class="icon" data-svg="notification" data-i18n-title="nav.notifications_tooltip" title="{{ translate('nav.notifications_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.notifications">
                    {{ translate('nav.notifications') }}
                </span>
            </a>
        </div>

        <!-- Journal Link (for admin) -->
        {% if session.privilege == 1 %}
        <div class="overflow-menu-item">
            <a class="nav-link writers" data-item="journal" href="{{ langUrl('journal') }}">
                <span class="icon" data-svg="journal" data-i18n-title="nav.journal_tooltip" title="{{ translate('nav.journal_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.journal">
                    {{ translate('nav.journal') }}
                </span>
            </a>
        </div>

        <!-- Dev Mode Toggle (for admin) -->
        <div class="overflow-menu-item">
            <div class="nav-link dev-mode-toggle" data-item="devMode" data-i18n-title="nav.dev_mode_tooltip" title="{{ translate('nav.dev_mode_tooltip') }}">
                <div class="current-privilege">
                    {% if session.test_privilege == 2 %}REG{% elseif session.test_privilege == 4 %}BETA{% else %}ADM{% endif %}
                </div>
                <div class="nav-text" data-i18n="nav.dev_mode">
                    {{ translate('nav.dev_mode') }}
                </div>
            </div>
        </div>
        {% endif %}
    {% endif %}
        <!-- About Link -->
        <div class="overflow-menu-item">
            <a class="nav-link about" href="{{ langUrl('') }}#about" data-item="about" data-i18n-title="nav.about_tooltip" title="{{ translate('nav.about_tooltip') }}">
                <span class="icon" data-svg="about" data-i18n-title="nav.about_tooltip" title="{{ translate('nav.about_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.about">
                    {{ translate('nav.about') }}
                </span>
            </a>
        </div>

        <!-- Contact Link -->
        <div class="overflow-menu-item">
            <a class="nav-link contact" href="#" data-item="contact" data-i18n-title="nav.contact_tooltip" title="{{ translate('nav.contact_tooltip') }}">
                <span class="icon" data-svg="contact" data-i18n-title="nav.contact_tooltip" title="{{ translate('nav.contact_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.contact">
                    {{ translate('nav.contact') }}
                </span>
            </a>
        </div>
    {% if not guest %}
        <!-- Logout Link -->
        {% if title_key != 'page_title.login' %}
        <div class="overflow-menu-item">
            <a class="nav-link writers" data-item="logout" href="{{ langUrl('login/logout') }}">
                <span class="icon" data-svg="logOut" data-i18n-title="nav.logout_tooltip" title="{{ translate('nav.logout_tooltip') }}"></span>
                <span class="nav-text" data-i18n="nav.logout">
                    {{ translate('nav.logout') }}
                </span>
            </a>
        </div>
        {% endif %}
        {% endif %}
        </div>
        
        <!-- Submenu Column -->
        <div class="overflow-menu-submenu">
            <!-- Language Submenu -->
            <div class="submenu-content language-submenu" data-submenu="language">
                <h3 data-i18n="nav.language">{{ translate('nav.language') }}</h3>
                <a data-language="en" class="{% if current_language == 'en' %}active{% endif %}">English</a>
                <a data-language="fr" class="{% if current_language == 'fr' %}active{% endif %}">Français</a>
            </div>
            
            <!-- Tutorial Submenu -->
            <div class="submenu-content tutorial-submenu" data-submenu="tutorial">
                <h3 data-i18n="nav.tutorial">{{ translate('nav.tutorial') }}</h3>
                <a data-tutorial="start-game" data-i18n="nav.tutorial_start_game">{{ translate('nav.tutorial_start_game') }}</a>
                <a data-tutorial="contribute" data-i18n="nav.tutorial_contribute">{{ translate('nav.tutorial_contribute') }}</a>
                <a data-tutorial="vote" data-i18n="nav.tutorial_vote">{{ translate('nav.tutorial_vote') }}</a>
            </div>
            
            <!-- Dev Mode Submenu (for admin) -->
            {% if session.privilege == 1 %}
            <div class="submenu-content dev-mode-submenu" data-submenu="devMode">
                <h3 data-i18n="nav.dev_mode">{{ translate('nav.dev_mode') }}</h3>
                <a data-privilege="1" class="{% if not session.test_privilege or session.test_privilege == 1 %}active{% endif %}" data-i18n="nav.dev_mode_admin" data-i18n-title="nav.dev_mode_admin_tooltip" title="{{ translate('nav.dev_mode_admin_tooltip') }}">{{ translate('nav.dev_mode_admin') }}</a>
                <a data-privilege="2" class="{% if session.test_privilege == 2 %}active{% endif %}" data-i18n="nav.dev_mode_regular" data-i18n-title="nav.dev_mode_regular_tooltip" title="{{ translate('nav.dev_mode_regular_tooltip') }}">{{ translate('nav.dev_mode_regular') }}</a>
                <a data-privilege="4" class="{% if session.test_privilege == 4 %}active{% endif %}" data-i18n="nav.dev_mode_beta" data-i18n-title="nav.dev_mode_beta_tooltip" title="{{ translate('nav.dev_mode_beta_tooltip') }}">{{ translate('nav.dev_mode_beta') }}</a>
            </div>
            {% endif %}
        </div>
    </div>
</div>
