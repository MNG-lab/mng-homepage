import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LanguageProvider } from "./context/LanguageContext";
import "./styles/a11y.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter basename="/">
        <App />
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>
);
