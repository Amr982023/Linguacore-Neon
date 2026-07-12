import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import ActivationGate from "./pages/ActivationGate";
import "./index.css";
import { useThemeStore } from "./context/themeStore";

// Init dark mode before render
useThemeStore.getState().init();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ActivationGate>
        <App />
      </ActivationGate>
    </QueryClientProvider>
  </React.StrictMode>,
);
