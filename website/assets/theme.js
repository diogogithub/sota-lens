(function () {
  const root = document.documentElement;
  const stored = localStorage.getItem("sotalens-theme");
  if (stored === "dark" || stored === "light") root.dataset.theme = stored;

  function label() {
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.textContent = root.dataset.theme === "dark" ? "Light mode" : "Dark mode";
    });
  }

  function notify() {
    document.dispatchEvent(new CustomEvent("sotaThemeChanged", { detail: { theme: root.dataset.theme } }));
  }

  document.addEventListener("click", (event) => {
    if (!event.target.matches("[data-theme-toggle]")) return;
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem("sotalens-theme", root.dataset.theme);
    label();
    notify();
  });

  label();
  notify();
})();
