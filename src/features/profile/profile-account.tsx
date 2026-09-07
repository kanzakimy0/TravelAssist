"use client";

import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { usePersonalNavigationGuard } from "@/features/personal-center/components/navigation-guard-context";
import { PersonalIcon } from "@/features/personal-center/components/personal-icon";

import {
  type AccountDraft,
  type EmergencyContact,
  emptyEmergencyContact,
  initialAccountDraft,
  regionRecommendations,
} from "./profile-data";
import styles from "./profile-account.module.css";

const cloneDraft = (draft: AccountDraft): AccountDraft =>
  structuredClone(draft);

const comparableDraft = (draft: AccountDraft) => ({
  ...draft,
  avatar: {
    kind: draft.avatar.kind,
    fileName: draft.avatar.fileName ?? "",
  },
});

const profileFields = [
  { key: "displayName", label: "昵称", required: true },
  { key: "legalName", label: "姓名", required: false },
  { key: "birthday", label: "出生日期", required: false },
  { key: "gender", label: "性别", required: false },
  { key: "countryRegion", label: "居住国家 / 地区", required: false },
  { key: "city", label: "常住城市", required: false },
] as const;

const settingsFields = [
  {
    key: "language",
    label: "界面语言",
    options: ["简体中文", "繁體中文", "日本語", "English"],
  },
  {
    key: "region",
    label: "国家 / 地区",
    options: ["日本", "中国", "法国", "美国"],
  },
  {
    key: "timezone",
    label: "时区",
    options: [
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Europe/Paris",
      "America/Los_Angeles",
    ],
  },
  {
    key: "currency",
    label: "默认货币",
    options: ["JPY (¥)", "CNY (¥)", "EUR (€)", "USD ($)"],
  },
  {
    key: "distanceUnit",
    label: "距离单位",
    options: ["公里 (km)", "英里 (mi)"],
  },
  {
    key: "temperatureUnit",
    label: "温度单位",
    options: ["摄氏度 (°C)", "华氏度 (°F)"],
  },
  {
    key: "timeFormat",
    label: "时间格式",
    options: ["24 小时制 (13:00)", "12 小时制 (1:00 PM)"],
  },
] as const;

const accountEntries = [
  {
    href: "/personal-center/account/security",
    title: "登录与安全",
    description: "密码、手机、邮箱、登录方式与账户安全",
    icon: "lock",
  },
  {
    href: "/personal-center/account/privacy",
    title: "数据与隐私",
    description: "个人数据、导出与账户相关管理",
    icon: "privacy",
  },
  {
    href: "/personal-center/account/booking-sync",
    title: "预订与账户同步",
    description: "Booking、确认邮件与外部预订同步",
    icon: "sync",
  },
] as const;

type ContactErrors = Partial<
  Record<"name" | "relationship" | "countryCode" | "phone", string>
>;

export function ProfileAccount() {
  const { setIsDirty } = usePersonalNavigationGuard();
  const [saved, setSaved] = useState<AccountDraft>(() =>
    cloneDraft(initialAccountDraft),
  );
  const [draft, setDraft] = useState<AccountDraft>(() =>
    cloneDraft(initialAccountDraft),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [displayNameError, setDisplayNameError] = useState("");
  const [avatarError, setAvatarError] = useState("");
  const [saveFeedback, setSaveFeedback] = useState(false);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [contactDialog, setContactDialog] = useState<{
    mode: "add" | "edit";
    index: number | null;
  } | null>(null);
  const [contactForm, setContactForm] = useState<EmergencyContact>(() =>
    emptyEmergencyContact(),
  );
  const [contactErrors, setContactErrors] = useState<ContactErrors>({});
  const [deleteContactIndex, setDeleteContactIndex] = useState<number | null>(
    null,
  );
  const contactDialogRef = useRef<HTMLDialogElement>(null);
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const nicknameRef = useRef<HTMLInputElement>(null);
  const addContactRef = useRef<HTMLButtonElement>(null);
  const objectUrlsRef = useRef<string[]>([]);

  const dirty = useMemo(
    () =>
      JSON.stringify(comparableDraft(draft)) !==
      JSON.stringify(comparableDraft(saved)),
    [draft, saved],
  );

  useEffect(() => {
    setIsDirty(dirty);
    return () => setIsDirty(false);
  }, [dirty, setIsDirty]);

  useEffect(
    () => () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  useEffect(() => {
    const dialog = contactDialogRef.current;
    if (!dialog) return;
    if (contactDialog && !dialog.open) dialog.showModal();
    if (!contactDialog && dialog.open) dialog.close();
  }, [contactDialog]);

  useEffect(() => {
    const dialog = deleteDialogRef.current;
    if (!dialog) return;
    if (deleteContactIndex !== null && !dialog.open) dialog.showModal();
    if (deleteContactIndex === null && dialog.open) dialog.close();
  }, [deleteContactIndex]);

  const beginEditing = () => {
    setSaveFeedback(false);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setDraft(cloneDraft(saved));
    setDisplayNameError("");
    setAvatarError("");
    setShowRecommendation(false);
    setIsEditing(false);
  };

  const saveChanges = () => {
    if (!draft.profile.displayName.trim()) {
      setDisplayNameError("请输入昵称");
      nicknameRef.current?.focus();
      return;
    }
    setDisplayNameError("");
    setSaved(cloneDraft(draft));
    setIsEditing(false);
    setShowRecommendation(false);
    setSaveFeedback(true);
    window.setTimeout(() => setSaveFeedback(false), 1800);
  };

  const handleAvatarFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("请选择图片文件");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("图片不能超过 5 MB");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    objectUrlsRef.current.push(previewUrl);
    setAvatarError("");
    setIsEditing(true);
    setDraft((current) => ({
      ...current,
      avatar: { kind: "local", fileName: file.name, previewUrl },
    }));
  };

  const updateProfile = (key: keyof AccountDraft["profile"], value: string) => {
    setDraft((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value },
    }));
    if (key === "displayName" && value.trim()) setDisplayNameError("");
  };

  const updateSetting = (
    key: keyof AccountDraft["settings"],
    value: string,
  ) => {
    setDraft((current) => ({
      ...current,
      settings: { ...current.settings, [key]: value },
    }));
    if (key === "region") setShowRecommendation(true);
  };

  const applyRecommendation = (
    key: "timezone" | "currency" | "distanceUnit" | "temperatureUnit",
  ) => {
    const recommendation = regionRecommendations[draft.settings.region];
    if (!recommendation) return;
    updateSetting(key, recommendation[key]);
  };

  const openAddContact = () => {
    beginEditing();
    setContactErrors({});
    setContactForm(emptyEmergencyContact());
    setContactDialog({ mode: "add", index: null });
  };

  const openEditContact = (contact: EmergencyContact, index: number) => {
    beginEditing();
    setContactErrors({});
    setContactForm({ ...contact });
    setContactDialog({ mode: "edit", index });
  };

  const closeContactDialog = () => {
    setContactDialog(null);
    setContactErrors({});
    window.requestAnimationFrame(() => addContactRef.current?.focus());
  };

  const submitContact = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: ContactErrors = {};
    if (!contactForm.name.trim()) errors.name = "请输入姓名";
    if (!contactForm.relationship.trim())
      errors.relationship = "请输入与您的关系";
    if (!contactForm.countryCode.trim())
      errors.countryCode = "请输入国家 / 区号";
    if (!contactForm.phone.trim()) errors.phone = "请输入手机号码";
    if (Object.keys(errors).length) {
      setContactErrors(errors);
      return;
    }

    setDraft((current) => {
      const contacts = [...current.contacts];
      if (contactDialog?.mode === "edit" && contactDialog.index !== null) {
        contacts[contactDialog.index] = { ...contactForm };
      } else {
        contacts.push({ ...contactForm });
      }
      return { ...current, contacts };
    });
    closeContactDialog();
  };

  const confirmDeleteContact = () => {
    if (deleteContactIndex === null) return;
    setIsEditing(true);
    setDraft((current) => ({
      ...current,
      contacts: current.contacts.filter(
        (_, index) => index !== deleteContactIndex,
      ),
    }));
    setDeleteContactIndex(null);
    window.requestAnimationFrame(() => addContactRef.current?.focus());
  };

  const recommendation = regionRecommendations[draft.settings.region];

  return (
    <div className={styles.accountPage} data-account-page>
      <header className={styles.pageHeader}>
        <div>
          <i
            className={styles.titleFlower}
            data-title-flower
            aria-hidden="true"
          >
            ✿
          </i>
          <p>Personal profile</p>
          <h1 data-primary-page-title>账户</h1>
          <span>
            管理您的个人资料与基本设置，让 TravelAssist 更好地为您服务。
          </span>
        </div>
      </header>

      <div className={styles.accountGrid}>
        <section className={`${styles.card} ${styles.profileCard}`}>
          <div className={styles.cardHeading}>
            <div className={styles.headingWithIcon}>
              <PersonalIcon name="account" />
              <h2>个人资料</h2>
            </div>
            <div className={styles.profileHeadingActions} aria-live="polite">
              {saveFeedback ? (
                <span className={styles.savedFeedback}>
                  <PersonalIcon name="check" /> 已保存
                </span>
              ) : null}
              {!isEditing ? (
                <button
                  type="button"
                  className={styles.editButton}
                  onClick={beginEditing}
                >
                  <PersonalIcon name="edit" />
                  编辑资料
                </button>
              ) : dirty ? (
                <span className={styles.dirtyHint}>尚未保存</span>
              ) : null}
            </div>
          </div>

          <div className={styles.avatarRow}>
            <div className={styles.profileAvatar} data-kind={draft.avatar.kind}>
              {draft.avatar.kind === "local" && draft.avatar.previewUrl ? (
                <Image
                  src={draft.avatar.previewUrl}
                  alt="本地头像预览"
                  fill
                  sizes="96px"
                  unoptimized
                />
              ) : draft.avatar.kind === "current" ? (
                <Image
                  src="/media/personal-center/avatar-yuki.webp"
                  alt="当前 Mock 头像"
                  fill
                  sizes="96px"
                  className={styles.currentAvatarPhoto}
                />
              ) : (
                <PersonalIcon name="account" width="38" height="38" />
              )}
            </div>
            <div className={styles.avatarDetails}>
              <strong>{draft.profile.displayName}</strong>
              <p>
                {draft.profile.countryRegion} · {draft.profile.city}
              </p>
              <div className={styles.avatarActions}>
                <label className={styles.fileButton}>
                  <PersonalIcon name="camera" />
                  更换头像
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFile}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    beginEditing();
                    setDraft((current) => ({
                      ...current,
                      avatar: { kind: "default" },
                    }));
                  }}
                >
                  <PersonalIcon name="trash" />
                  删除头像
                </button>
                <button
                  type="button"
                  onClick={() => {
                    beginEditing();
                    setDraft((current) => ({
                      ...current,
                      avatar: { kind: "default" },
                    }));
                  }}
                >
                  <PersonalIcon name="refresh" />
                  恢复默认头像
                </button>
              </div>
              {avatarError ? (
                <p className={styles.fieldError} role="alert">
                  {avatarError}
                </p>
              ) : null}
            </div>
          </div>

          <div className={styles.profileFields}>
            {profileFields.map((field) => {
              const value = draft.profile[field.key];
              const inputId = `profile-${field.key}`;
              if (!isEditing) {
                return (
                  <div className={styles.valueField} key={field.key}>
                    <span>{field.label}</span>
                    <strong>{value || "—"}</strong>
                  </div>
                );
              }

              return (
                <div className={styles.formField} key={field.key}>
                  <label htmlFor={inputId}>
                    {field.label}
                    {field.required ? (
                      <>
                        <span aria-hidden="true"> *</span>
                        <span className={styles.srOnly}>（必填）</span>
                      </>
                    ) : null}
                  </label>
                  {field.key === "gender" ? (
                    <select
                      id={inputId}
                      value={value}
                      onChange={(event) =>
                        updateProfile(field.key, event.target.value)
                      }
                    >
                      <option value="">未设置</option>
                      <option>女</option>
                      <option>男</option>
                      <option>非二元性别</option>
                      <option>不愿透露</option>
                    </select>
                  ) : field.key === "countryRegion" ? (
                    <select
                      id={inputId}
                      value={value}
                      onChange={(event) =>
                        updateProfile(field.key, event.target.value)
                      }
                    >
                      <option value="">未设置</option>
                      <option>日本</option>
                      <option>中国</option>
                      <option>法国</option>
                      <option>美国</option>
                    </select>
                  ) : (
                    <input
                      ref={
                        field.key === "displayName" ? nicknameRef : undefined
                      }
                      id={inputId}
                      type={field.key === "birthday" ? "date" : "text"}
                      value={value}
                      required={field.required}
                      aria-invalid={
                        field.key === "displayName" && displayNameError
                          ? true
                          : undefined
                      }
                      aria-describedby={
                        field.key === "displayName" && displayNameError
                          ? "display-name-error"
                          : undefined
                      }
                      onChange={(event) =>
                        updateProfile(field.key, event.target.value)
                      }
                    />
                  )}
                  {field.key === "displayName" && displayNameError ? (
                    <span
                      id="display-name-error"
                      className={styles.fieldError}
                      role="alert"
                    >
                      {displayNameError}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        <div className={styles.sideColumn}>
          <section className={`${styles.card} ${styles.contactCard}`}>
            <div className={styles.cardHeading}>
              <div className={styles.headingWithIcon}>
                <PersonalIcon name="privacy" />
                <h2>联系方式</h2>
              </div>
            </div>
            <dl className={styles.contactList}>
              <div>
                <span className={styles.contactIcon}>
                  <PersonalIcon name="mail" />
                </span>
                <span className={styles.contactText}>
                  <dt>邮箱</dt>
                  <dd>yu***@gmail.com</dd>
                </span>
                <span className={styles.verifiedBadge}>
                  <PersonalIcon name="check" /> 已验证
                </span>
              </div>
              <div>
                <span className={styles.contactIcon}>
                  <PersonalIcon name="phone" />
                </span>
                <span className={styles.contactText}>
                  <dt>手机</dt>
                  <dd>+81 **** 1234</dd>
                </span>
                <span className={styles.verifiedBadge}>
                  <PersonalIcon name="check" /> 已验证
                </span>
              </div>
            </dl>
          </section>

          <section className={`${styles.card} ${styles.settingsCard}`}>
            <div className={styles.cardHeading}>
              <div className={styles.headingWithIcon}>
                <PersonalIcon name="settings" />
                <h2>基本设置</h2>
                <span className={styles.headingNote}>设置您的显示偏好。</span>
              </div>
            </div>
            <div className={styles.settingsList}>
              {settingsFields.map((field) => (
                <div className={styles.settingRow} key={field.key}>
                  <label htmlFor={`setting-${field.key}`}>{field.label}</label>
                  {isEditing ? (
                    <select
                      id={`setting-${field.key}`}
                      value={draft.settings[field.key]}
                      onChange={(event) =>
                        updateSetting(field.key, event.target.value)
                      }
                    >
                      {field.options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <strong>{draft.settings[field.key]}</strong>
                  )}
                </div>
              ))}
            </div>
            {isEditing && showRecommendation && recommendation ? (
              <div className={styles.recommendation}>
                <strong>{draft.settings.region}的建议设置</strong>
                <p>仅在您选择后应用，不会覆盖手动值。</p>
                <div>
                  {(
                    [
                      ["timezone", "时区"],
                      ["currency", "货币"],
                      ["distanceUnit", "距离"],
                      ["temperatureUnit", "温度"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      type="button"
                      key={key}
                      onClick={() => applyRecommendation(key)}
                    >
                      采用{label}建议 · {recommendation[key]}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <section className={`${styles.card} ${styles.emergencySection}`}>
        <div className={styles.cardHeading}>
          <div className={styles.headingWithIcon}>
            <PersonalIcon name="account" />
            <h2>紧急联系人</h2>
            <PersonalIcon name="info" />
            <span className={styles.headingNote}>
              在您需要帮助时，我们可以更快地联系到您（非必填）。
            </span>
          </div>
        </div>
        {draft.contacts.length === 0 ? (
          <div className={styles.emptyContact}>
            <span className={styles.emptyContactIcon} aria-hidden="true">
              <PersonalIcon name="people" />
            </span>
            <div>
              <strong>还没有紧急联系人</strong>
              <p>在您需要帮助时，可保存一位紧急联系人。</p>
            </div>
          </div>
        ) : (
          <div className={styles.contactCards}>
            {draft.contacts.map((contact, index) => (
              <article key={contact.id} className={styles.emergencyCard}>
                <div>
                  <h3>{contact.name}</h3>
                  <p>
                    {contact.relationship} · {contact.countryCode}{" "}
                    {contact.phone}
                  </p>
                  {contact.email ? <span>{contact.email}</span> : null}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => openEditContact(contact, index)}
                  >
                    <PersonalIcon name="edit" />
                    <span className={styles.srOnly}>编辑</span>
                  </button>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => setDeleteContactIndex(index)}
                  >
                    <PersonalIcon name="trash" />
                    <span className={styles.srOnly}>删除</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
        <button
          ref={addContactRef}
          type="button"
          className={styles.secondaryButton}
          onClick={openAddContact}
        >
          <PersonalIcon name="plus" />
          添加紧急联系人
        </button>
      </section>

      <section aria-labelledby="account-entry-title">
        <div className={styles.sectionHeading}>
          <p>其他设置</p>
          <h2 id="account-entry-title">账户与数据</h2>
        </div>
        <div className={styles.accountEntries}>
          {accountEntries.map((entry) => (
            <GuardedLink
              href={entry.href}
              key={entry.href}
              className={styles.accountEntry}
            >
              <span className={styles.entryIcon}>
                <PersonalIcon name={entry.icon} />
              </span>
              <span>
                <strong>{entry.title}</strong>
                <small>{entry.description}</small>
              </span>
              <PersonalIcon name="arrow" />
            </GuardedLink>
          ))}
        </div>
      </section>

      {isEditing ? (
        <div className={styles.saveBar}>
          <span>{dirty ? "修改尚未保存" : "当前没有新的修改"}</span>
          <div>
            <button type="button" onClick={cancelEditing}>
              取消
            </button>
            <button type="button" onClick={saveChanges}>
              保存修改
            </button>
          </div>
        </div>
      ) : null}

      <dialog
        ref={contactDialogRef}
        className={styles.formDialog}
        aria-labelledby="contact-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeContactDialog();
        }}
      >
        <form onSubmit={submitContact} noValidate>
          <div className={styles.dialogHeading}>
            <div>
              <p>EMERGENCY CONTACT</p>
              <h2 id="contact-dialog-title">
                {contactDialog?.mode === "edit"
                  ? "编辑紧急联系人"
                  : "添加紧急联系人"}
              </h2>
            </div>
            <button
              type="button"
              aria-label="关闭"
              onClick={closeContactDialog}
            >
              <PersonalIcon name="close" />
            </button>
          </div>
          <div className={styles.dialogFields}>
            {(
              [
                ["name", "姓名", true],
                ["relationship", "与您的关系", true],
                ["countryCode", "国家 / 区号", true],
                ["phone", "手机号码", true],
                ["email", "邮箱", false],
                ["note", "备注", false],
              ] as const
            ).map(([key, label, required]) => {
              const error =
                key === "email" || key === "note"
                  ? undefined
                  : contactErrors[key];
              return (
                <div className={styles.formField} key={key}>
                  <label htmlFor={`contact-${key}`}>
                    {label}
                    {required ? (
                      <>
                        <span aria-hidden="true"> *</span>
                        <span className={styles.srOnly}>（必填）</span>
                      </>
                    ) : null}
                  </label>
                  {key === "note" ? (
                    <textarea
                      id={`contact-${key}`}
                      value={contactForm[key]}
                      onChange={(event) =>
                        setContactForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  ) : (
                    <input
                      id={`contact-${key}`}
                      type={key === "email" ? "email" : "text"}
                      value={contactForm[key]}
                      required={required}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={
                        error ? `contact-${key}-error` : undefined
                      }
                      onChange={(event) => {
                        setContactForm((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }));
                        if (error) {
                          setContactErrors((current) => ({
                            ...current,
                            [key]: undefined,
                          }));
                        }
                      }}
                    />
                  )}
                  {error ? (
                    <span
                      id={`contact-${key}-error`}
                      className={styles.fieldError}
                      role="alert"
                    >
                      {error}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className={styles.dialogActions}>
            <button type="button" onClick={closeContactDialog}>
              取消
            </button>
            <button type="submit">保存联系人</button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={deleteDialogRef}
        className={styles.confirmDialog}
        aria-labelledby="delete-contact-title"
        onCancel={(event) => {
          event.preventDefault();
          setDeleteContactIndex(null);
        }}
      >
        <h2 id="delete-contact-title">删除这位紧急联系人？</h2>
        <p>此操作不会影响您的账户或旅行数据。</p>
        <div className={styles.dialogActions}>
          <button type="button" onClick={() => setDeleteContactIndex(null)}>
            取消
          </button>
          <button
            type="button"
            className={styles.confirmDanger}
            onClick={confirmDeleteContact}
          >
            删除
          </button>
        </div>
      </dialog>
    </div>
  );
}
