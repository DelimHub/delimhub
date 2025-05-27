import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import React Toastify CSS
import 'react-toastify/dist/ReactToastify.css';

// Create a root and render the app
createRoot(document.getElementById("root")!).render(<App />);
