import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";
import "./styles/a11y.css";

function detectRouterBasename() {
  try {
    const scriptPath = new URL(import.meta.url).pathname;
    const match = scriptPath.match(/^(.*)\/assets\/[^/]+$/);
    if (!match) return "/";
    const prefix = match[1] || "/";
    return prefix === "" ? "/" : prefix;
  } catch {
    return "/";
  }
}

const routerBasename = detectRouterBasename();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter basename={routerBasename}>
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
);
