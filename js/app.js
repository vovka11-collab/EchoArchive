document.addEventListener('DOMContentLoaded', () => {
    // Инициализируем модули
    window.Player.init();
    window.Search.init();

    // Запускаем стартовый поиск, чтобы экран не был пустым
    window.Search.performSearch();
});