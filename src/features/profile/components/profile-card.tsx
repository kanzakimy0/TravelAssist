"use client";
import { useEffect, useState } from "react";
import { mockPersonalUser } from "@/features/personal-center/constants/personal-navigation";
import {
  isChanged,
  profileErrors,
  regions,
  type Profile,
  type DirtyReporter,
} from "../model";
import { Field } from "./field";
import { AvatarEditor } from "./avatar-editor";
import { useFeedback } from "../hooks/use-feedback";
import styles from "../profile.module.css";

const initialProfile: Profile = {
  nickname: mockPersonalUser.name,
  name: "山田由纪",
  birthday: "1995-08-12",
  gender: "女",
  region: "日本",
  city: "东京",
  avatar: mockPersonalUser.avatar,
};
const labels = {
  nickname: "昵称",
  name: "姓名",
  birthday: "出生日期",
  gender: "性别",
  region: "居住国家 / 地区",
  city: "常住城市",
} as const;
export function ProfileCard({ onDirty }: { onDirty: DirtyReporter }) {
  const [profile, setProfile] = useState(initialProfile);
  const [draft, setDraft] = useState(initialProfile);
  const [editing, setEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const feedback = useFeedback();
  const dirty = isChanged(profile, draft);
  useEffect(() => onDirty("profile", dirty), [dirty, onDirty]);
  function cancel() {
    setDraft(profile);
    setEditing(false);
    setErrors({});
  }
  return (
    <section className={styles.card} aria-labelledby="profile-title">
      <div className={styles.sectionHeader}>
        <h2 id="profile-title">个人资料</h2>
        {!editing && (
          <button
            type="button"
            className={styles.textButton}
            onClick={() => setEditing(true)}
          >
            编辑个人资料
          </button>
        )}
        <span className={styles.success} role="status">
          {feedback.message}
        </span>
      </div>
      <AvatarEditor
        value={draft.avatar}
        savedValue={profile.avatar}
        initial={mockPersonalUser.initial}
        onChange={(avatar) => {
          setDraft({ ...draft, avatar });
          setEditing(true);
        }}
      />
      {editing ? (
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const nextErrors = profileErrors(draft);
            setErrors(nextErrors);
            if (Object.keys(nextErrors).length) {
              document.getElementById("profile-nickname")?.focus();
              return;
            }
            const next = { ...draft, nickname: draft.nickname.trim() };
            setProfile(next);
            setDraft(next);
            setEditing(false);
            feedback.saved();
          }}
        >
          <div className={styles.fields}>
            {Object.entries(labels).map(([key, label]) => {
              const field = key as keyof typeof labels;
              return (
                <Field
                  key={field}
                  id={`profile-${field}`}
                  label={label}
                  value={draft[field]}
                  required={field === "nickname"}
                  type={field === "birthday" ? "date" : "text"}
                  error={errors[field]}
                  options={
                    field === "gender"
                      ? ["", "女", "男", "其他", "不愿透露"]
                      : field === "region"
                        ? ["", ...regions]
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
            <button type="button" className={styles.button} onClick={cancel}>
              取消
            </button>
            <button className={styles.primary} type="submit">
              保存修改
            </button>
          </div>
        </form>
      ) : (
        <dl className={styles.details}>
          {Object.entries(labels).map(([key, label]) => (
            <div key={key}>
              <dt>
                {label}
                {key === "nickname" && (
                  <span className={styles.required}> *</span>
                )}
              </dt>
              <dd>{profile[key as keyof typeof labels] || "未设置"}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
