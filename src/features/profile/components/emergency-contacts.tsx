"use client";
import { useEffect, useState } from "react";
import {
  emergencyErrors,
  emptyContact,
  isChanged,
  type DirtyReporter,
  type EmergencyContact,
} from "../model";
import { Dialog } from "./dialog";
import { Field } from "./field";
import { useFeedback } from "../hooks/use-feedback";
import styles from "../profile.module.css";

const labels = {
  name: "姓名",
  relationship: "关系",
  callingCode: "国家 / 区号",
  phone: "电话",
  email: "Email",
  note: "备注",
} as const;
export function EmergencyContacts({ onDirty }: { onDirty: DirtyReporter }) {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [draft, setDraft] = useState<EmergencyContact | null>(null);
  const [baseline, setBaseline] = useState<EmergencyContact | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<EmergencyContact | null>(null);
  const feedback = useFeedback();
  const dirty = draft !== null && isChanged(baseline, draft);
  useEffect(() => onDirty("emergency", dirty), [onDirty, dirty]);
  function edit(contact: EmergencyContact) {
    setDraft(contact);
    setBaseline(contact);
    setErrors({});
  }
  function close() {
    setDraft(null);
    setBaseline(null);
    setErrors({});
  }
  return (
    <section className={styles.card} aria-labelledby="emergency-title">
      <div className={styles.sectionHeader}>
        <h2 id="emergency-title">紧急联系人</h2>
        <button
          type="button"
          className={styles.textButton}
          onClick={() => edit(emptyContact())}
        >
          + 添加紧急联系人
        </button>
        <span className={styles.success} role="status">
          {feedback.message}
        </span>
      </div>
      {!contacts.length ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            ♡
          </span>
          <div>
            <p>还没有紧急联系人</p>
            <p className={styles.muted}>
              在您需要帮助时，可保存一位紧急联系人。
            </p>
          </div>
        </div>
      ) : (
        <ul className={styles.contacts}>
          {contacts.map((contact) => (
            <li key={contact.id}>
              <div>
                <h3>
                  {contact.name}{" "}
                  <span className={styles.muted}>{contact.relationship}</span>
                </h3>
                <p>
                  {contact.callingCode} {contact.phone}
                </p>
                {contact.email && (
                  <p className={styles.muted}>{contact.email}</p>
                )}
                {contact.note && <p className={styles.muted}>{contact.note}</p>}
              </div>
              <div className={styles.inlineActions}>
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => edit(contact)}
                  aria-label={`编辑紧急联系人 ${contact.name}`}
                >
                  编辑
                </button>
                <button
                  className={styles.textButton}
                  type="button"
                  onClick={() => setDeleting(contact)}
                  aria-label={`删除紧急联系人 ${contact.name}`}
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {draft && (
        <Dialog
          large
          title={draft.id ? "编辑紧急联系人" : "添加紧急联系人"}
          onClose={close}
        >
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              const nextErrors = emergencyErrors(draft);
              setErrors(nextErrors);
              const first = Object.keys(nextErrors)[0];
              if (first) {
                document.getElementById(`emergency-${first}`)?.focus();
                return;
              }
              const contact = {
                ...draft,
                name: draft.name.trim(),
                phone: draft.phone.trim(),
                email: draft.email.trim(),
                id: draft.id || crypto.randomUUID(),
              };
              setContacts((current) =>
                draft.id
                  ? current.map((item) =>
                      item.id === draft.id ? contact : item,
                    )
                  : [...current, contact],
              );
              close();
              feedback.saved();
            }}
          >
            <div className={styles.fields}>
              {Object.entries(labels).map(([key, label]) => {
                const field = key as keyof typeof labels;
                return (
                  <Field
                    key={key}
                    id={`emergency-${key}`}
                    label={label}
                    value={draft[field]}
                    error={errors[field]}
                    required={[
                      "name",
                      "relationship",
                      "callingCode",
                      "phone",
                    ].includes(field)}
                    type={
                      field === "email"
                        ? "email"
                        : field === "phone"
                          ? "tel"
                          : "text"
                    }
                    options={
                      field === "callingCode"
                        ? [
                            "",
                            "日本 +81",
                            "中国 +86",
                            "美国 / 加拿大 +1",
                            "英国 +44",
                            "法国 +33",
                            "澳大利亚 +61",
                          ]
                        : undefined
                    }
                    onChange={(value) => {
                      setDraft({ ...draft, [field]: value });
                      setErrors({ ...errors, [field]: "" });
                    }}
                  />
                );
              })}
            </div>
            <div className={styles.actions}>
              <button type="button" className={styles.button} onClick={close}>
                取消
              </button>
              <button type="submit" className={styles.primary}>
                保存修改
              </button>
            </div>
          </form>
        </Dialog>
      )}
      {deleting && (
        <Dialog title="删除这位紧急联系人？" onClose={() => setDeleting(null)}>
          <p>{deleting.name}</p>
          <p className={styles.muted}>此操作不会影响您的账户或旅行数据。</p>
          <div className={styles.actions}>
            <button
              className={styles.button}
              type="button"
              onClick={() => setDeleting(null)}
            >
              取消
            </button>
            <button
              className={styles.danger}
              type="button"
              onClick={() => {
                setContacts(contacts.filter((item) => item.id !== deleting.id));
                setDeleting(null);
              }}
            >
              删除
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
