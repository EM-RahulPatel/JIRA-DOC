const styles = {
  wrapper: {
    marginBottom: "32px",
    background: "#fafafa",
    padding: "20px",
    borderRadius: "10px",
    border: "1px solid #e5e7eb",
  },

  headerRow: {
    marginBottom: "12px",
  },

  label: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#111827",
  },

  tableContainer: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: "0",
  },

  row: {
    transition: "background 0.2s",
  },

  cell: {
    padding: "0",
    border: "1px solid #e5e7eb",
    borderRadius: "6px",
    background: "white",
  },

  textarea: {
    width: "100%",
    minHeight: "44px",
    padding: "10px",
    border: "none",
    resize: "vertical",
    fontSize: "14px",
    background: "transparent",
  },

  textareaFocus: {
    outline: "2px solid #2563eb",
    outlineOffset: "2px",
    boxShadow: "0 0 0 2px rgba(37, 99, 235, 0.2)",
  },

  removeCell: {
    width: "40px",
    textAlign: "center",
  },

  removeBtn: {
    background: "#fee2e2",
    border: "none",
    color: "#b91c1c",
    cursor: "pointer",
    borderRadius: "50%",
    width: "28px",
    height: "28px",
    fontSize: "14px",
    fontWeight: 600,
  },

  footer: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "10px",
  },

  addRowBtn: {
    padding: "8px 14px",
    background: "#2563eb",
    color: "white",
    fontSize: "14px",
    borderRadius: "6px",
    border: "none",
    cursor: "pointer",
  },
};

export default styles;
