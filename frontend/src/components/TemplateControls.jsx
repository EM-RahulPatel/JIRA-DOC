import styles from "../styles";

const TemplateControls = ({ templates, selectedTemplate, onSelect, onUpload }) => (
  <section style={styles.controlsCard}>
    <div style={styles.sectionHeading}>
      <h2 style={styles.sectionTitle}>Template setup</h2>
      <p style={styles.sectionDescription}>
        Upload a new Word template or pick an existing one to reuse its inferred structure.
      </p>
    </div>

    <div style={styles.controlsGrid}>
      <div style={styles.controlGroup}>
        <label style={styles.label}>Upload template (.docx)</label>
        <input type="file" accept=".docx" onChange={onUpload} style={styles.input} />
      </div>

      <div style={styles.controlGroup}>
        <label style={styles.label}>Choose template</label>
        <select value={selectedTemplate} onChange={onSelect} style={styles.input}>
          <option value="">Select a template…</option>
          {templates.map((templateId) => (
            <option key={templateId} value={templateId}>
              {templateId}
            </option>
          ))}
        </select>
      </div>
    </div>
  </section>
);

export default TemplateControls;
