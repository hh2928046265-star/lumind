import { useState, useEffect } from "react";
import { Clock, Search, Copy, Check, X, ArrowRight, FileText, Loader2, Trash2 } from "lucide-react";
import { api } from "../hooks/api";

const formatLabels: Record<string, string> = { short: "短文", essay: "随笔", article: "文章" };
const formatColors: Record<string, string> = { short: "#E3F2FD", essay: "#F3E5F5", article: "#FFF3E0" };
const formatTextColors: Record<string, string> = { short: "#1565C0", essay: "#7B1FA2", article: "#E65100" };
const formatDate = (iso: string) => {
  const d = new Date(iso);
  return (d.getMonth() + 1) + "/" + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};

interface Props {
  show: boolean;
  onClose: () => void;
}

type View = "list" | "detail";

export function HistoryPanel({ show, onClose }: Props) {
  const [drafts, setDrafts] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [formatFilter, setFormatFilter] = useState("");
  const [view, setView] = useState<View>("list");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState(false);

  const load = (q?: string, fmt?: string) => {
    setLoading(true);
    const params: { q?: string; format?: string; page?: number; pageSize?: number } = { pageSize: 50 };
    if (q) params.q = q;
    if (fmt) params.format = fmt;
    api.getGlobalDrafts(params)
      .then((data) => { setDrafts(data.items); setTotal(data.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (show) { setView("list"); setDetail(null); load(); }
  }, [show]);

  const handleSearch = (q: string) => {
    setSearch(q);
    load(q, formatFilter);
  };

  const handleFormat = (fmt: string) => {
    setFormatFilter(fmt);
    load(search, fmt);
  };

  const openDetail = (d: Record<string, unknown>) => {
    setDetail(d);
    setView("detail");
  };

  const copyContent = () => {
    if (!detail) return;
    navigator.clipboard.writeText(detail.content as string);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleDelete = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("确定要删除这篇作品吗？")) return;
    try {
      await api.deleteDraft(id);
      if (detail && (detail.id as string) === id) {
        setDetail(null);
        setView("list");
      }
      load(search, formatFilter);
    } catch {}
  };

  if (!show) return null;

  const overlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div onClick={overlayClick} style={{
      position: "fixed", inset: 0, zIndex: 9999, background: "rgba(5,26,36,0.4)",
      backdropFilter: "blur(4px)", display: "flex", justifyContent: "center",
      alignItems: "flex-start", padding: "80px 24px 24px", overflowY: "auto"
    }}>
      <div style={{
        background: "#fff", borderRadius: 24, width: "100%", maxWidth: 800,
        maxHeight: "calc(100vh - 120px)", overflow: "hidden",
        boxShadow: "0 0 0 0.5px rgba(0,0,0,0.04), 0 16px 64px rgba(0,0,0,0.14)",
        display: "flex", flexDirection: "column"
      }}>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 28px", borderBottom: "1px solid #E0EBF0"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "#F0F3F6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Clock size={18} color="#051A24" />
            </div>
            <div>
              <span style={{ fontSize: 16, fontWeight: 600, color: "#051A24" }}>历史作品</span>
              <span style={{ fontSize: 12, color: "#8E9BAE", marginLeft: 8 }}>{total} 篇</span>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: "none",
            background: "#F0F3F6", cursor: "pointer", display: "flex",
            alignItems: "center", justifyContent: "center"
          }}>
            <X size={14} color="#5B6E76" />
          </button>
        </div>

        {/* Search bar */}
        {view === "list" && (
          <div style={{ padding: "16px 28px", display: "flex", gap: 10, borderBottom: "1px solid #F0F3F6" }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", borderRadius: 12, background: "#F6FCFF", border: "1px solid #E0EBF0" }}>
              <Search size={14} color="#8E9BAE" />
              <input value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="搜索标题、内容、空间..."
                style={{ flex: 1, border: "none", background: "transparent", fontSize: 13, color: "#051A24", outline: "none" }}
              />
            </div>
            <select value={formatFilter}
              onChange={(e) => handleFormat(e.target.value)}
              style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #E0EBF0", background: "#F6FCFF", fontSize: 13, color: "#051A24", cursor: "pointer", outline: "none" }}
            >
              <option value="">全部格式</option>
              <option value="short">短文</option>
              <option value="essay">随笔</option>
              <option value="article">文章</option>
            </select>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: view === "list" ? "12px 0" : "16px 28px 28px" }}>
          {view === "detail" && detail ? (
            <>
              <button onClick={() => setView("list")} style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                borderRadius: 99, border: "1px solid #E0EBF0", background: "#fff",
                color: "#5B6E76", fontSize: 12, cursor: "pointer", marginBottom: 16
              }}>
                <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} /> 返回列表
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <h2 style={{ fontFamily: "'PP Mondwest', Georgia, serif", fontSize: 22, fontWeight: 600, color: "#051A24", margin: 0 }}>
                  {detail.title as string}
                </h2>
                <div style={{ display: "flex", gap: 8 }}>
                <button onClick={copyContent} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 99, border: "1px solid #E0EBF0",
                  background: copied ? "#e8f5e9" : "#fff", color: copied ? "#2e7d32" : "#5B6E76",
                  fontSize: 12, cursor: "pointer", transition: "all 0.2s"
                }}>
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? "已复制" : "复制全文"}
                </button>
                <button onClick={(e) => handleDelete(detail.id as string, e)} style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", borderRadius: 99, border: "1px solid #fecaca",
                  background: "#fff", color: "#dc2626", fontSize: 12, cursor: "pointer",
                  transition: "all 0.2s"
                }}>
                  <Trash2 size={13} /> 删除
                </button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "4px 10px", borderRadius: 99, background: formatColors[detail.format as string] || "#F0F3F6", color: formatTextColors[detail.format as string] || "#5B6E76", fontWeight: 500 }}>
                  {formatLabels[detail.format as string] || detail.format as string}
                </span>
                <span style={{ fontSize: 11, color: "#8E9BAE", display: "flex", alignItems: "center", gap: 4 }}>
                  <Clock size={11} /> {formatDate(detail.createdAt as string)}
                </span>
                <span style={{ fontSize: 11, color: "#8E9BAE" }}>{(detail.wordCount as number) || 0} 字</span>
                <span style={{ fontSize: 11, color: "#8E9BAE" }}>来自：{detail.workspaceTitle as string}</span>
              </div>
              <div style={{
                fontSize: 14, lineHeight: 1.9, color: "#2C3E50",
                whiteSpace: "pre-wrap", padding: "24px", borderRadius: 16,
                background: "#F6FCFF", border: "1px solid #E0EBF0"
              }}>
                {detail.content as string}
              </div>
            </>
          ) : loading ? (
            <div style={{ textAlign: "center", padding: 48, color: "#8E9BAE", fontSize: 13 }}>
              <Loader2 size={16} style={{ display: "block", margin: "0 auto 8px", animation: "spin 1s linear infinite" }} />
              加载中...
            </div>
          ) : drafts.length === 0 ? (
            <div style={{ textAlign: "center", padding: 48, color: "#8E9BAE", fontSize: 13 }}>
              {search || formatFilter ? "没有找到匹配的作品" : "还没有作品，去创作中心生成第一篇吧"}
            </div>
          ) : (
            drafts.map((d: Record<string, unknown>) => (
              <button key={d.id as string} onClick={() => openDetail(d)} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                width: "100%", padding: "16px 28px", border: "none", borderBottom: "1px solid #F0F3F6",
                background: "transparent", cursor: "pointer", textAlign: "left",
                transition: "background 0.15s"
              }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#F6FCFF")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 99,
                      background: formatColors[d.format as string] || "#F0F3F6",
                      color: formatTextColors[d.format as string] || "#5B6E76",
                      fontWeight: 500
                    }}>
                      {formatLabels[d.format as string] || d.format as string}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: "#051A24", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 250 }}>
                      {d.title as string || "无标题"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 11, color: "#8E9BAE" }}>{d.workspaceTitle as string}</span>
                    <span style={{ fontSize: 10, color: "#B8CDD5" }}>·</span>
                    <span style={{ fontSize: 11, color: "#8E9BAE", display: "flex", alignItems: "center", gap: 3 }}>
                      <FileText size={10} /> {(d.wordCount as number) || 0} 字
                    </span>
                    <span style={{ fontSize: 10, color: "#B8CDD5" }}>·</span>
                    <span style={{ fontSize: 11, color: "#B8CDD5", display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={10} /> {formatDate(d.createdAt as string)}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: "#B8CDD5", marginLeft: 12 }}>
                  {formatDate(d.updatedAt as string)}
                </span>
                <button
                  onClick={(e) => handleDelete(d.id as string, e)}
                  title="删除"
                  style={{
                    padding: "6px", borderRadius: 8, border: "none",
                    background: "transparent", cursor: "pointer",
                    color: "#B8CDD5", marginLeft: 4,
                    transition: "all 0.15s", opacity: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                    e.currentTarget.style.color = "#e74c3c";
                    e.currentTarget.style.background = "#FEF0F0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0";
                    e.currentTarget.style.color = "#B8CDD5";
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
