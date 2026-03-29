    const themeToggleBtn = document.getElementById("themeToggleBtn");
    const themeToggleLabel = document.getElementById("themeToggleLabel");

    function applyTheme(theme) {
      const currentTheme = theme === "dark" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", currentTheme);
      themeToggleBtn.setAttribute("aria-pressed", String(currentTheme === "dark"));
      themeToggleLabel.textContent = currentTheme === "dark" ? "Light mode" : "Dark mode";
      const themeMeta = document.querySelector('meta[name="theme-color"]');
      if (themeMeta) {
        themeMeta.setAttribute("content", currentTheme === "dark" ? "#07111f" : "#fafafa");
      }
      try {
        window.localStorage.setItem("mypaceTheme", currentTheme);
      } catch {}
    }

    function loadThemePreference() {
      try {
        const storedTheme = window.localStorage.getItem("mypaceTheme");
        if (storedTheme === "dark" || storedTheme === "light") {
          applyTheme(storedTheme);
          return;
        }
      } catch {}
      applyTheme("light");
    }

    themeToggleBtn.addEventListener("click", () => {
      const isDark = document.documentElement.getAttribute("data-theme") === "dark";
      applyTheme(isDark ? "light" : "dark");
    });

    loadThemePreference();
  
