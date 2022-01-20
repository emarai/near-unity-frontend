import { StrictMode } from "react";
import { render } from "react-dom";
import App from "./app";
import "./index.css";

const rootElement = document.getElementById("root");

// renders the app onto the document
render(
  <StrictMode>
    <App />
  </StrictMode>,
  rootElement
);