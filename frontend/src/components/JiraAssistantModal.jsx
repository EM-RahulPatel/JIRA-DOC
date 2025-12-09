import { useState } from "react";
import JiraAssistantChat from "./JiraAssistantChat";

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "radial-gradient(circle at top, rgba(14,165,233,0.25), rgba(15,23,42,0.85))",
  backdropFilter: "blur(14px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  transition: "opacity 0.25s ease, visibility 0.25s ease",
};

const modalStyle = {
  width: "min(1100px, 96vw)",
  maxHeight: "90vh",
  background: "linear-gradient(140deg, rgba(255,255,255,0.97), rgba(248,250,252,0.92))",
  borderRadius: 28,
  border: "1px solid rgba(148,163,184,0.2)",
  boxShadow: "0 40px 100px rgba(15,23,42,0.45)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "20px 28px",
  borderBottom: "1px solid rgba(148,163,184,0.3)",
  background: "linear-gradient(120deg, rgba(15,118,229,0.08), rgba(14,165,233,0.12))",
};

const closeButtonStyle = {
  border: "1px solid rgba(148,163,184,0.4)",
  background: "rgba(255,255,255,0.65)",
  width: 38,
  height: 38,
  borderRadius: "50%",
  fontSize: 22,
  cursor: "pointer",
  color: "#0f172a",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease",
};

const bodyStyle = {
  padding: "26px",
  overflowY: "auto",
  background: "linear-gradient(180deg, rgba(248,250,252,0.65), rgba(248,250,252,1))",
};

export default function JiraAssistantModal({ open, onClose, contextText = "" }) {
  const [closeHovered, setCloseHovered] = useState(false);
  const hidden = !open;
  const containerStyle = hidden
    ? {
        ...overlayStyle,
        opacity: 0,
        visibility: "hidden",
        pointerEvents: "none",
      }
    : { ...overlayStyle, opacity: 1, visibility: "visible", pointerEvents: "auto" };
  const dynamicCloseButtonStyle = closeHovered
    ? {
        ...closeButtonStyle,
        background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
        color: "#fff",
        transform: "scale(1.05)",
      }
    : closeButtonStyle;

  return (
    <div style={containerStyle} aria-hidden={hidden}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>Jira Assistant</h2>
            <p style={{ margin: 4, color: "#475569" }}>
              Chat with the AI copilot to draft or update Jira issues.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={dynamicCloseButtonStyle}
            aria-label="Close Jira assistant"
            onMouseEnter={() => setCloseHovered(true)}
            onMouseLeave={() => setCloseHovered(false)}
          >
            ×
          </button>
        </div>
        <div style={bodyStyle}>
          <JiraAssistantChat contextText={contextText} />
        </div>
      </div>
    </div>
  );
}
