import { useEffect, useMemo, useState } from "react";

import TemplateControls from "../components/TemplateControls";
import TextField from "../components/TextField";
import CheckboxGroupField from "../components/CheckboxGroupField";
import TableField from "../components/TableField";
import PolishModal from "../components/PolishModal";
import JiraAssistantModal from "../components/JiraAssistantModal";
import styles from "../styles";
import {
  DEFAULT_FILENAME,
  buildFieldDefaults,
  cloneTableData,
  ensureArray,
  friendlyLabel,
  normalizeFilename,
} from "../utils/fieldUtils";

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function DocEditorPage() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [schema, setSchema] = useState([]);
  const [fields, setFields] = useState({});
  const [placeholders, setPlaceholders] = useState([]);
  const [fallbackValues, setFallbackValues] = useState({});
  const [fallbackLabels, setFallbackLabels] = useState({});
  const [filename, setFilename] = useState(DEFAULT_FILENAME);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingStructure, setFetchingStructure] = useState(false);
  const [polishOptions, setPolishOptions] = useState([]);
  const [polishContext, setPolishContext] = useState(null);
  const [jiraModalOpen, setJiraModalOpen] = useState(false);

  const floatingButtonStyle = {
    position: "fixed",
    right: 32,
    bottom: 32,
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #0052CC, #2684FF)",
    boxShadow: "0 20px 45px rgba(15,23,42,0.35)",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 900,
  };

  const floatingIconStyle = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontSize: 10,
    fontWeight: 600,
    letterSpacing: 0.5,
  };

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const response = await fetch(`${API_BASE}/templates`);
        if (!response.ok) {
          throw new Error("Unable to load templates");
        }
        const data = await response.json();
        setTemplates(Array.isArray(data.templates) ? data.templates : []);
      } catch (err) {
        console.error("Failed to load templates", err);
        setError(err.message || "Failed to load templates");
      }
    };

    loadTemplates();
  }, []);

  const schemaByName = useMemo(() => {
    const map = {};
    schema.forEach((section) => {
      ensureArray(section.fields).forEach((field) => {
        map[field.name] = field;
      });
    });
    return map;
  }, [schema]);

  const hasStructuredSchema = useMemo(
    () => schema.some((section) => ensureArray(section.fields).length > 0),
    [schema]
  );

  const fallbackFieldCount = useMemo(
    () => Object.keys(fallbackValues || {}).length,
    [fallbackValues]
  );

  const formatFieldValueForContext = (field, value) => {
    if (!value && value !== 0) {
      return "";
    }
    if (field?.type === "checkbox-group") {
      const selected = ensureArray(value)
        .filter((option) => option?.selected)
        .map((option) => option?.text || option?.label)
        .filter(Boolean);
      return selected.join(", ");
    }
    if (field?.type === "table") {
      return ensureArray(value)
        .map((row) => ensureArray(row).join(" | "))
        .filter(Boolean)
        .join("\n");
    }
    if (Array.isArray(value)) {
      return value.join(", ");
    }
    if (typeof value === "object") {
      try {
        return JSON.stringify(value);
      } catch {
        return "";
      }
    }
    return String(value).trim();
  };

  const documentContextText = useMemo(() => {
    const parts = [];
    if (hasStructuredSchema) {
      schema.forEach((section, sectionIndex) => {
        const sectionParts = [];
        ensureArray(section.fields).forEach((field) => {
          const value = fields[field.name];
          const formatted = formatFieldValueForContext(field, value);
          if (formatted) {
            const label = field.label || friendlyLabel(field.name) || field.name;
            sectionParts.push(`${label}: ${formatted}`);
          }
        });
        if (sectionParts.length) {
          const sectionTitle = section.section || `Section ${sectionIndex + 1}`;
          parts.push(`${sectionTitle}\n${sectionParts.join("\n")}`);
        }
      });
    } else {
      Object.entries(fallbackValues || {}).forEach(([key, value]) => {
        const text = typeof value === "string" ? value.trim() : String(value ?? "");
        if (text) {
          const label = fallbackLabels[key] || friendlyLabel(key) || key;
          parts.push(`${label}: ${text}`);
        }
      });
    }
    return parts.join("\n\n");
  }, [hasStructuredSchema, schema, fields, fallbackValues, fallbackLabels]);

  const hydrateFallback = (placeholderNames, autoSections = []) => {
    const defaults = {};
    const labels = {};
    autoSections.forEach((section) => {
      if (section?.id) {
        defaults[section.id] = section.default_text || "";
        labels[section.id] = section.heading || friendlyLabel(section.id);
      }
    });
    placeholderNames.forEach((name) => {
      if (!Object.prototype.hasOwnProperty.call(defaults, name)) {
        defaults[name] = "";
      }
      if (!labels[name]) {
        labels[name] = friendlyLabel(name);
      }
    });
    setFallbackValues(defaults);
    setFallbackLabels(labels);
  };

  const applyTemplateStructure = (templateId, payload) => {
    const placeholderNames = Array.isArray(payload.placeholders) ? payload.placeholders : [];
    const autoSections = Array.isArray(payload.auto_sections) ? payload.auto_sections : [];
    const schemaPayload = Array.isArray(payload.schema) ? payload.schema : [];

    setSelectedTemplate(templateId);
    setPlaceholders(placeholderNames);
    setSchema(schemaPayload);
    setFields(buildFieldDefaults(schemaPayload));
    hydrateFallback(placeholderNames, autoSections);
  };

  const handleTemplateSelect = async (templateId) => {
    setSelectedTemplate(templateId);
    setError("");

    if (!templateId) {
      setSchema([]);
      setFields({});
      setPlaceholders([]);
      setFallbackValues({});
      setFallbackLabels({});
      return;
    }

    setFetchingStructure(true);
    try {
      const response = await fetch(`${API_BASE}/template/${encodeURIComponent(templateId)}/fields`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to read template structure");
      }
      const data = await response.json();
      applyTemplateStructure(templateId, data);
    } catch (err) {
      console.error("Failed to load template structure", err);
      setError(err.message || "Failed to load template structure");
      setSchema([]);
      setFields({});
      setPlaceholders([]);
      setFallbackValues({});
      setFallbackLabels({});
    } finally {
      setFetchingStructure(false);
    }
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/upload-template`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Template upload failed");
      }

      const data = await response.json();
      const templateId = data.template_id;
      setTemplates((prev) => Array.from(new Set([templateId, ...prev])));
      applyTemplateStructure(templateId, data);
    } catch (err) {
      console.error("Upload failed", err);
      setError(err.message || "Unable to upload template");
    } finally {
      event.target.value = "";
    }
  };

  const updateFieldValue = (name, value) => {
    setFields((prev) => ({ ...prev, [name]: value }));
  };

  const updateFallbackValue = (name, value) => {
    setFallbackValues((prev) => ({ ...prev, [name]: value }));
  };

  const toggleCheckboxOption = (fieldName, index) => {
    setFields((prev) => {
      const existing = ensureArray(prev[fieldName]).map((item) => ({ ...item }));
      if (!existing[index]) return prev;
      existing[index].selected = !existing[index].selected;
      return { ...prev, [fieldName]: existing };
    });
  };

  const updateCheckboxText = (fieldName, index, text) => {
    setFields((prev) => {
      const existing = ensureArray(prev[fieldName]).map((item) => ({ ...item }));
      if (!existing[index]) return prev;
      existing[index].text = text;
      return { ...prev, [fieldName]: existing };
    });
  };

  const updateTableCell = (fieldName, rowIndex, colIndex, text) => {
    setFields((prev) => {
      const next = { ...prev };
      const current = Array.isArray(next[fieldName])
        ? next[fieldName].map((row) => (Array.isArray(row) ? [...row] : []))
        : [];

      while (current.length <= rowIndex) {
        current.push([]);
      }

      const rowCopy = Array.isArray(current[rowIndex]) ? [...current[rowIndex]] : [];
      while (rowCopy.length <= colIndex) {
        rowCopy.push("");
      }

      rowCopy[colIndex] = text;
      current[rowIndex] = rowCopy;
      next[fieldName] = current;
      return next;
    });
  };

  const addTableRow = (fieldName) => {
    setFields((prev) => {
      const fieldDef = schemaByName[fieldName];
      const current = Array.isArray(prev[fieldName])
        ? prev[fieldName].map((row) => (Array.isArray(row) ? [...row] : []))
        : cloneTableData(fieldDef?.rows || fieldDef?.default || []);
      const referenceRow = current[current.length - 1] || cloneTableData(fieldDef?.rows || fieldDef?.default || [[]])[0] || [];
      const columnCount = Math.max(referenceRow?.length || 0, fieldDef?.rows?.[0]?.length || fieldDef?.default?.[0]?.length || 0, 1);
      const newRow = Array.from({ length: columnCount }, () => "");
      return {
        ...prev,
        [fieldName]: [...current, newRow],
      };
    });
  };

  const removeTableRow = (fieldName, rowIndex) => {
    setFields((prev) => {
      const current = Array.isArray(prev[fieldName])
        ? prev[fieldName].map((row) => (Array.isArray(row) ? [...row] : []))
        : [];
      if (current.length <= 1) {
        return prev;
      }
      current.splice(rowIndex, 1);
      return {
        ...prev,
        [fieldName]: current,
      };
    });
  };

  const requestPolish = async (fieldName, rawValue, index = null) => {
    const text = typeof rawValue === "string" ? rawValue.trim() : "";
    if (!text) {
      window.alert("Please enter text to polish.");
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/polish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, field_name: fieldName }),
      });

      const payloadText = await response.text();
      let data = {};
      if (payloadText) {
        try {
          data = JSON.parse(payloadText);
        } catch (jsonError) {
          if (response.ok) {
            throw new Error("Received unexpected response from polish endpoint.");
          }
          throw new Error(payloadText);
        }
      }
      if (!response.ok) {
        throw new Error(data.error || payloadText || "Unable to polish text right now.");
      }
      if (data.error) {
        throw new Error(data.error);
      }

      setPolishOptions(data.suggestions || []);
      setPolishContext({ fieldName, index });
    } catch (err) {
      const message = err.message || String(err) || "Unable to polish text right now.";
      window.alert(message);
    }
  };

  const applyPolishedText = (text) => {
    if (!polishContext) return;
    const { fieldName, index } = polishContext;
    const field = schemaByName[fieldName];

    if (field?.type === "checkbox-group" && index !== null) {
      updateCheckboxText(fieldName, index, text);
    } else if (hasStructuredSchema) {
      updateFieldValue(fieldName, text);
    } else {
      updateFallbackValue(fieldName, text);
    }

    setPolishContext(null);
    setPolishOptions([]);
  };

  const handleGenerate = async () => {
    if (!selectedTemplate) {
      setError("Select or upload a template before generating.");
      return;
    }

    const payloadKey = hasStructuredSchema ? "fields" : "data";
    const payloadValues = hasStructuredSchema ? fields : fallbackValues;

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: selectedTemplate,
          [payloadKey]: payloadValues,
          output_filename: normalizeFilename(filename),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to generate document");
      }

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await response.json();
        throw new Error(data.error || "Unexpected response from server");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = normalizeFilename(filename);
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Generation failed", err);
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const value = fields[field.name];
    switch (field.type) {
      case "checkbox-group":
        return (
          <CheckboxGroupField
            key={field.name}
            field={field}
            value={value}
            onToggle={toggleCheckboxOption}
            onTextChange={updateCheckboxText}
            onPolish={requestPolish}
          />
        );
      case "table":
        return (
          <TableField
            key={field.name}
            field={field}
            value={value}
            onCellChange={updateTableCell}
            onAddRow={addTableRow}
            onRemoveRow={removeTableRow}
          />
        );
      case "textarea":
      case "text":
      case "richtext":
      default:
        return (
          <TextField
            key={field.name}
            field={field}
            value={value}
            onChange={updateFieldValue}
            onPolish={requestPolish}
          />
        );
    }
  };

  const renderFallbackFields = () => {
    const keys = Object.keys(fallbackValues || {});
    return keys.map((name) => (
      <div key={name} style={styles.fieldBlock}>
        <label style={styles.label}>{fallbackLabels[name] || friendlyLabel(name) || name}</label>
        <textarea
          value={fallbackValues[name] || ""}
          onChange={(event) => updateFallbackValue(name, event.target.value)}
          style={styles.textarea}
          rows={6}
        />
        <button
          style={styles.polishBtn}
          onClick={() => requestPolish(name, fallbackValues[name] || "")}
        >
          Polish suggestion
        </button>
      </div>
    ));
  };

  return (
    <div style={styles.page}>
      <main style={styles.container}>
        <header style={styles.hero}>
          <h1 style={styles.title}>Universal DOCX Builder</h1>
          <p style={styles.subtitle}>
            Upload any Word template and we will infer the form structure automatically. Update the content,
            polish sections with Gemini, and download the revised document.
          </p>
        </header>

        <TemplateControls
          templates={templates}
          selectedTemplate={selectedTemplate}
          onSelect={(event) => handleTemplateSelect(event.target.value)}
          onUpload={handleUpload}
        />

        <section style={styles.controlsCard}>
          <div style={styles.sectionHeading}>
            <h2 style={styles.sectionTitle}>Document output</h2>
            <p style={styles.sectionDescription}>Name your generated file before downloading.</p>
          </div>
          <div style={styles.controlGroup}>
            <label style={styles.label}>Output filename</label>
            <input
              type="text"
              value={filename}
              onChange={(event) => setFilename(event.target.value)}
              style={styles.input}
            />
          </div>
        </section>

        {error && <div style={styles.error}>{error}</div>}

        {fetchingStructure && <p>Analyzing template structure…</p>}

        {!fetchingStructure && hasStructuredSchema && (
          <div style={styles.sectionList}>
            {schema.map((section, sectionIndex) => (
              <section key={`${section.section || "Section"}-${sectionIndex}`} style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                  <span style={styles.sectionBadge}>{sectionIndex + 1}</span>
                  <div style={styles.sectionHeading}>
                    <h2 style={styles.sectionTitle}>{section.section || `Section ${sectionIndex + 1}`}</h2>
                    {section.description && (
                      <p style={styles.sectionDescription}>{section.description}</p>
                    )}
                  </div>
                </div>
                <div style={styles.sectionBody}>
                  {ensureArray(section.fields).map((field) => renderField(field))}
                </div>
              </section>
            ))}
          </div>
        )}

        {!fetchingStructure && !hasStructuredSchema && selectedTemplate && (
          <section style={styles.sectionCard}>
            <div style={styles.sectionHeading}>
              <h2 style={styles.sectionTitle}>Fields</h2>
              <p style={styles.sectionDescription}>
                No structured sections were inferred. Populate any placeholders detected below.
              </p>
            </div>
            {fallbackFieldCount === 0 ? (
              <div style={styles.callout}>No editable fields detected in this template.</div>
            ) : (
              <div style={styles.sectionBody}>{renderFallbackFields()}</div>
            )}
          </section>
        )}

        <div style={styles.generateBar}>
          <button
            style={styles.generateBtn}
            onClick={handleGenerate}
            disabled={loading || (!hasStructuredSchema && fallbackFieldCount === 0)}
          >
            {loading ? "Generating…" : "Generate Document"}
          </button>
        </div>

        {polishOptions.length > 0 && (
          <PolishModal
            options={polishOptions}
            onSelect={applyPolishedText}
            onClose={() => setPolishOptions([])}
          />
        )}
      </main>
      <button
        type="button"
        aria-label="Open Jira assistant"
        style={floatingButtonStyle}
        onClick={() => setJiraModalOpen(true)}
      >
        <span style={floatingIconStyle}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ marginBottom: 4 }}
          >
            <path
              d="M19.5 4.5H12L14.25 6.75L7.5 13.5L10.5 16.5L17.25 9.75L19.5 12V4.5Z"
              fill="white"
            />
          </svg>
          JIRA
        </span>
      </button>
      <JiraAssistantModal
        open={jiraModalOpen}
        onClose={() => setJiraModalOpen(false)}
        contextText={documentContextText}
      />
    </div>
  );
}

export default DocEditorPage;
