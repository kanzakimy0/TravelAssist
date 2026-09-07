"use client";

import { useState } from "react";

import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import {
  PersonalIcon,
  type PersonalIconName,
} from "@/features/personal-center/components/personal-icon";

import styles from "./profile-account.module.css";

export type AccountSubpageKind =
  "security" | "privacy" | "bookingSync" | "deleteAccount";

const COPY = {
  security: ["ACCOUNT SECURITY", "登录与安全", "保护您的登录方式与账户访问"],
  privacy: ["PRIVACY & DATA", "数据与隐私", "管理您的 TravelAssist 数据"],
  bookingSync: [
    "BOOKING SYNC",
    "预订与账户同步",
    "让已有预订更容易进入您的旅行",
  ],
  deleteAccount: [
    "ACCOUNT DELETION",
    "删除账户",
    "删除账户是不可逆的操作，请在继续前仔细阅读以下重要信息。",
  ],
} as const;

const METHODS = [
  ["mail", "邮箱", "yu***@gmail.com", "已验证", "修改邮箱"],
  ["phone", "手机", "+81 •••• 1234", "已验证", "修改手机号"],
  ["lock", "密码", "尚未设置", "尚未设置", "设置密码"],
  ["account", "Google", "已作为登录方式连接", "已连接", "管理"],
  ["account", "Apple", "尚未连接", "未连接", "连接"],
] as const;

const DEVICES = [
  [
    "trips",
    "MacBook Pro · Chrome",
    "日本 · 东京 · 2025年1月24日 14:32",
    "当前设备",
  ],
  ["phone", "iPhone 14 · Safari", "日本 · 大阪 · 2025年1月20日 09:15", "退出"],
  ["home", "Windows PC · Edge", "中国 · 上海 · 2025年1月18日 20:41", "退出"],
] as const;

const DATA_ITEMS = [
  ["account", "个人资料", "姓名、联系方式、居住地区等"],
  ["heart", "旅行偏好", "目的地偏好、旅行风格等"],
  ["people", "同行人资料", "同行人的基本信息"],
  ["trips", "保存的行程 / 草稿 / 历史", "您创建和保存的行程记录"],
  ["compass", "收藏", "您收藏的目的地、酒店、景点等"],
  ["calendar", "预订记录", "航班、酒店、门票等订单信息"],
  ["privacy", "安全活动", "登录记录、设备与安全设置"],
] as const;

const CONNECTIONS = [
  [
    "B.",
    "Booking.com",
    "已连接",
    "10 分钟前同步",
    "同步您在 Booking.com 的酒店、民宿等预订，自动加入到您的旅行行程中。",
    "管理",
    "断开",
  ],
  [
    "✉",
    "确认邮件",
    "已连接",
    "今天 13:20 扫描",
    "扫描邮箱中的旅行确认邮件，识别航班、酒店、JR 票等预订。",
    "管理",
    "重新授权",
  ],
  [
    "agoda",
    "Agoda",
    "合作伙伴同步",
    "通过合作伙伴订单同步",
    "通过 Agoda 官方合作伙伴接口同步您的预订，行程自动更新。",
    "查看说明",
    "",
  ],
] as const;

const IMPORTS = [
  ["sync", "连接 Booking.com", "一键同步您的预订"],
  ["mail", "从确认邮件识别", "扫描邮箱，自动导入"],
  ["trips", "上传确认单 / PDF", "支持 PDF、截图等"],
  ["menu", "输入订单号", "手动输入预订编号"],
  ["plus", "手动添加", "补充您已有的预订"],
] as const;

function Icon({ name }: { name: PersonalIconName }) {
  return (
    <span className={styles.subpageIcon}>
      <PersonalIcon name={name} />
    </span>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: PersonalIconName;
  title: string;
  description?: string;
}) {
  return (
    <div className={styles.subpageSectionTitle}>
      <Icon name={icon} />
      <span>
        <strong>{title}</strong>
        {description ? <small>{description}</small> : null}
      </span>
    </div>
  );
}

function DemoButton({
  children,
  announce,
}: {
  children: React.ReactNode;
  announce: () => void;
}) {
  return (
    <button type="button" onClick={announce}>
      {children}
    </button>
  );
}

function SecurityView({ announce }: { announce: (message: string) => void }) {
  return (
    <div className={[styles.subpageBody, styles.securityView].join(" ")}>
      <section
        className={[styles.subpageCard, styles.protectionCard].join(" ")}
      >
        <SectionTitle
          icon="privacy"
          title="账户保护"
          description="您的账户当前处于安全状态"
        />
        <div className={styles.protectionStats}>
          {[
            ["mail", "邮箱", "已验证"],
            ["phone", "手机", "已验证"],
            ["lock", "登录方式", "3 个"],
          ].map(([icon, label, value]) => (
            <div key={label}>
              <Icon name={icon as PersonalIconName} />
              <strong>{label}</strong>
              <span className={value === "已验证" ? styles.statusBadge : ""}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className={styles.securityColumns}>
        <section className={styles.subpageCard}>
          <SectionTitle
            icon="account"
            title="登录方式"
            description="管理您用于登录 TravelAssist 的方式"
          />
          <div className={styles.methodList}>
            {METHODS.map(([icon, label, value, status, action]) => (
              <div key={label}>
                <Icon name={icon} />
                <span>
                  <strong>{label}</strong>
                  <small>{value}</small>
                </span>
                <span
                  className={
                    status === "已验证" || status === "已连接"
                      ? styles.statusBadge
                      : styles.neutralBadge
                  }
                >
                  {status}
                </span>
                <DemoButton
                  announce={() =>
                    announce(action + "为展示操作，未连接真实身份服务。")
                  }
                >
                  {action}
                </DemoButton>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.subpageCard}>
          <SectionTitle
            icon="trips"
            title="登录设备"
            description="管理您的登录设备，保障账户安全"
          />
          <div className={styles.deviceList}>
            {DEVICES.map(([icon, title, meta, action]) => (
              <div key={title}>
                <Icon name={icon} />
                <span>
                  <strong>{title}</strong>
                  <small>{meta}</small>
                </span>
                {action === "当前设备" ? (
                  <span className={styles.currentBadge}>{action}</span>
                ) : (
                  <DemoButton
                    announce={() =>
                      announce(title + " 的退出操作仅作界面演示。")
                    }
                  >
                    {action}
                  </DemoButton>
                )}
              </div>
            ))}
          </div>
          <DemoButton
            announce={() =>
              announce("退出其他设备仅作界面演示，未变更任何 Session。")
            }
          >
            退出其他所有设备
          </DemoButton>
        </section>
      </div>

      <section className={[styles.subpageCard, styles.activityCard].join(" ")}>
        <SectionTitle icon="refresh" title="最近安全活动" />
        <div className={styles.activityList}>
          {[
            [
              "trips",
              "新设备登录",
              "一台新的设备登录了您的账户",
              "2025年1月24日 14:32",
            ],
            [
              "lock",
              "密码已修改",
              "您的账户密码已成功修改",
              "2025年1月20日 09:15",
            ],
            [
              "account",
              "Google 登录已连接",
              "Google 已作为登录方式连接",
              "2025年1月18日 16:27",
            ],
          ].map(([icon, title, description, time]) => (
            <div key={title}>
              <PersonalIcon name={icon as PersonalIconName} />
              <strong>{title}</strong>
              <span>{description}</span>
              <time>{time}</time>
              <PersonalIcon name="chevronRight" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function PrivacyView({ announce }: { announce: (message: string) => void }) {
  return (
    <div className={[styles.subpageBody, styles.privacyView].join(" ")}>
      <section
        className={[styles.subpageCard, styles.dataOverviewCard].join(" ")}
      >
        <SectionTitle
          icon="sync"
          title="您的数据"
          description="以下是我们为您保存的主要内容。"
        />
        <div className={styles.dataCategoryGrid}>
          {DATA_ITEMS.map(([icon, title, description]) => (
            <div key={title}>
              <Icon name={icon} />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <PersonalIcon name="chevronRight" />
            </div>
          ))}
        </div>
      </section>

      <section className={[styles.subpageCard, styles.exportCard].join(" ")}>
        <SectionTitle
          icon="arrow"
          title="导出我的数据"
          description="申请导出您的 TravelAssist 数据副本。"
        />
        <p>生成包含个人资料、行程、收藏等内容的数据文件。</p>
        <DemoButton announce={() => announce("Mock 数据导出申请已记录。")}>
          申请导出
        </DemoButton>
        <div className={styles.exportStates}>
          <span>导出状态示例</span>
          {[
            ["neutral", "未申请", "尚未提交数据导出申请"],
            ["pending", "生成中", "数据正在整理中，请稍候…"],
            ["ready", "可下载", "数据已生成，可在 7 天内下载"],
          ].map(([tone, title, description]) => (
            <div key={title}>
              <i data-tone={tone} />
              <strong>{title}</strong>
              <small>{description}</small>
            </div>
          ))}
        </div>
      </section>

      <section
        className={[styles.subpageCard, styles.dataManagementCard].join(" ")}
      >
        <SectionTitle
          icon="settings"
          title="数据管理"
          description="管理与您数据相关的功能和内容。"
        />
        <div className={styles.managementLinks}>
          <GuardedLink href="/personal-center/trips">
            <PersonalIcon name="pin" />
            <span>
              <strong>我的旅行</strong>
              <small>管理您创建的行程、草稿与历史</small>
            </span>
            <PersonalIcon name="chevronRight" />
          </GuardedLink>
          <GuardedLink href="/personal-center/trips">
            <PersonalIcon name="heart" />
            <span>
              <strong>我的收藏</strong>
              <small>查看和管理您收藏的内容</small>
            </span>
            <PersonalIcon name="chevronRight" />
          </GuardedLink>
          <DemoButton
            announce={() => announce("AI 历史尚未启用，当前仅展示入口边界。")}
          >
            <PersonalIcon name="account" />
            <span>
              <strong>AI 历史（如启用）</strong>
              <small>管理与 AI 助手的对话记录</small>
            </span>
            <PersonalIcon name="chevronRight" />
          </DemoButton>
        </div>
      </section>

      <section className={[styles.subpageCard, styles.dangerZone].join(" ")}>
        <SectionTitle icon="info" title="危险区域" />
        <div>
          <span>
            <strong>删除 TravelAssist 账户</strong>
            <small>此操作将永久删除您的账户及其所有数据，且无法恢复。</small>
          </span>
          <GuardedLink href="/personal-center/account/privacy/delete">
            <PersonalIcon name="trash" />
            删除账户
          </GuardedLink>
        </div>
      </section>
    </div>
  );
}

function BookingSyncView({
  announce,
}: {
  announce: (message: string) => void;
}) {
  return (
    <div className={[styles.subpageBody, styles.bookingView].join(" ")}>
      <div className={styles.connectionGrid}>
        {CONNECTIONS.map(
          ([logo, title, status, sync, description, action, secondAction]) => (
            <section className={styles.connectionCard} key={title}>
              <div className={styles.connectionHeading}>
                <span className={styles.providerLogo}>{logo}</span>
                <span>
                  <strong>{title}</strong>
                  <small className={styles.statusBadge}>{status}</small>
                </span>
              </div>
              <p className={styles.syncTime}>{sync}</p>
              <p>{description}</p>
              <div>
                {[action, secondAction].filter(Boolean).map((label) => (
                  <DemoButton
                    key={label}
                    announce={() =>
                      announce(
                        title +
                          " · " +
                          label +
                          "为本地展示操作，不会访问外部账户。",
                      )
                    }
                  >
                    {label}
                  </DemoButton>
                ))}
              </div>
            </section>
          ),
        )}
      </div>

      <section className={[styles.subpageCard, styles.importCard].join(" ")}>
        <SectionTitle
          icon="arrow"
          title="导入已有预订"
          description="通过以下方式，将已有预订添加到 TravelAssist。"
        />
        <div className={styles.importGrid}>
          {IMPORTS.map(([icon, title, description]) => (
            <DemoButton
              key={title}
              announce={() =>
                announce(title + "入口已响应；当前不会发起网络写入。")
              }
            >
              <Icon name={icon} />
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <PersonalIcon name="chevronRight" />
            </DemoButton>
          ))}
        </div>
        <div className={styles.importNotes}>
          <span>
            <PersonalIcon name="info" />
            断开连接不会取消您在相应平台的订单。
          </span>
          <span>
            <PersonalIcon name="info" />
            已加入旅行的订单不会因断开连接而自动删除。
          </span>
        </div>
      </section>
    </div>
  );
}

function DeleteAccountView({
  announce,
}: {
  announce: (message: string) => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const canSubmit = acknowledged && confirmation.trim() === "删除账户";

  return (
    <div className={[styles.subpageBody, styles.deleteView].join(" ")}>
      <section className={[styles.subpageCard, styles.deleteWarning].join(" ")}>
        <Icon name="info" />
        <div>
          <h2>删除 TravelAssist 账户将永久删除以下所有数据</h2>
          <p>
            个人资料、旅行偏好、同行人、已保存行程、收藏、预订映射记录以及账户连接都会被永久删除，且无法恢复。
          </p>
          <div>
            <strong>但不会自动取消您在外部平台的预订</strong>
            <span>
              Booking.com、Agoda、Klook、餐厅、航班、铁路或租车订单需要在相应平台处理。
            </span>
          </div>
        </div>
      </section>

      <section
        className={[styles.subpageCard, styles.reservationWarning].join(" ")}
      >
        <SectionTitle
          icon="calendar"
          title="您还有 2 次未来旅行 / 6 个有效外部预订"
          description="删除账户前，请确认以下行程与预订。"
        />
        <GuardedLink href="/personal-center/trips">
          查看我的预订 <PersonalIcon name="chevronRight" />
        </GuardedLink>
        <div className={styles.reservationSummary}>
          {[
            ["京都春日漫游", "2025年4月3日 – 4月8日"],
            ["Booking.com", "酒店 ×2"],
            ["Klook", "门票 ×3"],
            ["TableCheck", "餐厅 ×1"],
          ].map(([title, meta]) => (
            <span key={title}>
              <strong>{title}</strong>
              <small>{meta}</small>
            </span>
          ))}
        </div>
      </section>

      <section className={[styles.subpageCard, styles.deleteExport].join(" ")}>
        <SectionTitle
          icon="sync"
          title="导出我的数据"
          description="删除账户前，可先导出个人资料、旅行计划与收藏内容。"
        />
        <DemoButton announce={() => announce("Mock 数据导出申请已记录。")}>
          <PersonalIcon name="arrow" />
          导出我的数据
        </DemoButton>
      </section>

      <section className={[styles.subpageCard, styles.deleteConfirm].join(" ")}>
        <label>
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => setAcknowledged(event.target.checked)}
          />
          <span>
            <strong>我明白删除 TravelAssist 账户不会取消外部平台订单</strong>
            <small>我已阅读并理解上述内容，确认继续删除账户。</small>
          </span>
        </label>
        <label>
          <span>请输入：删除账户</span>
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder="删除账户"
          />
        </label>
        <div>
          <GuardedLink href="/personal-center/account/privacy">
            取消
          </GuardedLink>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() =>
              announce(
                "演示环境不会提交账户删除请求；正式流程仍需重新验证身份。",
              )
            }
          >
            <PersonalIcon name="trash" />
            永久删除账户
          </button>
        </div>
      </section>
    </div>
  );
}

export function AccountSubpage({ kind }: { kind: AccountSubpageKind }) {
  const [notice, setNotice] = useState("");
  const copy = COPY[kind];

  const announce = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2600);
  };

  return (
    <div
      className={styles.accountSubpage}
      data-account-subpage
      data-account-kind={kind}
    >
      <header className={styles.subpageHeader}>
        <nav aria-label="账户面包屑">
          <GuardedLink href="/personal-center/account">
            <PersonalIcon name="home" />
            账户
          </GuardedLink>
          {kind === "deleteAccount" ? (
            <>
              <span>/</span>
              <GuardedLink href="/personal-center/account/privacy">
                数据与隐私
              </GuardedLink>
            </>
          ) : null}
          <span>/</span>
          <strong>{copy[1]}</strong>
        </nav>
        <p>{copy[0]}</p>
        <h1>{copy[1]}</h1>
        <span>{copy[2]}</span>
      </header>

      {kind === "security" ? <SecurityView announce={announce} /> : null}
      {kind === "privacy" ? <PrivacyView announce={announce} /> : null}
      {kind === "bookingSync" ? <BookingSyncView announce={announce} /> : null}
      {kind === "deleteAccount" ? (
        <DeleteAccountView announce={announce} />
      ) : null}

      <div className={styles.subpageNotice} role="status" aria-live="polite">
        {notice}
      </div>
      <p className={styles.subpageBoundary}>
        {
          "Persistence: Mock / in-memory only · 不会连接 Auth、API 或数据库，也不会修改外部预订或账户数据。"
        }
      </p>
    </div>
  );
}
