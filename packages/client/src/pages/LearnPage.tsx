import { useState, useEffect, useRef } from "react";
import { BookOpen, Brain, FileText, Loader2, Sparkles, Check, X, RotateCcw, Trophy, Zap, Plus, Library, Layers, BookX, Trash2, AlertTriangle, Upload, Globe, Clipboard } from "lucide-react";

const API = "/api";
type Tab = "input" | "concepts" | "exam" | "wrongbook" | "result";
type KB = { id: string; name: string; description: string; icon: string; sourceCount: number; conceptCount: number };

export function LearnContent() {
  const [tab, setTab] = useState<Tab>("input");
  const [kbs, setKbs] = useState<KB[]>([]);
  const [activeKbId, setActiveKbId] = useState("");
  const [showNewKb, setShowNewKb] = useState(false);
  const [showDeleteKb, setShowDeleteKb] = useState(false);
  const [connError, setConnError] = useState("");

  const loadKbs = async () => {
    try { const r = await fetch(API + "/kb"); const d = await r.json(); if (d.data) setKbs(d.data); } catch {}
  };
  useEffect(() => { loadKbs(); }, []);
  // Health check on mount
  useEffect(() => {
    fetch(API + "/health").then(r => r.json()).then(d => {
      if (d.status !== "ok") setConnError("后端服务异常，请检查服务器是否启动");
    }).catch(() => setConnError("无法连接到后端服务，请确认服务器已启动在 localhost:3000"));
  }, []);

  const activeKb = kbs.find(k => k.id === activeKbId);

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <select value={activeKbId} onChange={e => setActiveKbId(e.target.value)} className="text-sm bg-[#F0F3F6] border-none rounded-xl px-4 py-2 text-[#2C3E50] outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 min-w-[200px]">
          <option value="">-- 选择知识库 --</option>
          {kbs.map(kb => <option key={kb.id} value={kb.id}>{kb.icon} {kb.name} ({kb.conceptCount}知识点)</option>)}
        </select>
        <button onClick={() => setShowNewKb(true)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-[#E8EDF2] text-[#6C5CE7] hover:bg-[#F8F6FF]"><Plus size={14}/>新建知识库</button>
        {activeKb && <button onClick={() => setShowDeleteKb(true)} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-white border border-red-200 text-red-400 hover:bg-red-50"><Trash2 size={14}/>删除</button>}
        {activeKb && <span className="text-xs text-[#8E9BAE] ml-auto">{activeKb.icon} {activeKb.name} · {activeKb.conceptCount}知识点</span>}
      </div>
      {showNewKb && <NewKbModal onClose={() => setShowNewKb(false)} onCreated={(kb: KB) => { setKbs(prev => [kb, ...prev]); setActiveKbId(kb.id); setShowNewKb(false); }} />}
      {showDeleteKb && <DeleteKbModal kbName={activeKb?.name||""} kbId={activeKbId} onClose={() => setShowDeleteKb(false)} onDeleted={() => { setActiveKbId(""); setShowDeleteKb(false); loadKbs(); }} />}

      {!activeKbId ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-[#F0F3F6] flex items-center justify-center mx-auto mb-4"><Library size={28} className="text-[#B8C5D0]"/></div>
          <p className="text-sm text-[#8E9BAE] mb-4">选择或创建一个知识库开始</p>
          <button onClick={() => setShowNewKb(true)} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1]"><Plus size={16}/>新建知识库</button>
        </div>
      ) : (
        <>
          <div className="flex gap-1 bg-[#E8EDF2] p-1 rounded-2xl mb-6 w-fit">
            {[{k:"input",i:<FileText size={15}/>,l:"输入资料"},{k:"concepts",i:<Layers size={15}/>,l:"知识点"},{k:"exam",i:<Brain size={15}/>,l:"考试"},{k:"wrongbook",i:<BookX size={15}/>,l:"错题本"},{k:"result",i:<Trophy size={15}/>,l:"记录"}].map(t => (
              <button key={t.k} onClick={() => setTab(t.k as Tab)} className={"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all " + (tab===t.k?"bg-white text-[#2C3E50] shadow-sm":"text-[#8E9BAE] hover:text-[#2C3E50]")}>{t.i}{t.l}</button>
            ))}
          </div>
          {tab==="input"&&<InputTab kbId={activeKbId} onDone={()=>setTab("concepts")}/>}
          {tab==="concepts"&&<ConceptsTab kbId={activeKbId} onExam={()=>setTab("exam")}/>}
          {tab==="exam"&&<ExamTab kbId={activeKbId} onDone={()=>setTab("result")}/>}
          {tab==="wrongbook"&&<WrongBookTab kbId={activeKbId}/>}
          {tab==="result"&&<ResultTab kbId={activeKbId}/>}
          {connError&&<div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm flex items-center gap-2"><AlertTriangle size={16}/>{connError}</div>}
        </>
      )}
    </div>
  );
}

function NewKbModal({ onClose, onCreated }: { onClose: () => void; onCreated: (kb: KB) => void }) {
  const [name, setName] = useState(""); const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("📚"); const [loading, setLoading] = useState(false);
  const icons = ["📚","📷","🧠","🎨","💻","🔬","📖","🎵","🌍","⚡","💡","🏛️"];
  const h = async () => { if(!name.trim()||loading)return; setLoading(true);
    try{const r=await fetch(API+"/kb",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name.trim(),description:desc.trim(),icon})});const d=await r.json();if(d.success)onCreated(d.data);}catch{}setLoading(false);};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl" onClick={e=>e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-[#2C3E50] mb-6">新建知识库</h3>
        <div className="flex gap-2 mb-4 flex-wrap">{icons.map(i=><button key={i} onClick={()=>setIcon(i)} className={"w-10 h-10 rounded-xl text-lg flex items-center justify-center "+(icon===i?"bg-[#F0EFFF] ring-2 ring-[#6C5CE7]":"bg-[#F0F3F6] hover:bg-[#E8EDF2]")}>{i}</button>)}</div>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="名称" className="w-full px-4 py-3 rounded-xl bg-[#F0F3F6] text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 mb-3" onKeyDown={e=>e.key==="Enter"&&h()}/>
        <input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="描述（可选）" className="w-full px-4 py-3 rounded-xl bg-[#F0F3F6] text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 mb-6"/>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-[#E8EDF2] text-sm text-[#8E9BAE] hover:bg-[#F0F3F6]">取消</button><button onClick={h} disabled={loading||!name.trim()} className="flex-1 px-4 py-3 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-40">{loading?"...":"创建"}</button></div>
      </div>
    </div>
  );
}

function DeleteKbModal({ kbName, kbId, onClose, onDeleted }: { kbName: string; kbId: string; onClose: () => void; onDeleted: () => void }) {
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false);
  const confirmed = input === "确认删除";
  const h = async () => { if(!confirmed||loading)return; setLoading(true);
    try{await fetch(API+"/kb/"+kbId,{method:"DELETE"});onDeleted();}catch{}setLoading(false);};
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-xl" onClick={e=>e.stopPropagation()}>
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><AlertTriangle size={22} className="text-red-400"/></div>
        <h3 className="text-lg font-semibold text-[#2C3E50] mb-2">删除知识库</h3>
        <p className="text-sm text-[#8E9BAE] mb-1">确定删除 <b>{kbName}</b>？所有资料、题库、考试记录将被永久删除。</p>
        <p className="text-xs text-red-400 mb-4">请输入 <b>确认删除</b> 以继续</p>
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="确认删除" className="w-full px-4 py-3 rounded-xl bg-[#F0F3F6] text-sm outline-none focus:ring-2 focus:ring-red-400/20 mb-6"/>
        <div className="flex gap-3"><button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-[#E8EDF2] text-sm text-[#8E9BAE]">取消</button><button onClick={h} disabled={!confirmed||loading} className={"flex-1 px-4 py-3 rounded-xl text-white text-sm font-medium "+(confirmed?"bg-red-500 hover:bg-red-600":"bg-[#E8EDF2] text-[#B8C5D0] cursor-not-allowed")}>{loading?"...":"确认删除"}</button></div>
      </div>
    </div>
  );
}

function InputTab({ kbId, onDone }: { kbId: string; onDone: () => void }) {
  const [mode, setMode] = useState<"text" | "file" | "url">("text");
  const [title, setTitle] = useState(""); const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false); const [result, setResult] = useState<any>(null); const [error, setError] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sources, setSources] = useState<any[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Load sources on mount
  useEffect(() => { loadSources(); }, [kbId]);
  
  const loadSources = async () => {
    setSourcesLoading(true);
    try {
      const r = await fetch(API + "/learn/sources?kbId=" + kbId);
      const d = await r.json();
      if (d.data) setSources(d.data);
    } catch {} finally { setSourcesLoading(false); }
  };

  // Text extraction (existing)
  const handleTextExtract = async () => {
    if(!content.trim()||loading)return; setLoading(true);setError("");setResult(null);
    try{
      const r=await fetch(API+"/learn/extract",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({knowledgeBaseId:kbId,title:title||"未命名资料",content})});
      const d=await r.json();
      if(d.success){setResult(d.data);onDone();loadSources();}else setError(d.error||"提取失败");
    }catch(e){console.error("fetch failed:",e);setError("网络错误: "+(e instanceof Error?e.message:String(e)).slice(0,80));}setLoading(false);
  };

  // File upload
  const handleFileUpload = async () => {
    if(!file||loading)return; setLoading(true);setError("");setResult(null);
    try{
      const fd = new FormData();
      fd.append("file", file); fd.append("knowledgeBaseId", kbId);
      const r=await fetch(API+"/learn/upload",{method:"POST",body:fd});
      const d=await r.json();
      if(d.success){
        // Now extract from this source
        const sourceId = d.data.sourceId;
        const r2 = await fetch(API+"/learn/extract",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({knowledgeBaseId:kbId,sourceId,title:file.name,content:d.data.rawContent || ""})});
        const d2=await r2.json();
        if(d2.success){setResult(d2.data);onDone();loadSources();}else setError(d2.error||"提取失败");
      }else setError(d.error||"上传失败");
    }catch(e){console.error("fetch failed:",e);setError("网络错误: "+(e instanceof Error?e.message:String(e)).slice(0,80));}setLoading(false);
  };

  // URL fetch
  const handleUrlFetch = async () => {
    if(!url.trim()||loading)return; setLoading(true);setError("");setResult(null);
    try{
      const r=await fetch(API+"/learn/fetch-url",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({knowledgeBaseId:kbId,url:url.trim()})});
      const d=await r.json();
      if(d.success){
        setResult({sourceId:d.data.sourceId,title:d.data.title,summary:d.data.summary,charCount:d.data.charCount});
        loadSources();
        // Auto-extract from URL content
        const r2 = await fetch(API+"/learn/extract",{method:"POST",headers:{"Content-Type":"application/json"},
          body:JSON.stringify({knowledgeBaseId:kbId,sourceId:d.data.sourceId,title:d.data.title,content:d.data.rawContent || ""})});
        const d2=await r2.json();
        if(d2.success){setResult(d2.data);onDone();loadSources();}else setError(d2.error||"提取失败");
      }else setError(d.error||"抓取失败");
    }catch(e){console.error("fetch failed:",e);setError("网络错误: "+(e instanceof Error?e.message:String(e)).slice(0,80));}setLoading(false);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return (d.getMonth()+1)+"/"+d.getDate();
  };

  return (
    <div>
      {/* 资料列表 */}
      {sources.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-medium text-[#8E9BAE] uppercase tracking-wider mb-3">已有资料 ({sources.length})</h3>
          <div className="flex flex-col gap-2">
            {sources.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-[#E8EDF2]">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs px-2 py-0.5 rounded-lg font-medium shrink-0"
                    style={{background:(s.type==="url"?"#E3F2FD":s.type==="pdf"?"#FEF0F0":s.type==="txt"?"#F3E5F5":"#F0F3F6"),color:(s.type==="url"?"#1565C0":s.type==="pdf"?"#C62828":s.type==="txt"?"#7B1FA2":"#8E9BAE")}}>
                    {s.type === "url" ? "网页" : s.type === "pdf" ? "PDF" : s.type === "txt" ? "TXT" : s.type}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm text-[#2C3E50] font-medium truncate">{s.title}</div>
                    {s.summary && <div className="text-xs text-[#8E9BAE] truncate">{s.summary}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className="text-[10px] text-[#B8C5D0]">{s.conceptCount}知识点</span>
                  <span className="text-[10px] text-[#B8C5D0]">{formatDate(s.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 输入模式切换 */}
      <div className="flex gap-1 bg-[#E8EDF2] p-1 rounded-xl mb-4 w-fit">
        {[{k:"text",i:<Clipboard size={14}/>,l:"文本"},{k:"file",i:<Upload size={14}/>,l:"文件"},{k:"url",i:<Globe size={14}/>,l:"网页"}].map(t=>(
          <button key={t.k} onClick={()=>{setMode(t.k as any);setError("");setResult(null)}}
            className={"flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-medium transition-all "+
              (mode===t.k?"bg-white text-[#2C3E50] shadow-sm":"text-[#8E9BAE] hover:text-[#2C3E50]")}>
            {t.i}{t.l}
          </button>
        ))}
      </div>

      {/* 文本输入 */}
      {mode === "text" && (
        <div className="bg-white rounded-2xl border border-[#E8EDF2] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[#2C3E50] mb-4 flex items-center gap-2"><Clipboard size={16} className="text-[#6C5CE7]"/>粘贴文本资料</h3>
          <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="资料标题（可选）" className="w-full px-4 py-3 rounded-xl bg-[#F0F3F6] text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 mb-3"/>
          <textarea value={content} onChange={e=>setContent(e.target.value)} placeholder="粘贴学习资料内容（至少50字）..." rows={10} className="w-full px-4 py-3 rounded-xl bg-[#F0F3F6] text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 resize-y min-h-[160px]"/>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-[#8E9BAE]">{content.length} 字</span>
            <button onClick={handleTextExtract} disabled={loading||content.length<50}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-40">
              {loading?<Loader2 size={16} className="animate-spin"/>:<Sparkles size={16}/>}提取知识点并生成题库</button>
          </div>
        </div>
      )}

      {/* 文件上传 */}
      {mode === "file" && (
        <div className="bg-white rounded-2xl border border-[#E8EDF2] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[#2C3E50] mb-4 flex items-center gap-2"><Upload size={16} className="text-[#6C5CE7]"/>上传文件资料</h3>
          <p className="text-xs text-[#8E9BAE] mb-4">支持 PDF、TXT、Markdown、CSV 格式</p>
          <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.csv,.json" onChange={e=>{const f=e.target.files?.[0];if(f)setFile(f)}}
            className="hidden"/>
          <div onClick={()=>fileRef.current?.click()}
            className="border-2 border-dashed border-[#DDE4EA] rounded-2xl p-10 text-center cursor-pointer hover:border-[#6C5CE7] hover:bg-[#F8F6FF] transition-all mb-4">
            <Upload size={28} className="text-[#B8C5D0] mx-auto mb-3"/>
            {file ? (
              <div>
                <p className="text-sm text-[#2C3E50] font-medium">{file.name}</p>
                <p className="text-xs text-[#8E9BAE] mt-1">{(file.size/1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#8E9BAE]">点击选择文件</p>
                <p className="text-xs text-[#B8C5D0] mt-1">或拖拽到此处</p>
              </div>
            )}
          </div>
          <button onClick={handleFileUpload} disabled={loading||!file}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-40 w-full justify-center">
            {loading?<Loader2 size={16} className="animate-spin"/>:<Sparkles size={16}/>}上传并提取知识点</button>
        </div>
      )}

      {/* URL 抓取 */}
      {mode === "url" && (
        <div className="bg-white rounded-2xl border border-[#E8EDF2] p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-[#2C3E50] mb-4 flex items-center gap-2"><Globe size={16} className="text-[#6C5CE7]"/>抓取网页内容</h3>
          <input value={url} onChange={e=>setUrl(e.target.value)} placeholder="粘贴网页链接 https://..."
            className="w-full px-4 py-3 rounded-xl bg-[#F0F3F6] text-sm outline-none focus:ring-2 focus:ring-[#6C5CE7]/20 mb-4"
            onKeyDown={e=>e.key==="Enter"&&handleUrlFetch()}/>
          <button onClick={handleUrlFetch} disabled={loading||!url.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-40 w-full justify-center">
            {loading?<Loader2 size={16} className="animate-spin"/>:<Globe size={16}/>}抓取并提取知识点</button>
        </div>
      )}

      {error&&<p className="mt-3 text-sm text-red-500 flex items-center gap-1"><X size={14}/>{error}</p>}

      {result&&<div className="mt-6 bg-white rounded-2xl border border-[#E8EDF2] p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-[#2C3E50] mb-4 flex items-center gap-2"><Check size={16} className="text-green-500"/>提取完成</h3>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-[#F0F3F6] rounded-xl p-4 text-center"><div className="text-2xl font-bold text-[#6C5CE7]">{result.totalExtracted}</div><div className="text-xs text-[#8E9BAE] mt-1">知识点</div></div>
          <div className="bg-[#F0F3F6] rounded-xl p-4 text-center"><div className="text-2xl font-bold text-green-500">{result.questionsGenerated}</div><div className="text-xs text-[#8E9BAE] mt-1">题库生成</div></div>
          <div className="bg-[#F0F3F6] rounded-xl p-4 text-center"><div className="text-2xl font-bold text-orange-400">{result.questionsRejected||0}</div><div className="text-xs text-[#8E9BAE] mt-1">过滤不合格</div></div>
        </div>
        <div className="space-y-2">{result.concepts?.map((c:any)=><div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-[#F8FAFB] border border-[#E8EDF2]"><span className="text-xs px-2 py-0.5 rounded-lg bg-[#F0EFFF] text-[#6C5CE7] font-medium mt-0.5">{c.category}</span><div><div className="text-sm font-medium text-[#2C3E50]">{c.title}</div><div className="text-xs text-[#8E9BAE] mt-0.5">{c.content.slice(0,100)}</div></div></div>)}</div>
      </div>}
    </div>
  );
}

function ConceptsTab({ kbId, onExam }: { kbId: string; onExam: () => void }) {
  const [concepts, setConcepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  
  useEffect(()=>{
    fetch(API+"/learn/concepts?kbId="+kbId)
      .then(r=>r.json())
      .then(d=>{if(d.data)setConcepts(d.data);setLoading(false);});
  },[kbId]);
  
  if(loading) return (
    <div className="flex items-center gap-2 text-sm text-[#8E9BAE] py-8">
      <Loader2 size={16} className="animate-spin"/>加载中...
    </div>
  );
  
  if(concepts.length===0) return (
    <div className="text-center py-16">
      <BookOpen size={40} className="text-[#B8C5D0] mx-auto mb-4"/>
      <p className="text-[#8E9BAE] text-sm">还没有知识点，请先输入学习资料</p>
    </div>
  );
  
  const avg = Math.round(concepts.reduce((s:number,c:any)=>s+(c.mastery||0),0)/concepts.length*100);
  
  const getMasteryColor = (m: number) => {
    if (m >= 0.8) return { bg: "#ECFDF5", text: "#059669", ring: "#A7F3D0" };
    if (m >= 0.5) return { bg: "#FFFBEB", text: "#D97706", ring: "#FDE68A" };
    return { bg: "#F8FAFC", text: "#94A3B8", ring: "#E2E8F0" };
  };
  
  const getMasteryLabel = (m: number) => {
    if (m >= 0.8) return "熟练掌握";
    if (m >= 0.5) return "学习中";
    return "待学习";
  };
  
  return (<div>
    {/* 顶部统计栏 */}
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "20px 24px", marginBottom: 24,
      background: "linear-gradient(135deg, #F8F6FF 0%, #F0EFFF 100%)",
      borderRadius: 20, border: "1px solid #E8E0FF"
    }}>
      <div>
        <div style={{ fontSize: 13, color: "#8E9BAE", marginBottom: 4 }}>知识点掌握</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: "#2C3E50", fontFamily: "'PP Mondwest', Georgia, serif" }}>{avg}%</span>
          <span style={{ fontSize: 13, color: "#8E9BAE" }}>共 {concepts.length} 个知识点</span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}><button onClick={async()=>{setLoading(true);try{const r=await fetch(API+"/learn/regenerate-questions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({knowledgeBaseId:kbId})});const d=await r.json();if(d.success)alert("已补全 "+d.data.totalQuestions+" 道题目");else alert(d.error);}catch{}setRegenerating(false);}} disabled={regenerating} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"12px 20px",borderRadius:99,border:"1px solid #E8EDF2",background:"#fff",color:"#5B6E76",fontSize:14,fontWeight:500,cursor:"pointer"}}>{regenerating?<Loader2 size={16} className="animate-spin"/>:<Zap size={16}/>}补全题库</button><button onClick={onExam} style={{
        display: "inline-flex", alignItems: "center", gap: 8,
        padding: "12px 24px", borderRadius: 99, border: "none",
        background: "#6C5CE7", color: "#fff", fontSize: 14, fontWeight: 500,
        cursor: "pointer", boxShadow: "0 4px 14px rgba(108,92,231,0.3)"
      }}>
        <Brain size={16}/>开始考试
      </button></div>
    </div>
    
    {/* 卡片网格 */}
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
      gap: 16
    }}>
      {concepts.map((c: any) => {
        const mc = getMasteryColor(c.mastery || 0);
        return (
          <button
            key={c.id}
            onClick={() => setSelected(c)}
            style={{
              textAlign: "left", border: "none", cursor: "pointer",
              padding: 0, background: "none", width: "100%"
            }}
          >
            <div style={{
              background: "#fff",
              borderRadius: 20,
              border: "1px solid #E8EDF2",
              padding: "24px 20px 20px",
              height: "100%",
              transition: "all 0.2s ease",
              position: "relative",
              overflow: "hidden"
            }}
            className="hover:shadow-lg hover:border-[#6C5CE7]/20 hover:-translate-y-0.5"
            >
              {/* 掌握度指示条 */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: mc.ring,
              }}>
                <div style={{
                  height: "100%", background: mc.text,
                  width: Math.round((c.mastery||0)*100) + "%",
                  transition: "width 0.5s ease"
                }}/>
              </div>
              
              {/* 分类标签 */}
              {c.category && (
                <span style={{
                  display: "inline-block",
                  padding: "3px 10px", borderRadius: 99,
                  background: "#F0F3F6", fontSize: 11,
                  color: "#8E9BAE", marginBottom: 14,
                  letterSpacing: "0.02em"
                }}>
                  {c.category}
                </span>
              )}
              
              {/* 标题 */}
              <h4 style={{
                fontSize: 16, fontWeight: 600, color: "#1E293B",
                margin: "0 0 10px", lineHeight: 1.4,
                fontFamily: "'PP Neue Montreal', -apple-system, sans-serif"
              }}>
                {c.title}
              </h4>
              
              {/* 底部信息 */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginTop: 16, paddingTop: 16,
                borderTop: "1px solid #F1F5F9"
              }}>
                <span style={{
                  fontSize: 11, color: mc.text,
                  background: mc.bg, padding: "3px 10px",
                  borderRadius: 99, fontWeight: 500
                }}>
                  {getMasteryLabel(c.mastery||0)}
                </span>
                <div style={{ display: "flex", gap: 12 }}>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>
                    {c.bankSize||0} 题
                  </span>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>
                    {c.examCount||0} 次
                  </span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
    
    {/* 详情弹窗 */}
    {selected && <ConceptDetail concept={selected} onClose={() => setSelected(null)} />}
  </div>);
}


function ConceptDetail({ concept, onClose }: { concept: any; onClose: () => void }) {
  const mastery = concept.mastery || 0;
  const masteryPct = Math.round(mastery * 100);
  
  const getMasteryColor = (m: number) => {
    if (m >= 0.8) return { bg: "#ECFDF5", text: "#059669", ring: "#A7F3D0", label: "熟练掌握" };
    if (m >= 0.5) return { bg: "#FFFBEB", text: "#D97706", ring: "#FDE68A", label: "学习中" };
    return { bg: "#F8FAFC", text: "#94A3B8", ring: "#E2E8F0", label: "待学习" };
  };
  const mc = getMasteryColor(mastery);
  
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(15,23,42,0.3)", backdropFilter: "blur(4px)",
      padding: "24px"
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: 28,
        maxWidth: 640, width: "100%", maxHeight: "85vh",
        overflow: "auto", boxShadow: "0 25px 60px rgba(0,0,0,0.12)"
      }} onClick={e => e.stopPropagation()}>
        {/* 顶部色条 */}
        <div style={{
          height: 6, background: mc.text, borderRadius: "28px 28px 0 0"
        }}/>
        
        <div style={{ padding: "36px 32px 32px" }}>
          {/* 关闭按钮 */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
            <button onClick={onClose} style={{
              width: 36, height: 36, borderRadius: "50%", border: "1px solid #E8EDF2",
              background: "#fff", cursor: "pointer", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 18, color: "#94A3B8", transition: "all 0.15s"
            }}>×</button>
          </div>
          
          {/* 分类 + 掌握度 */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            {concept.category && (
              <span style={{
                padding: "4px 12px", borderRadius: 99,
                background: "#F0F3F6", fontSize: 12,
                color: "#64748B", letterSpacing: "0.02em"
              }}>
                {concept.category}
              </span>
            )}
            <span style={{
              padding: "4px 12px", borderRadius: 99,
              background: mc.bg, fontSize: 12,
              color: mc.text, fontWeight: 500
            }}>
              {mc.label} · {masteryPct}%
            </span>
          </div>
          
          {/* 标题 */}
          <h2 style={{
            fontFamily: "'PP Mondwest', Georgia, serif",
            fontSize: 28, fontWeight: 600,
            color: "#0F172A", lineHeight: 1.2,
            margin: "0 0 24px", letterSpacing: "-0.01em"
          }}>
            {concept.title}
          </h2>
          
          {/* 分隔线 */}
          <div style={{ height: 1, background: "#F1F5F9", marginBottom: 24 }}/>
          
          {/* 正文内容 */}
          <div style={{
            fontSize: 15, lineHeight: 1.85, color: "#334155",
            letterSpacing: "0.01em",
            fontFamily: "'PP Neue Montreal', -apple-system, sans-serif"
          }}>
            {concept.content?.split("\n").map((p: string, i: number) => (
              <p key={i} style={{ marginBottom: 16 }}>{p}</p>
            ))}
          </div>
          
          {/* 统计信息 */}
          <div style={{
            display: "flex", gap: 24, marginTop: 32, paddingTop: 24,
            borderTop: "1px solid #F1F5F9"
          }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#1E293B", fontFamily: "'PP Mondwest', Georgia, serif" }}>
                {concept.bankSize || 0}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>题库数量</div>
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: "#1E293B", fontFamily: "'PP Mondwest', Georgia, serif" }}>
                {concept.examCount || 0}
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>练习次数</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamTab({ kbId, onDone }: { kbId: string; onDone: () => void }) {
  const [difficulty,setDifficulty]=useState("easy");const [qc,setQc]=useState(10);
  const [exam,setExam]=useState<any>(null);const [answers,setAnswers]=useState<Record<string,string>>({});
  const [submitted,setSubmitted]=useState(false);const [result,setResult]=useState<any>(null);const [loading,setLoading]=useState(false);
  const gen=async()=>{setLoading(true);setExam(null);setAnswers({});setSubmitted(false);setResult(null);
    try{const r=await fetch(API+"/learn/exam/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({knowledgeBaseId:kbId,difficulty,questionCount:qc,conceptIds:[]})});const d=await r.json();if(d.success)setExam(d.data);else alert(d.error);}catch{}setLoading(false);};
  const submit=async()=>{if(!exam||submitted)return;setLoading(true);
    const arr=exam.questions.map((q:any)=>({questionId:q.id,answer:answers[q.id]||""}));
    try{const r=await fetch(API+"/learn/exam/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({examId:exam.examId,answers:arr})});const d=await r.json();if(d.success){setResult(d.data);setSubmitted(true);onDone();}}catch{}setLoading(false);};
  if(!exam)return(<div className="bg-white rounded-2xl border border-[#E8EDF2] p-8 shadow-sm max-w-lg mx-auto text-center">
    <Brain size={40} className="text-[#B8C5D0] mx-auto mb-4"/><h3 className="text-lg font-semibold text-[#2C3E50] mb-2">准备考试</h3><p className="text-sm text-[#8E9BAE] mb-6">从题库中秒取题目</p>
    <div className="flex gap-3 justify-center mb-6">{[{k:"easy",l:"轻松 60分"},{k:"hard",l:"严格 90分"},{k:"perfect",l:"完美 100分"}].map(m=><button key={m.k} onClick={()=>setDifficulty(m.k)} className={"flex-1 p-4 rounded-2xl text-sm font-medium transition-all "+(difficulty===m.k?"bg-[#F0EFFF] ring-2 ring-[#6C5CE7] text-[#6C5CE7]":"bg-[#F0F3F6] text-[#8E9BAE] hover:bg-[#E8EDF2]")}><div>{m.l}</div></button>)}</div>
    <label className="text-xs text-[#8E9BAE] mb-2 block">题目数量: <b className="text-[#2C3E50]">{qc}</b></label>
    <input type="range" min={3} max={30} value={qc} onChange={e=>setQc(Number(e.target.value))} className="w-full mb-6"/>
    <button onClick={gen} disabled={loading} className="px-8 py-3 rounded-2xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-40 flex items-center gap-2 mx-auto">{loading?<Loader2 size={16} className="animate-spin"/>:<Zap size={16}/>}开始考试</button>
  </div>);
  if(submitted&&result)return(<div className="bg-white rounded-2xl border border-[#E8EDF2] p-8 shadow-sm max-w-2xl mx-auto">
    <div className="text-center mb-6"><div className={"text-4xl font-bold mb-2 "+(result.passed?"text-green-500":"text-red-400")}>{result.score} 分</div><div className="text-sm text-[#8E9BAE]">{result.correctCount}/{result.totalQuestions} 正确·{result.difficulty}·{result.passed?"✅通过":"❌未通过"}</div></div>
    {result.weakConcepts?.length>0&&<div className="bg-amber-50 rounded-xl p-4 mb-6 text-sm text-amber-700">薄弱知识点：{result.weakConcepts.join("、")}</div>}
    <div className="space-y-3">{result.items?.map((item:any,i:number)=><div key={i} className={"p-4 rounded-xl border "+(item.isCorrect?"bg-green-50/50 border-green-100":"bg-red-50/50 border-red-100")}><div className="flex items-start gap-2"><span className="mt-0.5">{item.isCorrect?<Check size={16} className="text-green-500"/>:<X size={16} className="text-red-400"/>}</span><div className="flex-1"><div className="text-sm font-medium text-[#2C3E50]">[{item.type==="choice"?"单选":item.type==="truefalse"?"判断":"多选"}] {item.stem}</div><div className="text-xs mt-1"><span className="text-[#8E9BAE]">你的答案：</span><span className={item.isCorrect?"text-green-600":"text-red-500"}>{item.userAnswer||"未答"}</span></div>{!item.isCorrect&&<div className="text-xs mt-0.5"><span className="text-[#8E9BAE]">正确答案：</span><span className="text-green-600">{item.correctAnswer}</span></div>}<div className="text-xs text-[#8E9BAE] mt-1 italic">{item.explanation}</div></div></div></div>)}</div>
    <div className="flex gap-3 mt-6"><button onClick={()=>{setExam(null);setSubmitted(false);setResult(null);}} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#E8EDF2] text-sm text-[#8E9BAE] hover:bg-[#F0F3F6]"><RotateCcw size={14}/>重新考试</button><button onClick={onDone} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1]"><Trophy size={14}/>查看记录</button></div>
  </div>);
  return(<div className="max-w-2xl mx-auto"><div className="flex items-center justify-between mb-6"><h3 className="text-sm font-semibold text-[#2C3E50]">{exam.title}</h3><span className="text-xs text-[#8E9BAE]">{exam.questionCount} 题</span></div>
    <div className="space-y-4">{exam.questions.map((q:any,i:number)=><div key={q.id} className="bg-white rounded-2xl border border-[#E8EDF2] p-5 shadow-sm"><div className="flex items-start gap-2 mb-3"><span className="text-xs px-2 py-0.5 rounded-lg bg-[#F0F3F6] text-[#8E9BAE] font-medium mt-0.5">{q.type==="choice"?"单选":q.type==="truefalse"?"判断":"多选"}</span><span className="text-sm font-medium text-[#2C3E50]">{i+1}. {q.stem}</span></div>
      {q.type==="truefalse"?<div className="flex gap-3">{["true","false"].map(v=><button key={v} onClick={()=>setAnswers(prev=>({...prev,[q.id]:v}))} className={"flex-1 px-4 py-3 rounded-xl text-sm font-medium transition-all "+(answers[q.id]===v?"bg-[#F0EFFF] ring-2 ring-[#6C5CE7] text-[#6C5CE7]":"bg-[#F0F3F6] text-[#8E9BAE] hover:bg-[#E8EDF2]")}>{v==="true"?"✓ 正确":"✗ 错误"}</button>)}</div>
      :<div className="space-y-2">{q.options?.map((opt:string,oi:number)=>{const label=String.fromCharCode(65+oi);const sel=q.type==="multi_choice"?(answers[q.id]||"").split(",").map((s:string)=>s.trim()).includes(label):answers[q.id]===label;
        return<button key={oi} onClick={()=>{if(q.type==="multi_choice"){const cur=(answers[q.id]||"").split(",").map((s:string)=>s.trim()).filter(Boolean);const idx=cur.indexOf(label);if(idx>=0)cur.splice(idx,1);else cur.push(label);setAnswers(prev=>({...prev,[q.id]:cur.join(",")}));}else setAnswers(prev=>({...prev,[q.id]:label}));}} className={"w-full text-left px-4 py-3 rounded-xl text-sm transition-all "+(sel?"bg-[#F0EFFF] ring-2 ring-[#6C5CE7] text-[#6C5CE7] font-medium":"bg-[#F0F3F6] text-[#2C3E50] hover:bg-[#E8EDF2]")}><span className="text-xs font-bold mr-2 text-[#8E9BAE]">{label}</span>{opt}</button>;})}</div>}
    </div>)}</div>
    <button onClick={submit} disabled={loading||Object.keys(answers).length<exam.questions.length} className="mt-6 w-full py-3.5 rounded-2xl bg-[#6C5CE7] text-white text-sm font-medium hover:bg-[#5A4BD1] disabled:opacity-40 flex items-center justify-center gap-2">{loading?<Loader2 size={16} className="animate-spin"/>:<Check size={16}/>}{Object.keys(answers).length}/{exam.questions.length} 已答·提交批改</button>
  </div>);
}

function WrongBookTab({ kbId }: { kbId: string }) {
  const [wrongQs,setWrongQs]=useState<any[]>([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{fetch(API+"/learn/wrong-questions?kbId="+kbId).then(r=>r.json()).then(d=>{if(d.data)setWrongQs(d.data);setLoading(false);});},[kbId]);
  if(loading)return<div className="flex items-center gap-2 text-sm text-[#8E9BAE] py-8"><Loader2 size={16} className="animate-spin"/>加载中...</div>;
  if(wrongQs.length===0)return<div className="text-center py-16"><div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4"><Check size={28} className="text-green-400"/></div><p className="text-[#8E9BAE] text-sm">错题本为空，继续保持！</p></div>;
  return(<div><div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-[#2C3E50]">错题本·{wrongQs.length} 题</h3></div>
    <div className="space-y-3">{wrongQs.map((q:any)=><div key={q.id} className="bg-white rounded-2xl border border-[#E8EDF2] p-5 shadow-sm"><div className="flex items-start gap-3"><div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0"><span className="text-red-400 text-xs font-bold">{q.wrongCount}</span></div>
      <div className="flex-1"><div className="flex items-center gap-2 mb-1"><span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[#F0F3F6] text-[#8E9BAE]">{q.type==="choice"?"单选":q.type==="truefalse"?"判断":"多选"}</span><span className="text-[10px] text-[#8E9BAE]">{q.conceptTitle}</span></div>
      <p className="text-sm text-[#2C3E50] font-medium mb-2">{q.stem}</p>
      {q.options&&<div className="flex flex-wrap gap-2 mb-2">{q.options.map((opt:string,oi:number)=>{const label=String.fromCharCode(65+oi);const isCorrect=q.type==="multi_choice"?q.correctAnswer.split(",").map((s:string)=>s.trim()).includes(label):q.correctAnswer===label;return<span key={oi} className={"text-xs px-2.5 py-1 rounded-lg "+(isCorrect?"bg-green-50 text-green-600 font-medium":"bg-[#F0F3F6] text-[#8E9BAE]")}>{label}. {opt}</span>;})}</div>}
      {q.type==="truefalse"&&<div className="flex gap-2 mb-2"><span className={"text-xs px-2.5 py-1 rounded-lg "+(q.correctAnswer==="true"?"bg-green-50 text-green-600 font-medium":"bg-[#F0F3F6] text-[#8E9BAE]")}>✓ 正确</span><span className={"text-xs px-2.5 py-1 rounded-lg "+(q.correctAnswer==="false"?"bg-green-50 text-green-600 font-medium":"bg-[#F0F3F6] text-[#8E9BAE]")}>✗ 错误</span></div>}
      <div className="text-xs text-[#8E9BAE] italic bg-[#F8FAFB] px-3 py-2 rounded-xl">{q.explanation}</div></div></div></div>)}</div>
  </div>);
}

function ResultTab({ kbId }: { kbId: string }) {
  const [exams,setExams]=useState<any[]>([]);const [loading,setLoading]=useState(true);
  useEffect(()=>{fetch(API+"/learn/exams?kbId="+kbId).then(r=>r.json()).then(d=>{if(d.data)setExams(d.data);setLoading(false);});},[kbId]);
  if(loading)return<div className="flex items-center gap-2 text-sm text-[#8E9BAE] py-8"><Loader2 size={16} className="animate-spin"/>加载中...</div>;
  if(exams.length===0)return<div className="text-center py-16"><Trophy size={40} className="text-[#B8C5D0] mx-auto mb-4"/><p className="text-[#8E9BAE] text-sm">还没有考试记录</p></div>;
  return(<div><h3 className="text-sm font-semibold text-[#2C3E50] mb-4">考试记录 ({exams.length})</h3>
    <div className="space-y-2">{exams.map((e:any)=><div key={e.id} className="bg-white rounded-2xl border border-[#E8EDF2] p-4 shadow-sm flex items-center gap-4"><div className={"w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold "+(e.passed?"bg-green-50 text-green-500":"bg-red-50 text-red-400")}>{e.passed?"✓":"✗"}</div><div className="flex-1"><div className="text-sm font-medium text-[#2C3E50]">{e.title}</div><div className="text-xs text-[#8E9BAE]">{e.difficulty}·{e.questions}题·{new Date(e.createdAt).toLocaleDateString("zh-CN")}</div></div><div className="text-right"><div className={"text-lg font-bold "+(e.passed?"text-green-500":"text-red-400")}>{e.score}</div><div className="text-[10px] text-[#8E9BAE]">分</div></div></div>)}</div>
  </div>);
}
