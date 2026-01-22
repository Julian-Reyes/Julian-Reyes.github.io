const toggleTheme = () => {
  document.documentElement.classList.toggle('dark');
  // Optional: Save preference to localStorage
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// Get references to the button and the menu
const menuBtn = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');

// Toggle the 'hidden' class when the button is clicked
menuBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});