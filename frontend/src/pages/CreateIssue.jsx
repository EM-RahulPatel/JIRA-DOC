import React, { useEffect, useMemo, useState } from "react";
import { composeProjectIssue, getProjects, previewProjectContext } from "../services/api.js";

const initialDraft = {
  summary: "",
  description: "",
  labels: [],
  components: [],
  priority: "Medium",
  assignee: "",
  issueType: "Task",
  epicKey: "",
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return value;
  }
};

export default function CreateIssue({ embedded = false }) {
  const [projects, setProjects] = useState([]);
  const [projectKey, setProjectKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [contextPreview, setContextPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [generated, setGenerated] = useState(null);
  const [notification, setNotification] = useState("");

  const selectedProject = useMemo(
    () => projects.find((project) => project.key === projectKey),
    [projects, projectKey]
  );

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
        console.error("Failed to load projects", err);
        setNotification(err.response?.data?.error || err.message);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!projectKey) {
      return;
    }
    setPreviewLoading(true);
    previewProjectContext(projectKey)
      .then((res) => {
        setContextPreview(res.data);
      })
      .catch((err) => {
        console.error("Context preview failed", err);
        setNotification(err.response?.data?.error || err.message);
      })
      .finally(() => setPreviewLoading(false));
  }, [projectKey]);

  const handleGenerate = async () => {
    if (!projectKey || !prompt.trim()) {
      return;
    }
    setLoading(true);
    setNotification("");
    try {
      const res = await composeProjectIssue({ projectKey, text: prompt, createOnJira: false });
      setGenerated(res.data.generated || res.data);
    } catch (err) {
      console.error("Compose issue failed", err);
      setNotification(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!generated) {
      return;
    }
    setLoading(true);
    setNotification("");
    try {
      const res = await composeProjectIssue({
        projectKey,
        text: prompt,
        createOnJira: true,
        draft: generated,
      });
      setNotification(`Created issue ${res.data.created?.key || "success"}`);
    } catch (err) {
      console.error("Create issue failed", err);
      setNotification(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const previewChunks = contextPreview?.ragChunks || [];

  const containerStyle = embedded
    ? { padding: 0, backgroundColor: "transparent", minHeight: "auto" }
    : { padding: 24, backgroundColor: "#f8fafc", minHeight: "100vh" };

  const wrapperStyle = embedded
    ? { width: "100%", margin: 0 }
    : { maxWidth: 1100, margin: "0 auto" };

  const heading = embedded ? "Jira Assistant" : "AI Issue Composer";
  const subheading = embedded
    ? "Manage Jira tickets without leaving the document editor."
    : "Choose a project, load its context, and let the AI assemble a Jira issue draft using your RAG knowledge base.";

  return (
    <div style={containerStyle}>
      <div style={wrapperStyle}>
        <h1 style={{ marginBottom: 12 }}>{heading}</h1>
        <p style={{ color: "#475569", marginBottom: 24 }}>{subheading}</p>

        {notification && (
          <div
            style={{
              marginBottom: 16,
              padding: 12,
              borderRadius: 8,
              backgroundColor: "#fee2e2",
              color: "#b91c1c",
            }}
          >
            {notification}
          </div>
        )}

        <section
          style={{
            backgroundColor: "#fff",
            padding: 20,
            borderRadius: 16,
            boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
            marginBottom: 24,
          }}
        >
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ fontWeight: 600 }}>Project</label>
            <select
              value={projectKey}
              onChange={(e) => setProjectKey(e.target.value)}
              style={{ padding: 8, minWidth: 200 }}
            >
              {projects.map((project) => (
                <option key={project.key} value={project.key}>
                  {project.name || project.key}
                </option>
              ))}
            </select>
            <span style={{ color: "#475569" }}>
              Context now comes directly from your active document session.
            </span>
          </div>
        </section>

        <section
          style={{
            backgroundColor: "#fff",
            padding: 20,
            borderRadius: 16,
            boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
            marginBottom: 24,
          }}
        >
          <label style={{ fontWeight: 600 }}>Issue Prompt</label>
          <textarea
            rows={3}
            placeholder="Describe the work you need"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            style={{ width: "100%", marginTop: 12, padding: 10 }}
          />
          <button
            onClick={handleGenerate}
            disabled={loading || !prompt.trim()}
            style={{ marginTop: 12 }}
          >
            {loading ? "Generating..." : "Generate Draft"}
          </button>
        </section>

        <section
          style={{
            display: "grid",
            gap: 24,
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 16,
              boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Context Preview</h3>
            {previewLoading ? (
              <p>Loading context…</p>
            ) : (
              <div style={{ maxHeight: 420, overflowY: "auto" }}>
                <p style={{ color: "#475569" }}>
                  <strong>Project:</strong> {selectedProject?.name || projectKey}
                </p>
                <p style={{ color: "#475569" }}>
                  <strong>Last onboarded:</strong> {formatDate(selectedProject?.lastOnboardedAt)}
                </p>
                <h4>RAG Snippets</h4>
                {previewChunks.length === 0 && <p>No embeddings yet.</p>}
                {previewChunks.map((chunk) => (
                  <div
                    key={`${chunk.id}-${chunk.metadata?.chunkIndex}`}
                    style={{
                      border: "1px solid #e2e8f0",
                      borderRadius: 10,
                      padding: 10,
                      marginBottom: 10,
                      background: "#f8fafc",
                    }}
                  >
                    <p style={{ fontSize: 12, color: "#475569" }}>
                      {chunk.metadata?.docId}#{chunk.metadata?.chunkIndex}
                    </p>
                    <p style={{ margin: 0 }}>{chunk.metadata?.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div
            style={{
              backgroundColor: "#fff",
              padding: 20,
              borderRadius: 16,
              boxShadow: "0 10px 25px rgba(15,23,42,0.08)",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Generated Draft</h3>
            {!generated ? (
              <p>No draft yet. Generate one using the prompt.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <label>Summary</label>
                <input
                  value={generated.summary}
                  onChange={(e) => setGenerated({ ...generated, summary: e.target.value })}
                  style={{ padding: 8 }}
                />
                <label>Description</label>
                <textarea
                  rows={8}
                  value={generated.description}
                  onChange={(e) => setGenerated({ ...generated, description: e.target.value })}
                  style={{ padding: 8 }}
                />
                <label>Labels (comma separated)</label>
                <input
                  value={(generated.labels || []).join(", ")}
                  onChange={(e) =>
                    setGenerated({
                      ...generated,
                      labels: e.target.value
                        .split(",")
                        .map((label) => label.trim())
                        .filter(Boolean),
                    })
                  }
                  style={{ padding: 8 }}
                />
                <label>Assignee</label>
                <input
                  value={generated.assignee || ""}
                  onChange={(e) => setGenerated({ ...generated, assignee: e.target.value })}
                  style={{ padding: 8 }}
                />
                <label>Priority</label>
                <select
                  value={generated.priority}
                  onChange={(e) => setGenerated({ ...generated, priority: e.target.value })}
                  style={{ padding: 8 }}
                >
                  {[
                    "Highest",
                    "High",
                    "Medium",
                    "Low",
                    "Lowest",
                  ].map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
                <button onClick={handleCreate} disabled={loading}>
                  {loading ? "Creating…" : "Create in Jira"}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
