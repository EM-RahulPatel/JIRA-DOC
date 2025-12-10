import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./styles/tableStyles";
import { cloneTableData, friendlyLabel } from "../utils/fieldUtils";

const TableField = ({ field, value, onCellChange, onAddRow, onRemoveRow }) => {
  const rowIdOrderRef = useRef([]);
  const cellIdMapRef = useRef(new Map());
  const idCounterRef = useRef(0);
  const [focusedCellId, setFocusedCellId] = useState(null);

  useEffect(() => {
    rowIdOrderRef.current = [];
    cellIdMapRef.current = new Map();
    idCounterRef.current = 0;
  }, [field.name]);

  const generateId = (prefix) => {
    idCounterRef.current += 1;
    return `${field.name || "table"}-${prefix}-${idCounterRef.current}`;
  };

  const normalizedRows = useMemo(() => {
    if (Array.isArray(value) && value.length > 0) {
      return value.map((row) =>
        Array.isArray(row) ? row.map((cell) => cell ?? "") : []
      );
    }
    return cloneTableData(field.rows || field.default || []);
  }, [value, field]);

  const tableRows = useMemo(() => {
    const existingRowIds = rowIdOrderRef.current.slice(0, normalizedRows.length);
    while (existingRowIds.length < normalizedRows.length) {
      existingRowIds.push(null);
    }

    const nextCellIdMap = new Map(cellIdMapRef.current);
    const activeRowIds = new Set();

    const rowsWithIds = normalizedRows.map((row, rowIndex) => {
      let rowId = existingRowIds[rowIndex];
      if (!rowId) {
        rowId = generateId("row");
        existingRowIds[rowIndex] = rowId;
      }
      activeRowIds.add(rowId);

      const storedCellIds = nextCellIdMap.get(rowId) || [];
      const cellIds = storedCellIds.slice(0, row.length);
      while (cellIds.length < row.length) {
        cellIds.push(null);
      }

      const cells = row.map((cellValue, colIndex) => {
        let cellId = cellIds[colIndex];
        if (!cellId) {
          cellId = generateId("cell");
          cellIds[colIndex] = cellId;
        }
        return { id: cellId, value: cellValue };
      });

      nextCellIdMap.set(rowId, cellIds);
      return { id: rowId, cells };
    });

    Array.from(nextCellIdMap.keys()).forEach((rowId) => {
      if (!activeRowIds.has(rowId)) {
        nextCellIdMap.delete(rowId);
      }
    });

    rowIdOrderRef.current = existingRowIds;
    cellIdMapRef.current = nextCellIdMap;

    return rowsWithIds;
  }, [normalizedRows, field.name]);

  const handleRemoveRow = (rowIndex) => {
    const currentOrder = [...rowIdOrderRef.current];
    const [removedId] = currentOrder.splice(rowIndex, 1);
    rowIdOrderRef.current = currentOrder;
    if (removedId) {
      const nextMap = new Map(cellIdMapRef.current);
      nextMap.delete(removedId);
      cellIdMapRef.current = nextMap;
    }
    onRemoveRow(field.name, rowIndex);
  };

  const handleAddRow = () => {
    const nextOrder = [...rowIdOrderRef.current, generateId("row")];
    rowIdOrderRef.current = nextOrder;
    onAddRow(field.name);
  };

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerRow}>
        <label style={styles.label}>{field.label || friendlyLabel(field.name)}</label>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <tbody>
            {tableRows.map((row, rowIndex) => (
              <tr key={row.id} style={styles.row}>
                {row.cells.map((cell, colIndex) => (
                  <td key={cell.id} style={styles.cell}>
                    <textarea
                      value={cell.value}
                      onChange={(e) =>
                        onCellChange(field.name, rowIndex, colIndex, e.target.value)
                      }
                      style={{
                        ...styles.textarea,
                        ...(focusedCellId === cell.id ? styles.textareaFocus : {}),
                      }}
                      onFocus={() => setFocusedCellId(cell.id)}
                      onBlur={() =>
                        setFocusedCellId((prev) => (prev === cell.id ? null : prev))
                      }
                    />
                  </td>
                ))}

                {/* Remove Button */}
                <td style={styles.removeCell}>
                  <button
                    type="button"
                    style={styles.removeBtn}
                      onClick={() => handleRemoveRow(rowIndex)}
                      disabled={tableRows.length <= 1}
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
        <button type="button" style={styles.addRowBtn} onClick={handleAddRow}>
          + Add Row
        </button>
      </div>
    </div>
  );
};

export default TableField;
