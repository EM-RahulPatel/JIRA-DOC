import styles from "../styles";
import { cloneTableData, friendlyLabel } from "../utils/fieldUtils";

const TableField = ({ field, value, onCellChange, onAddRow, onRemoveRow }) => {
  const tableValue = Array.isArray(value) && value.length
    ? value.map((row) => (Array.isArray(row) ? row.map((cell) => cell ?? "") : []))
    : cloneTableData(field.rows || field.default || []);

  return (
    <div style={styles.fieldBlock}>
      <label style={styles.label}>{field.label || friendlyLabel(field.name)}</label>
      <div style={styles.tableWrapper}>
        <table style={styles.dataTable}>
          <tbody>
            {tableValue.map((row, rowIndex) => (
              <tr key={`${field.name}-row-${rowIndex}`}>
                {row.map((cell, colIndex) => (
                  <td key={`${field.name}-cell-${rowIndex}-${colIndex}`} style={styles.tableCell}>
                    <textarea
                      value={cell}
                      onChange={(event) =>
                        onCellChange(field.name, rowIndex, colIndex, event.target.value)
                      }
                      style={styles.tableCellTextarea}
                      rows={2}
                    />
                  </td>
                ))}
                <td style={styles.tableRowActions}>
                  <button
                    type="button"
                    style={styles.removeRowBtn}
                    onClick={() => onRemoveRow(field.name, rowIndex)}
                    disabled={tableValue.length <= 1}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button type="button" style={styles.addRowBtn} onClick={() => onAddRow(field.name)}>
        Add Row
      </button>
      {field.help && <p style={styles.helpText}>{field.help}</p>}
    </div>
  );
};

export default TableField;
