import styles from "../styles";

const PolishModal = ({ options, onSelect, onClose }) => (
  <div style={styles.polishOverlay}>
    <div style={styles.polishModal}>
      <h3 style={styles.modalTitle}>Choose a polished version</h3>
      {options.map((option, index) => (
        <div key={index} style={styles.polishOption} onClick={() => onSelect(option)}>
          {option}
        </div>
      ))}
      <button style={styles.closeModalBtn} onClick={onClose}>
        Cancel
      </button>
    </div>
  </div>
);

export default PolishModal;
