import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Enable dark mode by default for minimalist black background
if (!localStorage.getItem("theme")) {
  localStorage.setItem("theme", "dark");
}
if (localStorage.getItem("theme") === "dark") {
  document.documentElement.classList.add("dark");
}

createRoot(document.getElementById("root")!).render(<App />);
