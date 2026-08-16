import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/global.css";

// Napomena: StrictMode namerno duplo pokrece efekte u dev rezimu radi hvatanja
// bugova - ali to ne radi dobro sa Leaflet-om (direktno menja DOM), pa je iskljucen.
createRoot(document.getElementById("root")!).render(<App />);
