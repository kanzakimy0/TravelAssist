import Link from "next/link";
import { MainHeader } from "@/components/layout/main-header";
import {
  informationPages,
  type InformationPageKey,
} from "./information-content";
import { InformationFooter } from "./information-footer";
import styles from "./information.module.css";

export function InformationPage({ page }: { page: InformationPageKey }) {
  const content = informationPages[page];
  return (
    <div className={styles.page}>
      <a className="main-skip-link" href="#information-content">
        跳至主要内容
      </a>
      <MainHeader className={styles.header}>
        <Link href="/" className={styles.back}>
          返回首页
        </Link>
      </MainHeader>
      <main id="information-content" tabIndex={-1} className={styles.content}>
        <h1>{content.title}</h1>
        <p className={styles.intro}>{content.intro}</p>
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2>{section.title}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
        {page === "about" ? (
          <p className={styles.projectLinks}>
            <a href="https://github.com/kanzakimy0/TravelAssist">项目仓库</a>
            <a href="https://github.com/kanzakimy0/TravelAssist/issues">
              提交项目反馈
            </a>
          </p>
        ) : null}
        {page === "help" ? (
          <p>
            <Link href="/start">开始规划 →</Link>
          </p>
        ) : null}
      </main>
      <InformationFooter />
    </div>
  );
}
