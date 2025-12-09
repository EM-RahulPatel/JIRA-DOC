import styles from "../styles";
import { friendlyLabel } from "../utils/fieldUtils";

const TextField = ({ field, value, onChange, onPolish }) => (
  <div style={styles.fieldBlock}>
    <label style={styles.label}>{field.label || friendlyLabel(field.name)}</label>
    <textarea
      value={value ?? ""}
      onChange={(event) => onChange(field.name, event.target.value)}
      style={styles.textarea}
      rows={field.rows || 6}
    />
    {field.polishable && (
      <button style={styles.polishBtn} onClick={() => onPolish(field.name, value ?? "")}>
        Polish suggestion
      </button>
    )}
    {field.help && <p style={styles.helpText}>{field.help}</p>}
  </div>
);

export default TextField;
