import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
  console.error("Critical Error: #root element not found in index.html");
} else {
  try {
    const appRoot = ReactDOM.createRoot(rootElement);
    appRoot.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Application Render Crash:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; color: white; background: #ef4444; font-family: sans-serif; border-radius: 8px; margin: 20px;">
        <h1 style="font-size: 20px; font-bold: true;">Application Load Error</h1>
        <p>The app failed to start. This is usually due to missing environment variables (API keys) in Vercel.</p>
        <pre style="background: rgba(0,0,0,0.2); padding: 10px; font-size: 12px; margin-top: 10px;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
}
