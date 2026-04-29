import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import "./styles.css";

function syncViewportHeight() {
  const viewport = window.visualViewport;
  const height = Math.round(viewport?.height || window.innerHeight);
  document.documentElement.style.setProperty("--app-viewport-height", `${height}px`);
}

syncViewportHeight();
window.addEventListener("resize", syncViewportHeight, { passive: true });
window.visualViewport?.addEventListener("resize", syncViewportHeight, { passive: true });
window.visualViewport?.addEventListener("scroll", syncViewportHeight, { passive: true });

createApp(App).use(router).mount("#app");
