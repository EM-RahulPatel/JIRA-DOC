import { useMemo } from "react";
import styles from "./styles/tableStyles";
import { cloneTableData, friendlyLabel } from "../utils/fieldUtils";

const TableField = ({ field, value, onCellChange, onAddRow, onRemoveRow }) => {
  const tableValue = useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.map((row) =>
        Array.isArray(row) ? row.map((cell) => cell ?? "") : []
      );
    }
    return cloneTableData(field.rows || field.default || []);
  }, [value, field]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerRow}>
        <label style={styles.label}>{field.label || friendlyLabel(field.name)}</label>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <tbody>
            {tableValue.map((row, rowIndex) => (
              <tr key={rowIndex} style={styles.row}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} style={styles.cell}>
                    <textarea
                      value={cell}
                      onChange={(e) =>
                        onCellChange(field.name, rowIndex, colIndex, e.target.value)
                      }
                      style={styles.textarea}
                    />
                  </td>
                ))}

                {/* Remove Button */}
                <td style={styles.removeCell}>
                  <button
                    type="button"
                    style={styles.removeBtn}
                    onClick={() => onRemoveRow(field.name, rowIndex)}
                    disabled={tableValue.length <= 1}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={styles.footer}>
        <button type="button" style={styles.addRowBtn} onClick={() => onAddRow(field.name)}>
          + Add Row
        </button>
      </div>
    </div>
  );
};

export default TableField;
