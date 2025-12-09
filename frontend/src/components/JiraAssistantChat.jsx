import { useEffect, useMemo, useRef, useState } from "react";
import { composeProjectIssue, getProjects, updateIssue } from "../services/api";

const bubbleBase = {
  maxWidth: "70%",
  padding: "16px 20px",
  borderRadius: 20,
  fontSize: 14,
  lineHeight: 1.5,
  whiteSpace: "pre-wrap",
  border: "1px solid rgba(148,163,184,0.3)",
  boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
};

const assistantBubble = {
  ...bubbleBase,
  background: "linear-gradient(165deg, rgba(241,245,249,0.95), rgba(226,232,240,0.9))",
  color: "#0f172a",
  borderTopLeftRadius: 8,
};

const userBubble = {
  ...bubbleBase,
  background: "linear-gradient(135deg, #2563eb, #0ea5e9)",
  color: "#fff",
  borderTopRightRadius: 8,
  marginLeft: "auto",
  boxShadow: "0 12px 30px rgba(37,99,235,0.35)",
};

const statusBubble = {
  ...bubbleBase,
  background: "linear-gradient(160deg, #f0fdf4, #dcfce7)",
  color: "#166534",
  borderRadius: 16,
};

const controlsRow = {
  display: "flex",
  gap: 18,
  flexWrap: "wrap",
  marginBottom: 18,
  padding: 18,
  borderRadius: 18,
  background: "linear-gradient(140deg, rgba(226,232,240,0.55), rgba(248,250,252,0.8))",
  border: "1px solid rgba(148,163,184,0.25)",
};

const modeButton = (active) => ({
  padding: "8px 18px",
  borderRadius: 999,
  border: "1px solid",
  borderColor: active ? "#2563eb" : "rgba(148,163,184,0.6)",
  background: active ? "linear-gradient(135deg, #2563eb, #0ea5e9)" : "rgba(255,255,255,0.4)",
  color: active ? "#fff" : "#0f172a",
  cursor: "pointer",
  fontWeight: 600,
  boxShadow: active ? "0 10px 20px rgba(37,99,235,0.3)" : "none",
});

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 6,
  letterSpacing: 0.3,
  textTransform: "uppercase",
  color: "#475569",
};

const selectStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(148,163,184,0.7)",
  background: "rgba(255,255,255,0.8)",
  fontSize: 14,
  color: "#0f172a",
};

const textareaStyle = {
  width: "100%",
  padding: 14,
  borderRadius: 16,
  border: "1px solid rgba(148,163,184,0.7)",
  resize: "none",
  fontSize: 14,
  minHeight: 110,
  background: "rgba(255,255,255,0.9)",
  boxShadow: "inset 0 2px 6px rgba(15,23,42,0.08)",
  boxSizing: "border-box",
};

const bannerStyle = (variant = "context") => ({
  borderRadius: 16,
  padding: 14,
  fontSize: 13,
  border: "1px solid",
  borderColor: variant === "context" ? "rgba(34,211,238,0.5)" : "rgba(148,163,184,0.4)",
  background:
    variant === "context"
      ? "linear-gradient(135deg, rgba(6,182,212,0.12), rgba(14,165,233,0.15))"
      : "linear-gradient(135deg, rgba(226,232,240,0.4), rgba(248,250,252,0.7))",
  color: "#0f172a",
  marginBottom: 12,
  boxShadow: "0 6px 20px rgba(15,23,42,0.05)",
});

const chatShellStyle = {
  display: "flex",
  flexDirection: "column",
  height: "100%",
  background: "linear-gradient(145deg, #f8fafc, #eef2ff)",
  borderRadius: 22,
  border: "1px solid rgba(148,163,184,0.2)",
  padding: 24,
};

const sendButtonStyle = (disabled) => ({
  padding: "12px 28px",
  borderRadius: 999,
  border: "none",
  background: disabled
    ? "linear-gradient(135deg, #cbd5f5, #a5b4fc)"
    : "linear-gradient(135deg, #2563eb, #0ea5e9)",
  color: "#fff",
  fontWeight: 600,
  cursor: disabled ? "wait" : "pointer",
  boxShadow: disabled ? "none" : "0 15px 30px rgba(14,165,233,0.35)",
  transition: "transform 0.15s ease",
});

const createIssueButtonStyle = (disabled) => ({
  alignSelf: "flex-start",
  padding: "9px 14px",
  borderRadius: 12,
  border: "none",
  background: disabled
    ? "linear-gradient(135deg, #bae6fd, #7dd3fc)"
    : "linear-gradient(135deg, #06b6d4, #0ea5e9)",
  color: "#fff",
  cursor: disabled ? "wait" : "pointer",
  fontWeight: 600,
  boxShadow: disabled ? "none" : "0 10px 20px rgba(14,165,233,0.35)",
});

const defaultMessages = [
  {
    id: "welcome",
    role: "assistant",
    type: "text",
    content:
      "Hi! I can draft new Jira tickets with context or apply updates to existing issues. Choose a project, describe the work, and I'll handle the rest.",
  },
];

function createId(prefix = "msg") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const buildConversationTranscript = (history = []) => {
  const relevant = history.filter((message) => {
    if (message.role === "user") {
      return true;
    }
    return message.type === "draft";
  });
  const recent = relevant.slice(-8);
  return recent
    .map((message) => {
      if (message.role === "user") {
        return `User (${message.projectKey || "unknown"}): ${message.content}`;
      }
      if (message.type === "draft" && message.draft) {
        return [
          `Assistant Draft for ${message.projectKey}:`,
          `Summary: ${message.draft.summary || ""}`,
          `Description: ${message.draft.description || ""}`,
          `Priority: ${message.draft.priority || ""}`,
        ]
          .filter(Boolean)
          .join("\n");
      }
      return `${message.role || "assistant"}: ${message.content}`;
    })
    .join("\n\n");
};

const normalizeList = (value) => {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item : String(item)))
      .map((item) => item.trim().replace(/\s+/g, "-"))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim().replace(/\s+/g, "-"))
      .filter(Boolean);
  }
  return [];
};

const sanitizeDraftForSubmit = (draft) => {
  if (!draft || typeof draft !== "object") {
    return undefined;
  }
  const payload = { ...draft };
  payload.summary = typeof payload.summary === "string" ? payload.summary.trim() : payload.summary;
  payload.description =
    typeof payload.description === "string" ? payload.description.trim() : payload.description;
  payload.assignee = typeof payload.assignee === "string" ? payload.assignee.trim() : payload.assignee;
  payload.labels = normalizeList(payload.labels);
  payload.components = normalizeList(payload.components);
  if (payload.estimate !== undefined) {
    const numeric =
      typeof payload.estimate === "number"
        ? payload.estimate
        : Number.parseFloat(payload.estimate);
    if (Number.isFinite(numeric)) {
      payload.estimate = numeric;
    } else {
      delete payload.estimate;
    }
  }
  return payload;
};

const formatErrorMessage = (raw) => {
  if (!raw) {
    return "Something went wrong while contacting Jira.";
  }
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }
        if (item?.msg) {
          const loc = Array.isArray(item.loc) ? ` [${item.loc.join(".")}]` : "";
          return `${item.msg}${loc}`;
        }
        return JSON.stringify(item);
      })
      .join(" | ");
  }
  if (typeof raw === "object") {
    if (raw.detail) {
      return formatErrorMessage(raw.detail);
    }
    if (raw.error) {
      return formatErrorMessage(raw.error);
    }
    if (raw.message) {
      return raw.message;
    }
    return JSON.stringify(raw);
  }
  return String(raw);
};

export default function JiraAssistantChat({ contextText = "" }) {
  const [projects, setProjects] = useState([]);
  const [projectKey, setProjectKey] = useState("");
  const [mode, setMode] = useState("compose");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(defaultMessages);
  const [pending, setPending] = useState(false);
  const [pendingActionId, setPendingActionId] = useState(null);
  const [error, setError] = useState("");
  const chatRef = useRef(null);
  const trimmedDocumentContext = typeof contextText === "string" ? contextText.trim() : "";
  const hasContext = Boolean(trimmedDocumentContext);

  const buildCombinedContext = (historySnapshot) => {
    const conversation = buildConversationTranscript(historySnapshot);
    return [trimmedDocumentContext, conversation].filter(Boolean).join("\n\n---\n\n");
  };

  useEffect(() => {
    let mounted = true;
    getProjects()
      .then((res) => {
        if (!mounted) {
          return;
        }
        const list = res.data?.projects || res.data || [];
        setProjects(list);
        if (!projectKey && list.length) {
          setProjectKey(list[0].key);
        }
      })
      .catch((err) => {
        if (!mounted) {
          return;
        }
        setMessages((prev) => [
          ...prev,
          {
            id: createId("error"),
            role: "assistant",
            type: "error",
            content: err.response?.data?.detail || err.message || "Failed to load projects",
          },
        ]);
      });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  const selectedProject = useMemo(
    () => projects.find((project) => project.key === projectKey),
    [projects, projectKey]
  );

  const appendMessage = (message) => {
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    if (mode === "compose" && !projectKey) {
      setError("Select a project before drafting an issue.");
      return;
    }

    const userMessage = {
      id: createId("user"),
      role: "user",
      type: mode,
      content: trimmed,
      projectKey,
    };
    const nextHistory = [...messages, userMessage];
    appendMessage(userMessage);
    setInput("");
    setError("");
    setPending(true);

    try {
      const combinedContext = buildCombinedContext(nextHistory) || undefined;
      if (mode === "compose") {
        const response = await composeProjectIssue({
          projectKey,
          text: trimmed,
          createOnJira: false,
          contextText: combinedContext,
        });
        const data = response.data || {};
        const draft = data.generated || data;
        appendMessage({
          id: createId("draft"),
          role: "assistant",
          type: "draft",
          content: `Draft ready for ${projectKey}`,
          draft,
          projectKey,
          prompt: trimmed,
          ragChunks: data.context?.ragChunks || [],
        });
      } else {
        const response = await updateIssue(trimmed);
        const data = response.data || {};
        appendMessage({
          id: createId("update"),
          role: "assistant",
          type: "update",
          content: data.issueKey
            ? `Updated ${data.issueKey} successfully.`
            : "Update applied.",
          issueKey: data.issueKey,
          updatedFields: data.updatedFields || [],
          analysis: data.analysis,
        });
      }
    } catch (err) {
      const errorPayload =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data ||
        err.message;
      appendMessage({
        id: createId("error"),
        role: "assistant",
        type: "error",
        content: formatErrorMessage(errorPayload),
      });
    } finally {
      setPending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleCreateIssue = async (message) => {
    if (!message?.draft || !message.projectKey) {
      return;
    }
    setPendingActionId(message.id);
    try {
      const sanitizedDraft = sanitizeDraftForSubmit(message.draft);
      const response = await composeProjectIssue({
        projectKey: message.projectKey,
        text: message.prompt || message.draft.summary,
        createOnJira: true,
        draft: sanitizedDraft,
        contextText: buildCombinedContext(messages) || undefined,
      });
      const createdKey = response.data?.created?.key || response.data?.generated?.key;
      appendMessage({
        id: createId("status"),
        role: "assistant",
        type: "status",
        content: createdKey
          ? `Created issue ${createdKey} in Jira.`
          : "Issue created in Jira.",
      });
    } catch (err) {
      const errorPayload =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.response?.data ||
        err.message;
      appendMessage({
        id: createId("error"),
        role: "assistant",
        type: "error",
        content: formatErrorMessage(errorPayload),
      });
    } finally {
      setPendingActionId(null);
    }
  };

  const renderMessage = (message) => {
    if (message.type === "status") {
      return (
        <div key={message.id} style={{ alignSelf: "center" }}>
          <div style={statusBubble}>{message.content}</div>
        </div>
      );
    }

    const isUser = message.role === "user";
    const bubbleStyle = isUser ? userBubble : assistantBubble;

    return (
      <div
        key={message.id}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: isUser ? "flex-end" : "flex-start",
          gap: 8,
        }}
      >
        <div style={bubbleStyle}>
          <p style={{ margin: 0 }}>{message.content}</p>
          {message.type === "draft" && message.draft && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <strong>Summary</strong>
                <p style={{ margin: "4px 0 0" }}>{message.draft.summary || "No summary"}</p>
              </div>
              <div>
                <strong>Description</strong>
                <p style={{ margin: "4px 0 0" }}>{message.draft.description || "No description"}</p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12 }}>
                <span>
                  <strong>Priority:</strong> {message.draft.priority || "-"}
                </span>
                <span>
                  <strong>Assignee:</strong> {message.draft.assignee || "-"}
                </span>
                {message.draft.labels?.length ? (
                  <span>
                    <strong>Labels:</strong> {message.draft.labels.join(", ")}
                  </span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => handleCreateIssue(message)}
                disabled={pendingActionId === message.id}
                style={createIssueButtonStyle(pendingActionId === message.id)}
              >
                {pendingActionId === message.id ? "Creating…" : "Create in Jira"}
              </button>
            </div>
          )}

          {message.type === "update" && (
            <div style={{ marginTop: 12, fontSize: 13, color: "#334155" }}>
              {message.issueKey && (
                <p style={{ margin: "0 0 4px" }}>
                  <strong>Issue:</strong> {message.issueKey}
                </p>
              )}
              {message.updatedFields?.length ? (
                <p style={{ margin: 0 }}>
                  <strong>Fields:</strong> {message.updatedFields.join(", ")}
                </p>
              ) : (
                <p style={{ margin: 0 }}>No field changes were necessary.</p>
              )}
            </div>
          )}

          {message.type === "error" && (
            <p style={{ color: "#b91c1c", margin: "8px 0 0" }}>{message.content}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={chatShellStyle}>
      <div style={controlsRow}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={labelStyle}>Project</label>
          <select
            value={projectKey}
            onChange={(event) => setProjectKey(event.target.value)}
            style={{
              ...selectStyle,
              opacity: projects.length ? 1 : 0.6,
              cursor: projects.length ? "pointer" : "not-allowed",
            }}
            disabled={!projects.length}
          >
            {projects.map((project) => (
              <option key={project.key} value={project.key}>
                {project.name || project.key}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Mode</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" style={modeButton(mode === "compose")} onClick={() => setMode("compose")}>
              Draft
            </button>
            <button type="button" style={modeButton(mode === "update")} onClick={() => setMode("update")}>
              Update
            </button>
          </div>
        </div>
      </div>

      {hasContext && (
        <div style={bannerStyle("context")}>
          Using the latest document content to inform summaries and acceptance criteria.
        </div>
      )}

      {selectedProject?.description && <div style={bannerStyle("project")}>{selectedProject.description}</div>}

      <div
        ref={chatRef}
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "18px 14px",
          background: "rgba(255,255,255,0.75)",
          borderRadius: 18,
          border: "1px solid rgba(148,163,184,0.2)",
          boxShadow: "inset 0 1px 6px rgba(15,23,42,0.05)",
        }}
      >
        {messages.map((message) => renderMessage(message))}
      </div>

      <div style={{ marginTop: 16 }}>
        <textarea
          rows={3}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            mode === "compose"
              ? "Describe the ticket you need—include outcomes, owners, or acceptance criteria."
              : "Describe how to update an existing issue. Mention the issue key, fields to change, or comments."
          }
          style={textareaStyle}
        />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, alignItems: "center" }}>
          {error && <span style={{ color: "#b91c1c", fontSize: 13 }}>{error}</span>}
          <button type="button" onClick={handleSend} disabled={pending} style={sendButtonStyle(pending)}>
            {pending ? "Working…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
