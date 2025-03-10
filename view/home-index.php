{{ include('header.php', {title: 'Welcome'})}}
{# comments #}
    <div class="home">
    <section class="home-container">
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
</section>
    <section class="info" id="how">
        <div class="info-container">
            <h2>How to collaborate:</h2>
            <ol>
                <li>                
                    <h3>
                        1. Log in
                        <span class="info-icon" data-svg="logIn"></span>
                    </h3>
                    <div class="info-text-container">    
                        Create an account and/or log in.
                    </div>
                </li>
                <li>
                    <h3>
                        2. Explore
                        <div class="icons">
                            <span class="info-icon" data-svg="tree"></span>
                            <span class="info-icon" data-svg="shelf"></span>
                        </div>
                    </h3>
                    <div class="info-text-container">
                        Click on <span class="info-icon" data-svg="browse"></span> (top menu) to enter our library, where you can expand and explore collaborations.
                    </div>
                </li>
                <li>
                    <h3>
                        3. Write
                        <span class="info-icon" data-svg="iterate"></span>
                    </h3>
                    <div class="info-text-container">    
                        Choose a story node that inspires you, change the text ("iterate"), and publish <span class="info-icon" data-svg="publish"></span>your version when you're ready to share.
                    </div>
                </li>
                <li>
                    <h3>
                        4. Vote
                        <span class="info-icon" data-svg="vote"></span>
                    </h3>
                    <div class="info-text-container">    
                        Vote on a winning text. The first text to get upvotes from all collaborating writers wins!
                    </div>
                </li>
            </ol>
        </div>
        <div class="info-container">
            <h2>How to start a new collaboration:</h2>
            <ol>
                <li>
                    <h3>
                        1. Log in
                        <span class="info-icon" data-svg="logIn"></span>
                    </h3>
                    <div class="info-text-container">    
                        Create an account and/or log in.
                    </div>
                </li>
                <li>
                    <h3>
                        2. Create
                        <span class="info-icon" data-svg="newGame"></span>
                    </h3>
                    <div class="info-text-container">    
                        Click on <span class="info-icon" data-svg="newGame"></span> (top menu) to start a new collaboration. You will be asked to create a title, a prompt, and a starting text. All future collaborators will consult yout title and prompt while they write. When you're ready to share, just publish <span class="info-icon" data-svg="publish"></span>.
                    </div>
                </li>
                <li>
                    <h3>
                        3. Share
                        <span class="info-icon" data-svg="heart"></span>
                    </h3>
                    <div class="info-text-container">    
                        Let your friends know! Or wait for someone from our community to contribute.
                    </div>
                </li>
            </ol>
        </div>
    </div>
</section>
{{ include('footer.php')}}