"use client";
import { useCallback, useState } from "react";
import { ProfileCard } from "./components/profile-card";
import { SettingsCard } from "./components/settings-card";
import { EmergencyContacts } from "./components/emergency-contacts";
import { UnsavedGuard } from "./components/unsaved-guard";
import { AccountEntries } from "./components/account-entries";
import styles from "./profile.module.css";

export function ProfileAccount() {
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const reportDirty = useCallback((section: string, value: boolean) => {
    setDirty((current) =>
      current[section] === value ? current : { ...current, [section]: value },
    );
  }, []);
  return (
    <div className={styles.profile}>
      <header className={styles.pageHeader}>
        <h1>账户</h1>
        <p>管理您的个人资料与基本设置</p>
      </header>
      <div className={styles.accountGrid}>
        <ProfileCard onDirty={reportDirty} />
        <div className={styles.rightColumn}>
          <section className={styles.card} aria-labelledby="contact-title">
            <div className={styles.sectionHeader}>
              <h2 id="contact-title">联系方式</h2>
            </div>
            <dl className={styles.contactSummary}>
              <div>
                <dt>Email</dt>
                <dd>
                  yu***@gmail.com{" "}
                  <span className={styles.verified}>✓ 已验证</span>
                </dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>
                  +81 •••• 1234{" "}
                  <span className={styles.verified}>✓ 已验证</span>
                </dd>
              </div>
            </dl>
          </section>
          <SettingsCard onDirty={reportDirty} />
        </div>
      </div>
      <EmergencyContacts onDirty={reportDirty} />
      <AccountEntries />
      <UnsavedGuard dirty={Object.values(dirty).some(Boolean)} />
    </div>
  );
}
