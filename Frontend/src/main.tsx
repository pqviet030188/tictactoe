import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import AppSaga from "./App2.tsx";
import SignalRApp from "./App3.tsx";
import { Provider } from "react-redux";
import { store } from "./store";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    {/* <Provider store={store}>
      <AppSaga />
    </Provider>
    <SignalRApp /> */}
  </StrictMode>
);
