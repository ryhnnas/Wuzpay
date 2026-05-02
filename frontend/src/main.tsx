import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./app/App.tsx";
import "./styles/index.css";

if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  registerSW({ immediate: true });
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);