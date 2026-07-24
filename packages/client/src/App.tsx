import { useInViewAnimation } from "./hooks/useInViewAnimation"
import { Link } from "react-router-dom"
import { Sparkles, PenLine, Layers, Network, ArrowRight, Brain, Zap, Star, Lightbulb } from "lucide-react"

const fadeDelay = (s: number) => ({ animationDelay: s + "s" } as React.CSSProperties)

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, isInView } = useInViewAnimation()
  return (
    <div ref={ref} className={isInView ? "animate-fade-in-up" : "opacity-0"} style={fadeDelay(delay)}>
      {children}
    </div>
  )
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh", overflowX: "hidden" }}>

      {/* ===== HERO ===== */}
      <section style={{
        position: "relative", minHeight: "100vh", display: "flex",
        alignItems: "center", justifyContent: "center", padding: "0 24px", overflow: "hidden",
        background: "linear-gradient(165deg, #F6FCFF 0%, #f0f7fa 30%, #ffffff 65%, #f8f6ff 100%)"
      }}>
        <div style={{ position: "absolute", top: -100, right: -60, width: 450, height: 450, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,92,231,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -60, left: -40, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(108,92,231,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: 620, textAlign: "center", padding: "80px 0" }}>
          <FadeIn delay={0.1}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 18px",
              borderRadius: 99, marginBottom: 40, background: "rgba(255,255,255,0.85)",
              border: "1px solid #E0EBF0", fontSize: 11, fontFamily: "monospace",
              letterSpacing: "0.18em", color: "#5B6E76"
            }}>
              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#6c5ce7" }} />
              AI CREATOR OS
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <h1 style={{
              fontFamily: "'PP Mondwest', Georgia, 'Times New Roman', serif",
              fontSize: "clamp(52px, 9vw, 88px)", fontWeight: 700,
              lineHeight: 0.94, letterSpacing: "-0.03em",
              color: "#051A24", margin: "0 0 32px"
            }}>
              把你的想法<br />
              <span style={{ color: "#6c5ce7" }}>变成作品</span>
            </h1>
          </FadeIn>

          <FadeIn delay={0.35}>
            <p style={{
              fontSize: "clamp(16px, 2vw, 19px)", lineHeight: 1.7,
              color: "#5B6E76", maxWidth: 440, margin: "0 auto 48px"
            }}>
              AI 驱动的创作操作系统。从灵感到成品，你的 AI 团队
              <span style={{ color: "#051A24", fontWeight: 500 }}> 带着你的身份、偏好和知识背景工作</span>。
            </p>
          </FadeIn>

          <FadeIn delay={0.5}>
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
              <Link to="/workspace/new" style={{
                display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 36px",
                borderRadius: 99, textDecoration: "none", background: "#051A24",
                color: "#ffffff", fontSize: 15, fontWeight: 500, transition: "transform 0.15s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 4px 4px rgba(0,0,0,0.09), 0 9px 6px rgba(0,0,0,0.05), 0 17px 7px rgba(0,0,0,0.01), 0 26px 7px rgba(0,0,0,0), inset 0 1px 0 rgba(255,255,255,0.3)"
              }}>
                <PenLine size={17} /> 开始创作 <ArrowRight size={15} />
              </Link>
              <Link to="/identity" style={{
                display: "inline-flex", alignItems: "center", padding: "16px 28px",
                borderRadius: 99, textDecoration: "none", background: "#ffffff",
                color: "#5B6E76", fontSize: 15, border: "1px solid #E0EBF0",
                boxShadow: "0 0 0 0.5px rgba(0,0,0,0.03), 0 4px 20px rgba(0,0,0,0.04)",
                transition: "all 0.2s"
              }}>
                配置创作者身份 →
              </Link>
            </div>
          </FadeIn>

          <FadeIn delay={0.7}>
            <div style={{
              display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16,
              marginTop: 80, paddingTop: 36, borderTop: "1px solid #E0EBF0"
            }}>
              {[
                { v: "Canvas", l: "无限画布思考" },
                { v: "3 Agents", l: "AI 创作团队" },
                { v: "Memory", l: "长期知识网络" },
              ].map((s) => (
                <div key={s.l} style={{
                  padding: 20, borderRadius: 16, textAlign: "center",
                  background: "rgba(255,255,255,0.6)", border: "1px solid #E0EBF0"
                }}>
                  <div style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#051A24", marginBottom: 4 }}>{s.v}</div>
                  <div style={{ fontSize: 10, color: "#5B6E76", letterSpacing: "0.05em" }}>{s.l}</div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== MARQUEE — cream bg ===== */}
      <section style={{ padding: "110px 0", overflow: "hidden", background: "#F6FCFF" }}>
        <FadeIn delay={0.2}>
          <p style={{ textAlign: "center", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.2em", color: "#B8CDD5", textTransform: "uppercase", marginBottom: 8 }}>Core Capabilities</p>
          <h2 style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: "clamp(30px, 4.5vw, 40px)", fontWeight: 600, textAlign: "center", color: "#051A24", marginBottom: 64, letterSpacing: "-0.02em" }}>核心能力</h2>
        </FadeIn>
        <div style={{ display: "flex", gap: 24, animation: "marquee 45s linear infinite" }}>
          {[...features, ...features].map((f, i) => (
            <div key={i} style={{
              flexShrink: 0, width: 320, padding: 36, borderRadius: 24,
              background: "#ffffff", border: "1px solid #E0EBF0",
              boxShadow: "0 2px 8px rgba(5,26,36,0.04)",
              display: "flex", flexDirection: "column", gap: 18
            }}>
              <div style={{ width: 56, height: 56, borderRadius: 18, background: "#F6FCFF", display: "flex", alignItems: "center", justifyContent: "center", color: "#051A24" }}>{f.icon}</div>
              <h3 style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#051A24", lineHeight: 1.3 }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "#5B6E76" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== WORKFLOW — white bg ===== */}
      <section style={{ padding: "110px 24px", background: "#ffffff" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <FadeIn delay={0.1}>
            <p style={{ textAlign: "center", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.2em", color: "#B8CDD5", textTransform: "uppercase", marginBottom: 8 }}>Workflow</p>
            <h2 style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: "clamp(30px, 4.5vw, 40px)", fontWeight: 600, textAlign: "center", color: "#051A24", marginBottom: 72, letterSpacing: "-0.02em" }}>
              从灵感到成品，<span style={{ color: "#6c5ce7" }}>四步闭环</span>
            </h2>
          </FadeIn>
          {workflow.map((w, i) => (
            <FadeIn key={w.step} delay={0.1 + i * 0.12}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "clamp(24px, 5vw, 52px)", padding: "40px 20px", borderBottom: i === workflow.length - 1 ? "none" : "1px solid #E0EBF0", borderRadius: 16 }}>
                <span style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: "clamp(52px, 9vw, 96px)", fontWeight: 700, lineHeight: 1, color: "#F0F4F8", flexShrink: 0, userSelect: "none", letterSpacing: "-0.04em" }}>{w.step}</span>
                <div style={{ paddingTop: 6 }}>
                  <h3 style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: "clamp(20px, 2.5vw, 26px)", fontWeight: 600, color: "#051A24", marginBottom: 8 }}>{w.title}</h3>
                  <p style={{ fontSize: "clamp(14px, 1.5vw, 16px)", lineHeight: 1.7, color: "#5B6E76", maxWidth: 520 }}>{w.desc}</p>
                  <p style={{ fontSize: 12, color: "#B8CDD5", marginTop: 10, fontFamily: "monospace" }}>{w.visual}</p>
                </div>
              </div>
            </FadeIn>
          ))}
          <FadeIn delay={0.6}>
            <div style={{ textAlign: "center", marginTop: 60 }}>
              <Link to="/workspace/new" style={{
                display: "inline-flex", alignItems: "center", gap: 10, padding: "16px 40px",
                borderRadius: 99, textDecoration: "none", background: "#051A24",
                color: "#ffffff", fontSize: 15, fontWeight: 500, transition: "transform 0.15s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 4px 4px rgba(0,0,0,0.09), 0 9px 6px rgba(0,0,0,0.05), 0 17px 7px rgba(0,0,0,0.01), inset 0 1px 0 rgba(255,255,255,0.25)"
              }}>
                <Zap size={17} /> 开始你的第一次创作 <ArrowRight size={15} />
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ===== PHILOSOPHY — cream bg ===== */}
      <section style={{ padding: "110px 24px", background: "#F6FCFF" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <FadeIn delay={0.1}>
            <p style={{ textAlign: "center", fontSize: 11, fontFamily: "monospace", letterSpacing: "0.2em", color: "#B8CDD5", textTransform: "uppercase", marginBottom: 8 }}>Philosophy</p>
            <h2 style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: "clamp(30px, 4.5vw, 40px)", fontWeight: 600, textAlign: "center", color: "#051A24", marginBottom: 72, letterSpacing: "-0.02em" }}>
              不是工具，<span style={{ color: "#6c5ce7" }}>是操作系统</span>
            </h2>
          </FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {philosophy.map((p, i) => (
              <FadeIn key={p.title} delay={0.1 + i * 0.1}>
                <div style={{ position: "relative", padding: 36, borderRadius: 24, overflow: "hidden", background: "#ffffff", border: "1px solid #E0EBF0", boxShadow: "0 2px 8px rgba(5,26,36,0.04)", height: "100%" }}>
                  <span style={{ position: "absolute", top: -20, right: -10, fontFamily: "'PP Mondwest', Georgia, serif", fontSize: 140, fontWeight: 700, lineHeight: 1, color: "#F6FCFF", userSelect: "none", pointerEvents: "none", letterSpacing: "-0.04em" }}>{i + 1}</span>
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 16, background: "#6c5ce7", display: "flex", alignItems: "center", justifyContent: "center", color: "#ffffff", marginBottom: 20 }}>{p.icon}</div>
                    <h3 style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: 19, fontWeight: 600, color: "#051A24", marginBottom: 10 }}>{p.title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: "#5B6E76" }}>{p.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA — white bg ===== */}
      <section style={{ padding: "130px 24px", textAlign: "center", background: "#ffffff" }}>
        <FadeIn delay={0.1}>
          <div style={{ width: 72, height: 72, borderRadius: 22, background: "#F6FCFF", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 36px", color: "#6c5ce7" }}>
            <Star size={32} />
          </div>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: "clamp(30px, 5vw, 48px)", fontWeight: 600, lineHeight: 1.12, color: "#051A24", marginBottom: 8 }}>
            好的工具不该让你管理想法<br />
            而是帮你<span style={{ color: "#6c5ce7" }}>完成想法</span>
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <p style={{ fontSize: 15, color: "#B8CDD5", fontStyle: "italic", marginBottom: 40 }}>— AI Creator OS</p>
        </FadeIn>
        <FadeIn delay={0.4}>
          <Link to="/workspace/new" style={{
            display: "inline-flex", alignItems: "center", gap: 10, padding: "18px 48px",
            borderRadius: 99, textDecoration: "none", background: "#051A24", color: "#ffffff",
            fontSize: 16, fontWeight: 500, transition: "transform 0.15s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.1), 0 4px 4px rgba(0,0,0,0.09), 0 9px 6px rgba(0,0,0,0.05), 0 17px 7px rgba(0,0,0,0.01), 0 30px 30px rgba(5,26,36,0.04)"
          }}>
            <Lightbulb size={17} /> 免费开始
          </Link>
        </FadeIn>
      </section>

      {/* ===== FOOTER ===== */}
      <footer style={{ borderTop: "1px solid #E0EBF0", background: "#F6FCFF" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "64px 24px", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 40 }}>
          <div>
            <p style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: 21, fontWeight: 600, color: "#051A24", marginBottom: 8 }}>AI Creator OS</p>
            <p style={{ fontSize: 13, color: "#5B6E76", maxWidth: 240, lineHeight: 1.6 }}>本地优先 · 开源 · 你的第二大脑<br />AI 驱动的创作操作系统</p>
          </div>
          <div style={{ display: "flex", gap: 64 }}>
            <div>
              <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.15em", color: "#B8CDD5", marginBottom: 12, textTransform: "uppercase" }}>Explore</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to="/workspace/new" style={{ fontSize: 13, color: "#5B6E76", textDecoration: "none" }}>Canvas</Link>
                <Link to="/memory" style={{ fontSize: 13, color: "#5B6E76", textDecoration: "none" }}>知识图谱</Link>
                <Link to="/identity" style={{ fontSize: 13, color: "#5B6E76", textDecoration: "none" }}>身份</Link>
              </div>
            </div>
            <div>
              <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.15em", color: "#B8CDD5", marginBottom: 12, textTransform: "uppercase" }}>More</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Link to="/settings" style={{ fontSize: 13, color: "#5B6E76", textDecoration: "none" }}>设置</Link>
                <a href="#" style={{ fontSize: 13, color: "#5B6E76", textDecoration: "none" }}>文档</a>
              </div>
            </div>
          </div>
        </div>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "16px 24px", borderTop: "1px solid #E0EBF0", display: "flex", justifyContent: "space-between", fontSize: 10, fontFamily: "monospace", color: "#B8CDD5" }}>
          <span>© AI Creator OS</span>
          <span>数据本地存储 · 隐私无忧</span>
        </div>
      </footer>

      {/* ===== FLOATING BAR ===== */}
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 999 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "12px 32px", borderRadius: 99, background: "rgba(255,255,255,0.9)", backdropFilter: "blur(30px)", border: "1px solid #E0EBF0", boxShadow: "0 0 0 0.5px rgba(0,0,0,0.04), 0 8px 40px rgba(0,0,0,0.08)" }}>
          <span style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: 26, fontWeight: 600, color: "#051A24" }}>A</span>
          <div style={{ width: 1, height: 22, background: "#E0EBF0" }} />
          <Link to="/workspace/new" style={{ padding: "10px 28px", borderRadius: 99, textDecoration: "none", background: "#051A24", color: "#ffffff", fontSize: 14, fontWeight: 500 }}>开始创作</Link>
        </div>
      </div>
    </div>
  )
}

const features = [
  { icon: <Layers size={22} />, title: "Canvas 思考画布", desc: "拖拽卡片、画连线，AI 自动发现你没想过的关联。从卡片网一键生成文章结构。" },
  { icon: <Sparkles size={22} />, title: "AI 创作团队", desc: "Writer 写初稿、Critic 挑毛病、Editor 润色——三 Agent 按你的风格协作。" },
  { icon: <Network size={22} />, title: "Memory 知识网络", desc: "所有卡片和连线自动沉淀为长期知识图谱。跨 Workspace 发现隐性关联。" },
  { icon: <Brain size={22} />, title: "灵感引擎", desc: "反题生成器挑战你的观点，跨域桥接找到意想不到的连接，偶然碰撞带来惊喜。" },
  { icon: <Zap size={22} />, title: "身份感知", desc: "AI 学习你的审美偏好、写作风格、价值倾向，每次创作都带着你的声音。" },
  { icon: <Star size={22} />, title: "本地优先", desc: "数据存在本地，支持云端模型 + 本地模型混合路由。导出无忧。" },
]

const philosophy = [
  { icon: <Layers size={22} />, title: "Canvas", desc: "无限画布，拖拽卡片，画线连接。AI 帮你发现隐藏的思维路径，一键生成文章大纲。不是笔记，是思维的操作系统。" },
  { icon: <Sparkles size={22} />, title: "AI Agents", desc: "Writer 写初稿、Critic 审阅、Editor 润色——三 Agent 流水线协作。Research Agent 找资料，Curator 整理知识。" },
  { icon: <Network size={22} />, title: "Memory", desc: "概念—关系—演化，知识随时间增值，跨主题发现深层联系。不是搜索，是长期认知。" },
]

const workflow = [
  { step: "01", title: "信息流入", desc: "Radar 持续扫描外部信息，Inbox 快速捕获一闪而过的想法。AI 自动过滤、关联、推荐进入 Workspace。", visual: "Radar 扫描 + Inbox 捕获 → AI 关联 → 推荐" },
  { step: "02", title: "思考构思", desc: "在 Canvas 上拖拽卡片、画连线。AI Connection 推荐你没想过的关联，Challenge 质疑你的前提假设。", visual: "卡片网 + AI 连线 → 反题挑战 → 文章结构" },
  { step: "03", title: "创作输出", desc: "Writer 按你的风格生成初稿，Critic 审阅+复检，Editor 润色。支持公众号、Blog、视频脚本等格式。", visual: "Writer → Critic → 复检 → Editor → 成品" },
  { step: "04", title: "反馈进化", desc: "收集读者反馈，AI 分析成败原因。Evolution 追踪你的主题漂移和风格演变，发现自己的成长轨迹。", visual: "反馈数据 → 趋势分析 → Memory 沉淀" },
]