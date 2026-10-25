/* Theme de la boucle = theme de l'application : pose data-theme (light|dark) selon le systeme (voir src/ui/theme.ts).
   Les couleurs viennent de /theme/tokens.css et /theme/theme-dark.css (copies servies de src/styles). */
(function () {
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  function apply() { document.documentElement.setAttribute("data-theme", mq.matches ? "dark" : "light"); }
  apply();
  mq.addEventListener("change", apply);
})();
