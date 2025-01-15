{{ include('header.php', {title: 'Welcome'})}}
{# comments #}
    <div class="home">
    <div class="home-container">
        <div class="background-svg"></div>
        <div class="text-container">
           <!--  <p>{{message}}</p> -->
            <h1>collaborative writing</h1>
            <p>Add a few words to someone else's.</p>
            <p>Write a sentence, and see it grow legs.</p>
            <p>Write a phrase, and watch its head roll away.</p>
        </div>
        <div class="buttons-container">
            <a class="home-button login" href="{{path}}/login">
                <span class="svg-btn" data-svg="logIn"></span>
                <span>login</span>
            </a>
            <a class="home-button browse" href="{{path}}text">
                <span class="svg-btn" data-svg="browse"></span>
                <span>browse collaborations</span>
            </a>
            <a class="home-button how" href="#how">
                <span class="svg-btn" data-svg="how"></span>
                <span>how it works</span>
            </a>
        </div>
    </div>
    <div class="tutorial" id="how">
        <h2>join a collaboration</h2>
        <ul>
            <li>create an account and/or log in</li>
            <li>in the top menu: click on "see all texts"</li>
            <li>expand and explore the collaborations that interest you</li>
            <li>choose a story node that inspires you, and "iterate"</li>
            <li>vote on a winning text for this collaboration</li>
            <li>iterate some more</li>
            <li>** first text to get upvotes from all collaborating writers wins!</li>
        </ul>
        <h2>start a collaboration</h2>
        <ul>
            <li>create an account and/or log in</li>
            <li>in the top menu: click on "write something"</li>
            <li>write: text, prompt, keywords, etc.</li>
            <li>let your friends know! Or wait for someone from our community to contribute</li>
        </ul>
    </div>
    </div>
</body>
</html>