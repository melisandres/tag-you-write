{{ include('header.php', {title_key: 'page_title.home'})}}
{# comments #}
    <div class="home">
        <section class="home-container">
            <div class="background-svg" data-svg="heart"></div>
            <div class="text-container" data-text-switcher="true">
            <!--  <p>{{message}}</p> -->
                <h1 data-i18n="home_index.title">{{ translate('home_index.title') }}</h1>
                <p data-i18n="home_index.add_a_few_words" data-switchable="true">{{ translate('home_index.add_a_few_words') }}</p>
                <p data-i18n="home_index.write_a_sentence" data-switchable="true">{{ translate('home_index.write_a_sentence') }}</p>
                <p data-i18n="home_index.write_a_phrase" data-switchable="true">{{ translate('home_index.write_a_phrase') }}</p>
            </div>
            <div class="buttons-container">
                <a class="home-button login" href="{{ langUrl('login') }}">
                    <span class="svg-btn" data-svg="logIn" data-i18n-title="home_index.login" title="{{ translate('home_index.login') }}"></span>
                    <span data-i18n="home_index.login">{{ translate('home_index.login') }}</span>
                </a>
                <a class="home-button browse" href="{{ langUrl('text') }}">
                    <span class="svg-btn" data-svg="browse" data-i18n-title="home_index.browse" title="{{ translate('home_index.browse') }}"></span>
                    <span data-i18n="home_index.browse">{{ translate('home_index.browse') }}</span>
                </a>
                <a class="home-button how" href="#how">
                    <span class="svg-btn" data-svg="how" data-i18n-title="home_index.how" title="{{ translate('home_index.how') }}"></span>
                    <span data-i18n="home_index.how">{{ translate('home_index.how') }}</span>
                </a>
            </div>
        </section>
        <section class="info" id="how">
            <div class="info-container">
                <h2 data-i18n="home_index.how_to_collaborate">{{ translate('home_index.how_to_collaborate') }}</h2>
                <ol>
                    <li>                
                        <h3>
                            <span data-i18n="home_index.collaborate_step_one_title">{{ translate('home_index.collaborate_step_one_title') }}</span>
                            <span class="info-icon" data-svg="logIn" {# data-i18n-title="home_index.login" title="{{ translate('home_index.login') }}" #}></span>
                        </h3>
                        <div class="info-text-container" data-i18n="home_index.collaborate_step_one_text">    
                            {{ translate('home_index.collaborate_step_one_text') }}
                        </div>
                    </li>
                    <li>
                        <h3>
                            <span data-i18n="home_index.collaborate_step_two_title">{{ translate('home_index.collaborate_step_two_title') }}</span>
                            <div class="icons">
                                <span class="info-icon" data-svg="tree" {# data-i18n-title="general.tree_tooltip" title="{{ translate('general.tree_tooltip') }}" #} data-i18n-tooltip="{{ translate('tooltips.tree_tooltip') }}"></span>
                                <span class="info-icon" data-svg="shelf" {# data-i18n-title="general.shelf_tooltip" title="{{ translate('general.shelf_tooltip') }}" #} data-i18n-tooltip="{{ translate('tooltips.shelf_tooltip') }}"></span>
                            </div>
                        </h3>
                        <div class="info-text-container" data-i18n-html="true" data-i18n="home_index.collaborate_step_two_text">
                            {{ translate('home_index.collaborate_step_two_text') | raw }}
                        </div>
                    </li>
                    <li>
                        <h3>
                            <span data-i18n="home_index.collaborate_step_three_title">{{ translate('home_index.collaborate_step_three_title') }}</span>
                            <span class="info-icon" data-svg="iterate" {# data-i18n-title="general.iterate_tooltip" title="{{ translate('general.iterate_tooltip') }}" #}></span>
                        </h3>
                        <div class="info-text-container" data-i18n-html="true" data-i18n="home_index.collaborate_step_three_text">    
                            {{ translate('home_index.collaborate_step_three_text') | raw }}
                        </div>
                    </li>
                    <li>
                        <h3>
                            <span data-i18n="home_index.collaborate_step_four_title">{{ translate('home_index.collaborate_step_four_title') }}</span>
                            <span class="info-icon" data-svg="vote" {# data-i18n-title="general.vote_tooltip" title="{{ translate('general.vote_tooltip') }}" #}></span>
                        </h3>
                        <div class="info-text-container" data-i18n="home_index.collaborate_step_four_text">   
                            {{ translate('home_index.collaborate_step_four_text') }}
                        </div>
                    </li>
                </ol>
            </div>
            <div class="info-container">
    <!--             <h2 data-i18n="home_index.how_to_start_new_collaboration">{{ translate('home_index.how_to_start_new_collaboration') }}</h2> -->
                <ol>
                    <li>
                        <h3>
                            <span data-i18n="home_index.create_collaboration_step_one_title">{{ translate('home_index.create_collaboration_step_one_title') }}</span>
                            <span class="info-icon" data-svg="newGame" {# data-i18n-title="general.login_tooltip" title="{{ translate('general.login_tooltip') }}" #}></span>
                        </h3>
                        <div class="info-text-container" data-i18n="home_index.create_collaboration_step_one_text">    
                            {{ translate('home_index.create_collaboration_step_one_text') }}
                        </div>
                    </li>
                    <li>
                        <h3>
                            <span data-i18n="home_index.create_collaboration_step_two_title">{{ translate('home_index.create_collaboration_step_two_title') }}</span>
                            <span class="info-icon" data-svg="invisible" {# title="{{ translate('general.new_game_tooltip') }}" data-i18n-title="general.new_game_tooltip" #} ></span>
                        </h3>
                        <div class="info-text-container" data-i18n-html="true" data-i18n="home_index.create_collaboration_step_two_text">    
                            {{ translate('home_index.create_collaboration_step_two_text') | raw }}
                        </div>
                    </li>
                    <li>
                        <h3>
                            <span data-i18n="home_index.create_collaboration_step_three_title">{{ translate('home_index.create_collaboration_step_three_title') }}</span>
                            <span class="info-icon" data-svg="heart"></span>
                        </h3>
                        <div class="info-text-container" data-i18n-html="true" data-i18n="home_index.create_collaboration_step_three_text">    
                            {{ translate('home_index.create_collaboration_step_three_text') | raw }}
                        </div>
                    </li>
                </ol>
            </div>
            <div class="info-heart-svg" data-svg="heart"></div>
        </section>
        <section class="info about-section" id="about">
            <div class="about-heart-svg" data-svg="heart"></div>
            <div class="about-container">
                <h2 class="about-title" data-i18n="about.title">{{ translate('about.title') }}</h2>
                <div class="about-description" data-i18n-html="true" data-i18n="about.description">
                    {{ translate('about.description') | raw }}
                </div>
                <div class="about-creator">
                    <div class="about-creator-image">
                        <img src="{{ path }}assets/imgs/melisandre.JPG" alt="Mélisandre, creator of Tag You Write" class="creator-photo">
                    </div>
                    <div class="about-creator-info">
                        <p class="creator-text" data-i18n="about.creator.bio">{{ translate('about.creator.bio') }}</p>
                    </div>
                </div>
            </div>
        </section>
    </div>

{{ include('footer.php')}}