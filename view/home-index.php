{{ include('header.php', {title_key: 'page_title.home'})}}
{# comments #}
    <div class="home">
    <section class="home-container">
        <div class="background-svg"></div>
        <div class="text-container">
           <!--  <p>{{message}}</p> -->
            <h1 data-i18n="home_index.title">{{ translate('home_index.title') }}</h1>
            <p data-i18n="home_index.add_a_few_words">{{ translate('home_index.add_a_few_words') }}</p>
            <p data-i18n="home_index.write_a_sentence">{{ translate('home_index.write_a_sentence') }}</p>
            <p data-i18n="home_index.write_a_phrase">{{ translate('home_index.write_a_phrase') }}</p>
        </div>
        <div class="buttons-container">
            <a class="home-button login" href="{{ langUrl('login') }}">
                <span class="svg-btn" data-svg="logIn" data-i18n-title="home_index.login"></span>
                <span data-i18n="home_index.login">{{ translate('home_index.login') }}</span>
            </a>
            <a class="home-button browse" href="{{path}}text">
                <span class="svg-btn" data-svg="browse" data-i18n-title="home_index.browse"></span>
                <span data-i18n="home_index.browse">{{ translate('home_index.browse') }}</span>
            </a>
            <a class="home-button how" href="#how">
                <span class="svg-btn" data-svg="how" data-i18n-title="home_index.how"></span>
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
                        <span class="info-icon" data-svg="logIn"></span>
                    </h3>
                    <div class="info-text-container" data-i18n="home_index.collaborate_step_one_text">    
                        {{ translate('home_index.collaborate_step_one_text') }}
                    </div>
                </li>
                <li>
                    <h3>
                        <span data-i18n="home_index.collaborate_step_two_title">{{ translate('home_index.collaborate_step_two_title') }}</span>
                        <div class="icons">
                            <span class="info-icon" data-svg="tree" data-i18n-title="general.tree_tooltip" title="general.tree_tooltip"></span>
                            <span class="info-icon" data-svg="shelf" data-i18n-title="general.shelf_tooltip" title="general.shelf_tooltip"></span>
                        </div>
                    </h3>
                    <div class="info-text-container" data-i18n-html="true" data-i18n="home_index.collaborate_step_two_text">
                        {{ translate('home_index.collaborate_step_two_text') | raw }}
                    </div>
                </li>
                <li>
                    <h3>
                        <span data-i18n="home_index.collaborate_step_three_title">{{ translate('home_index.collaborate_step_three_title') }}</span>
                        <span class="info-icon" data-svg="iterate" data-i18n-title="general.iterate_tooltip" title="{{ translate('general.iterate_tooltip') }}"></span>
                    </h3>
                    <div class="info-text-container" data-i18n-html="true" data-i18n="home_index.collaborate_step_three_text">    
                        {{ translate('home_index.collaborate_step_three_text') | raw }}
                    </div>
                </li>
                <li>
                    <h3>
                        <span data-i18n="home_index.collaborate_step_four_title">{{ translate('home_index.collaborate_step_four_title') }}</span>
                        <span class="info-icon" data-svg="vote" data-i18n-title="general.vote_tooltip" title="{{ translate('general.vote_tooltip') }}"></span>
                    </h3>
                    <div class="info-text-container" data-i18n="home_index.collaborate_step_four_text">   
                        {{ translate('home_index.collaborate_step_four_text') }}
                    </div>
                </li>
            </ol>
        </div>
        <div class="info-container">
            <h2 data-i18n="home_index.how_to_start_new_collaboration">{{ translate('home_index.how_to_start_new_collaboration') }}</h2>
            <ol>
                <li>
                    <h3>
                        <span data-i18n="home_index.create_collaboration_step_one_title">{{ translate('home_index.create_collaboration_step_one_title') }}</span>
                        <span class="info-icon" data-svg="logIn" data-i18n-title="general.log_in_tooltip" title="{{ translate('general.log_in_tooltip') }}"></span>
                    </h3>
                    <div class="info-text-container" data-i18n="home_index.create_collaboration_step_one_text">    
                        {{ translate('home_index.create_collaboration_step_one_text') }}
                    </div>
                </li>
                <li>
                    <h3>
                        <span data-i18n="home_index.create_collaboration_step_two_title">{{ translate('home_index.create_collaboration_step_two_title') }}</span>
                        <span class="info-icon" data-svg="newGame" title="{{ translate('general.new_game_tooltip') }}" data-i18n-title="general.new_game_tooltip"></span>
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
                    <div class="info-text-container" data-i18n="home_index.create_collaboration_step_three_text">    
                        {{ translate('home_index.create_collaboration_step_three_text') }}
                    </div>
                </li>
            </ol>
        </div>
    </div>
</section>
{{ include('footer.php')}}