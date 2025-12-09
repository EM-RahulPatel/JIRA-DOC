// Utility helpers for schema-driven field rendering.
export const friendlyLabel = (name = "") => {
  return name
    .replace(/[_.-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const ensureArray = (value) => (Array.isArray(value) ? value : []);

const DEFAULT_FILENAME = "generated.docx";

export const normalizeFilename = (name) => {
  if (!name) return DEFAULT_FILENAME;
  return name.toLowerCase().endsWith(".docx") ? name : `${name}.docx`;
};

export const coerceCheckboxDefaults = (field) => {
  const options = ensureArray(field.options).map((option, index) => ({
    value: option.value || `${field.name}_option_${index + 1}`,
    label: option.label || option.value || friendlyLabel(`${field.name}_${index + 1}`),
  }));

  if (!field.default) {
    return options.map((option) => ({
      ...option,
      text: option.label,
      selected: true,
    }));
  }

  const defaults = ensureArray(field.default);
  const defaultMap = new Map();
  defaults.forEach((entry, index) => {
    if (entry && typeof entry === "object") {
      const key = entry.value || `${field.name}_default_${index + 1}`;
      defaultMap.set(key, {
        value: key,
        text: entry.text ?? entry.label ?? entry.value ?? "",
        selected: entry.selected !== false,
      });
    } else if (typeof entry === "string") {
      defaultMap.set(entry, { value: entry, text: entry, selected: true });
    }
  });

  const merged = options.map((option) => {
    const fallback = defaultMap.get(option.value);
    if (fallback) {
      return {
        value: option.value,
        label: option.label,
        text: fallback.text || option.label,
        selected: fallback.selected !== false,
      };
    }
    return {
      value: option.value,
      label: option.label,
      text: option.label,
      selected: true,
    };
  });

  defaults.forEach((entry) => {
    if (entry && typeof entry === "object") {
      const key = entry.value;
      if (key && !merged.some((item) => item.value === key)) {
        merged.push({
          value: key,
          label: friendlyLabel(key),
          text: entry.text || friendlyLabel(key),
          selected: entry.selected !== false,
        });
      }
    }
  });

  return merged;
};

export const cloneTableData = (rows = []) =>
  rows.map((row) => (Array.isArray(row) ? row.map((cell) => (cell ?? "").toString()) : []));

export const initialValueForField = (field) => {
  if (!field) return "";

  if (field.type === "checkbox-group") {
    return coerceCheckboxDefaults(field);
  }

  if (field.type === "list") {
    const defaults = ensureArray(field.default);
    return defaults.length ? defaults : [""];
  }

  if (field.type === "table") {
    const defaults = Array.isArray(field?.default) ? field.default : field?.rows || [];
    return cloneTableData(defaults);
  }

  if (field.type === "checkbox") {
    if (typeof field.default === "boolean") return field.default;
    return !!field.default;
  }

  if (field.type === "radio" || field.type === "select") {
    return field.default ?? "";
  }

  return field.default ?? "";
};

export const buildFieldDefaults = (schema) => {
  const defaults = {};
  schema.forEach((section) => {
    ensureArray(section.fields).forEach((field) => {
      defaults[field.name] = initialValueForField(field);
    });
  });
  return defaults;
};

export { DEFAULT_FILENAME };
