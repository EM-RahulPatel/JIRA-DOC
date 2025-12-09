import styles from "../styles";
import { ensureArray, friendlyLabel } from "../utils/fieldUtils";

const CheckboxGroupField = ({ field, value, onToggle, onTextChange, onPolish }) => {
  const options = ensureArray(value).map((item) => ({
    value: item.value,
    label: item.label || friendlyLabel(item.value),
    text: item.text ?? item.label ?? friendlyLabel(item.value),
    selected: item.selected !== false,
  }));

  return (
    <div style={styles.fieldBlock}>
      <label style={styles.label}>{field.label || friendlyLabel(field.name)}</label>
      {options.map((option, index) => (
        <div key={option.value} style={styles.checkboxRow}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={option.selected}
              onChange={() => onToggle(field.name, index)}
            />
            <span style={styles.checkboxText}>{option.label}</span>
          </label>
          <textarea
            value={option.text}
            onChange={(event) => onTextChange(field.name, index, event.target.value)}
            style={styles.textarea}
            rows={3}
          />
          <div style={styles.inlineActions}>
            {field.polishable && (
              <button
                style={styles.polishBtn}
                onClick={() => onPolish(field.name, option.text, index)}
              >
                Polish option
              </button>
            )}
          </div>
        </div>
      ))}
      {field.help && <p style={styles.helpText}>{field.help}</p>}
    </div>
  );
};

export default CheckboxGroupField;
