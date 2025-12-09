import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DocEditorPage from "./pages/DocEditor";
import "./index.css";

function Layout({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9" }}>
      <header
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "16px 32px",
          background: "#0f172a",
          color: "#fff",
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24 }}>Doc Automator</h1>
        <p style={{ margin: 0, color: "#cbd5f5" }}>DOCX editing + Jira AI in one workspace</p>
      </header>
      <main style={{ padding: "32px" }}>{children}</main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/docs" replace />} />
          <Route path="/docs" element={<DocEditorPage />} />
          <Route path="*" element={<Navigate to="/docs" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;
