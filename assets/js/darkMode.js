const toggleDarkMode = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
};

// Example: Add an event listener to a button
document.getElementById('theme-toggle').addEventListener('click', toggleDarkMode);