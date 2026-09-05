import styles from "../profile.module.css";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  options?: string[];
  type?: string;
};
export function Field({
  id,
  label,
  value,
  onChange,
  required,
  error,
  options,
  type = "text",
}: Props) {
  const attributes = {
    id,
    name: id,
    value,
    required,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    ) => onChange(event.target.value),
  };
  return (
    <div className={styles.field}>
      <label htmlFor={id}>
        {label}
        {required && (
          <>
            <span aria-hidden="true" className={styles.required}>
              {" "}
              *
            </span>
            <span className={styles.srOnly}>（必填）</span>
          </>
        )}
      </label>
      {options ? (
        <select {...attributes}>
          {options.map((option) => (
            <option key={option} value={option}>
              {option || "请选择"}
            </option>
          ))}
        </select>
      ) : (
        <input {...attributes} type={type} />
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
