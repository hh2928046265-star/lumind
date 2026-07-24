import React from "react"
import ReactDOM from "react-dom/client"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import LandingPage from "./App"
import { WorkspacePage } from "./pages/WorkspacePage"
import { IdentityPage } from "./pages/IdentityPage"
import { MemoryPage } from "./pages/MemoryPage"
import { SettingsPage } from "./pages/SettingsPage"
import { ErrorBoundary } from "./components/ErrorBoundary"
import "./index.css"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/workspace/:id" element={<WorkspacePage />} />
          <Route path="/identity" element={<IdentityPage />} />
          <Route path="/memory" element={<MemoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)