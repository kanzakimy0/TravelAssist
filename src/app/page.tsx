import { SiteHeader } from "@/components/site-header";

export default function Home() {
  return (
    <div className="page-shell">
      <SiteHeader />
      <main className="hero">
        <p className="eyebrow">Travel planning, thoughtfully assisted</p>
        <h1>Plan trips with clarity.</h1>
        <p className="hero-copy">
          TravelAssist Web 工程已准备就绪。后续功能将依据项目设计文档与正式
          Task 逐步实现。
        </p>
        <ul className="foundation-list" aria-label="工程基础能力">
          <li>Next.js App Router</li>
          <li>TypeScript</li>
          <li>Responsive Web</li>
        </ul>
      </main>
      <footer className="site-footer">
        Engineering foundation · TASK-001-B
      </footer>
    </div>
  );
}
