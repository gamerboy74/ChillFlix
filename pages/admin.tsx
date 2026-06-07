import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { NextPageContext } from "next";
import { useRouter } from "next/router";
import Image from "next/image";
import {
  Film, Users, CreditCard, Plus, Trash2, Edit3, ArrowLeft,
  Activity, Search, Sparkles, RefreshCw, X, Check, Globe,
  AlertCircle, Tv, Clapperboard, Download, Zap, Star,
  TrendingUp, BookmarkPlus, ChevronRight, Database, PlayCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Movie {
  id: string; title: string; description: string;
  videoUrl: string; thumbnailUrl: string; genre: string;
  duration: string; onlyOnChillFlix: boolean; type: "movie" | "series";
  seasonsData?: string | null;
}
interface User { id: string; name: string; email: string; createdAt: string; }
interface Stats { totalMovies: number; totalUsers: number; totalMemberships: number; }
interface TmdbResult {
  id: number; media_type: "movie" | "tv";
  title?: string; name?: string;
  overview: string; poster_path: string | null; backdrop_path: string | null;
  release_date?: string; first_air_date?: string;
  vote_average: number; genre_ids: number[];
}

type Tab = "dashboard" | "movies" | "series" | "import" | "scraper" | "domain" | "subscriptions";

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const inputCls =
  "bg-zinc-800/80 border border-zinc-700/60 hover:border-zinc-600 focus:border-red-600 focus:ring-1 focus:ring-red-600/30 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-colors";

const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

// ─── SSR auth guard ───────────────────────────────────────────────────────────

export async function getServerSideProps(context: NextPageContext) {
  const { getServerSession } = await import("next-auth/next");
  const { authOptions } = await import("@/lib/authOptions");
  const session = await getServerSession(context.req as any, context.res as any, authOptions);
  if (!session || !(session.user as any).isAdmin) return { redirect: { destination: "/auth", permanent: false } };
  return { props: {} };
}

// ─────────────────────────────────────────────────────────────────────────────
// AdminPanel
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  // Data
  const [stats, setStats] = useState<Stats>({ totalMovies: 0, totalUsers: 0, totalMemberships: 0 });
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Movies tab
  const [searchQuery, setSearchQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formThumbnailUrl, setFormThumbnailUrl] = useState("");
  const [formGenre, setFormGenre] = useState("Drama");
  const [formDuration, setFormDuration] = useState("");
  const [formOnlyOn, setFormOnlyOn] = useState(false);
  const [formType, setFormType] = useState<"movie" | "series">("movie");
  const [formSeasonsData, setFormSeasonsData] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  // Scraper tab
  const [seedStatus, setSeedStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [scrapeStatus, setScrapeStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [scraperLogs, setScraperLogs] = useState<string[]>([]);
  const [seedLimit, setSeedLimit] = useState(12);
  const [seedForce, setSeedForce] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  // Domain tab
  const [cinevoUrl, setCinevoUrl] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [domainLoading, setDomainLoading] = useState(false);

  // Episodes Manager State
  const [selectedSeries, setSelectedSeries] = useState<Movie | null>(null);
  const [editingEpisode, setEditingEpisode] = useState<any | null>(null);
  const [editEpTitle, setEditEpTitle] = useState("");
  const [editEpVideoUrl, setEditEpVideoUrl] = useState("");
  const [editEpModalOpen, setEditEpModalOpen] = useState(false);
  const [previewEp, setPreviewEp] = useState<any | null>(null);
  const [previewSource, setPreviewSource] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // ── Per-movie resolve ──
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

  const handleResolveStream = async (movieId: string, title: string) => {
    setResolvingId(movieId);
    const toastId = toast.loading(`Searching Cinevo for "${title}"…`);
    try {
      const res = await fetch("/api/admin/resolve-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movieId }),
      });
      const data = await res.json();
      toast.dismiss(toastId);
      if (!res.ok) { toast.error(data.error ?? "Resolve failed"); return; }
      const count = Object.keys(data.sources ?? {}).length;
      if (data.cached) {
        toast.success(`Already resolved (${count} server${count !== 1 ? "s" : ""})`);
      } else {
        toast.success(data.message || `"${title}" resolved successfully!`);
      }
      setResolvedIds((p) => new Set([...p, movieId]));
      fetchData();
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e.message ?? "Resolve failed");
    } finally {
      setResolvingId(null);
    }
  };

  // ── TMDB Import tab ──
  const [tmdbQuery, setTmdbQuery] = useState("");
  const [tmdbType, setTmdbType] = useState<"all" | "movie" | "tv">("all");
  const [tmdbResults, setTmdbResults] = useState<TmdbResult[]>([]);
  const [tmdbSearching, setTmdbSearching] = useState(false);
  const [importingId, setImportingId] = useState<number | null>(null);
  const [importedIds, setImportedIds] = useState<Set<number>>(new Set());
  const [bulkMode, setBulkMode] = useState<"trending" | "popular_movies" | "popular_tv">("trending");
  const [bulkLimit, setBulkLimit] = useState(20);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [tmdbKeyMissing, setTmdbKeyMissing] = useState(false);
  const importLogRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── auto-scroll logs ──
  useEffect(() => { logRef.current?.scrollTo(0, logRef.current.scrollHeight); }, [scraperLogs]);
  useEffect(() => { importLogRef.current?.scrollTo(0, importLogRef.current.scrollHeight); }, [importLog]);

  // ── data fetch ────────────────────────────────────────────────────────────

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sR, mR, subR] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/movies"),
        fetch("/api/admin/subscriptions"),
      ]);
      if (sR.ok) { const d = await sR.json(); setStats(d.stats); setRecentUsers(d.recentUsers); }
      if (mR.ok) setMovies(await mR.json());
      if (subR.ok) setSubscriptions(await subR.json());
    } catch { toast.error("Failed to load panel data"); }
    finally { setLoading(false); }
  };

  const fetchDomain = async () => {
    const r = await fetch("/api/admin/domain").catch(() => null);
    if (r?.ok) { const d = await r.json(); setCinevoUrl(d.url); setEditUrl(d.url); }
  };

  useEffect(() => { fetchData(); fetchDomain(); }, []);

  // Reset selected TV Series episodes manager when switching tabs
  useEffect(() => {
    setSelectedSeries(null);
  }, [activeTab]);

  // ── TMDB search (debounced) ───────────────────────────────────────────────

  const doTmdbSearch = useCallback(async (q: string, type: string) => {
    if (!q.trim()) { setTmdbResults([]); return; }
    setTmdbSearching(true);
    try {
      const res = await fetch(`/api/admin/tmdb/search?q=${encodeURIComponent(q)}&type=${type}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 503) setTmdbKeyMissing(true);
        toast.error(data.error ?? "Search failed");
        return;
      }
      setTmdbKeyMissing(false);
      setTmdbResults(data.results ?? []);
    } catch { toast.error("Search request failed"); }
    finally { setTmdbSearching(false); }
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => doTmdbSearch(tmdbQuery, tmdbType), 450);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [tmdbQuery, tmdbType, doTmdbSearch]);

  // ── Import single movie ───────────────────────────────────────────────────

  const handleImport = async (item: TmdbResult) => {
    const type = item.media_type;
    setImportingId(item.id);
    try {
      const res = await fetch("/api/admin/tmdb/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tmdbId: item.id, type }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error(`"${item.title ?? item.name}" already in database`);
        setImportedIds((p) => new Set([...p, item.id]));
        return;
      }
      if (!res.ok) { toast.error(data.error ?? "Import failed"); return; }
      toast.success(`"${data.movie.title}" added! Run Resolve Streams to cache embed URLs.`);
      setImportedIds((p) => new Set([...p, item.id]));
      setStats((p) => ({ ...p, totalMovies: p.totalMovies + 1 }));
      setMovies((p) => [data.movie, ...p]);
    } catch { toast.error("Import failed"); }
    finally { setImportingId(null); }
  };

  // ── Bulk import ───────────────────────────────────────────────────────────

  const handleBulkImport = async () => {
    setBulkRunning(true);
    setImportLog([]);
    const addLog = (msg: string) => setImportLog((p) => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    addLog(`🚀 Starting bulk import — mode: ${bulkMode}, limit: ${bulkLimit}`);
    addLog("📡 Fetching TMDB metadata...");
    try {
      const res = await fetch(`/api/admin/tmdb/import?mode=${bulkMode}&limit=${bulkLimit}`);
      const data = await res.json();
      if (!res.ok) { addLog(`❌ ${data.error}`); toast.error(data.error); return; }
      addLog(`✅ ${data.message}`);
      addLog(`📊 Inserted: ${data.insertedCount}`);
      data.report?.forEach((r: any) => {
        const icon = r.status === "inserted" ? "✅" : r.status.includes("skipped") ? "⏭️" : "⚠️";
        addLog(`  ${icon} "${r.title}" | ${r.type ?? ""} | ${r.genre ?? ""} | ${r.duration ?? ""} → ${r.status}`);
      });
      addLog("🎉 Done! Go to Scraper → Resolve Streams to cache embed URLs.");
      toast.success(`Bulk imported ${data.insertedCount} movies!`);
      fetchData();
    } catch (e: any) { addLog(`❌ ${e.message}`); toast.error("Bulk import failed"); }
    finally { setBulkRunning(false); }
  };

  // ── Movie CRUD ────────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingMovie(null);
    setFormTitle(""); setFormDesc(""); setFormVideoUrl(""); setFormThumbnailUrl("");
    setFormGenre("Drama"); setFormDuration(""); setFormOnlyOn(false);
    setFormType(activeTab === "series" ? "series" : "movie");
    setFormSeasonsData('[{"seasonNumber": 1, "episodeCount": 12}]');
    setModalOpen(true);
  };
  const openEditModal = (m: Movie) => {
    setEditingMovie(m); setFormTitle(m.title); setFormDesc(m.description);
    setFormVideoUrl(m.videoUrl || ""); setFormThumbnailUrl(m.thumbnailUrl);
    setFormGenre(m.genre); setFormDuration(m.duration); setFormOnlyOn(m.onlyOnChillFlix);
    setFormType(m.type ?? "movie"); setFormSeasonsData(m.seasonsData || ""); setModalOpen(true);
  };
  const handleDeleteMovie = async (id: string, title: string) => {
    if (!window.confirm(`Delete "${title}"?`)) return;
    const res = await fetch(`/api/admin/movies/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted"); setMovies((p) => p.filter((m) => m.id !== id));
      setStats((p) => ({ ...p, totalMovies: p.totalMovies - 1 }));
    } else toast.error("Delete failed");
  };
  const handleSaveMovie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || (!formVideoUrl && formType !== "series") || !formThumbnailUrl) {
      toast.error(formType === "series" ? "Title and poster URL required" : "Title, video URL, and poster URL required");
      return;
    }

    // Validate seasonsData JSON if series
    if (formType === "series" && formSeasonsData.trim()) {
      try {
        const parsed = JSON.parse(formSeasonsData);
        if (!Array.isArray(parsed)) throw new Error("Must be a JSON array");
      } catch (e) {
        toast.error("Invalid Seasons Data JSON. Format: [{\"seasonNumber\": 1, \"episodeCount\": 12}]");
        return;
      }
    }

    const payload = {
      title: formTitle,
      description: formDesc,
      videoUrl: formVideoUrl,
      thumbnailUrl: formThumbnailUrl,
      genre: formGenre,
      duration: formDuration,
      onlyOnChillFlix: formOnlyOn,
      type: formType,
      seasonsData: formType === "series" ? (formSeasonsData.trim() || null) : null
    };

    try {
      setFormSaving(true);
      const url = editingMovie ? `/api/admin/movies/${editingMovie.id}` : "/api/admin/movies";
      const res = await fetch(url, { method: editingMovie ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error((await res.json()).error);
      const saved = await res.json();
      if (editingMovie) { setMovies((p) => p.map((m) => m.id === editingMovie.id ? saved : m)); toast.success("Updated"); }
      else { setMovies((p) => [saved, ...p]); setStats((p) => ({ ...p, totalMovies: p.totalMovies + 1 })); toast.success("Added"); }
      setModalOpen(false);
    } catch (err: any) { toast.error(err.message); }
    finally { setFormSaving(false); }
  };

  // ── Scraper helpers ───────────────────────────────────────────────────────

  const addLog = (msg: string) => setScraperLogs((p) => [...p, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  const isScraping = seedStatus === "running" || scrapeStatus === "running";

  const handleSeed = async () => {
    setSeedStatus("running");
    setScraperLogs([]);
    addLog("🚀 Starting catalog seeding process…");
    try {
      const res = await fetch(`/api/admin/seed?limit=${seedLimit}&force=${seedForce}`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream in response");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) addLog(line.trim());
        }
      }
      if (buffer.trim()) addLog(buffer.trim());
      setSeedStatus("success");
      toast.success("Seeding completed!");
      fetchData();
    } catch (e: any) {
      setSeedStatus("error");
      addLog(`❌ Seeding failed: ${e.message}`);
      toast.error("Seeding failed");
    }
  };

  const handleResolveStreams = async () => {
    setScrapeStatus("running");
    setScraperLogs([]);
    addLog("🎬 Starting bulk stream resolution…");
    try {
      const res = await fetch("/api/admin/scrape");
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "Server error" }));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No readable stream in response");
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.trim()) addLog(line.trim());
        }
      }
      if (buffer.trim()) addLog(buffer.trim());
      setScrapeStatus("success");
      toast.success("Streams resolved successfully!");
      fetchData();
    } catch (e: any) {
      setScrapeStatus("error");
      addLog(`❌ Scraping failed: ${e.message}`);
      toast.error("Scraping failed");
    }
  };

  const handleDomainUpdate = async () => {
    if (!/^https?:\/\//i.test(editUrl)) { toast.error("Invalid URL"); return; }
    setDomainLoading(true);
    const res = await fetch("/api/admin/domain", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: editUrl }) });
    if (res.ok) { setCinevoUrl(editUrl); toast.success("Domain updated!"); }
    else toast.error((await res.json()).error);
    setDomainLoading(false);
  };

  const filteredMovies = movies.filter((m) => {
    if (activeTab === "movies" && m.type === "series") return false;
    if (activeTab === "series" && m.type !== "series") return false;
    return (
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.genre ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.type ?? "").toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  // ── Sidebar ───────────────────────────────────────────────────────────────

  const sidebarTabs: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "dashboard", icon: <Activity size={16} />, label: "Dashboard" },
    { id: "movies", icon: <Film size={16} />, label: "Movies" },
    { id: "series", icon: <Tv size={16} />, label: "TV Series" },
    { id: "import", icon: <Database size={16} />, label: "Import (TMDB)" },
    { id: "scraper", icon: <Sparkles size={16} />, label: "Scraper Engine" },
    { id: "domain", icon: <Globe size={16} />, label: "Domain Config" },
    { id: "subscriptions", icon: <CreditCard size={16} />, label: "Subscriptions" },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>

      {/* Nav */}
      <nav className="border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
          <div className="flex items-center gap-5">
            <Image src="/images/logo2.png" alt="ChillFlix" width={110} height={32} className="cursor-pointer h-8 w-auto" onClick={() => router.push("/main")} />
            <div className="hidden sm:flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Admin Panel
            </div>
          </div>
          <button onClick={() => router.push("/main")} className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors">
            <ArrowLeft size={14} /> Back to App
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-8">

          {/* Sidebar */}
          <aside className="flex flex-col gap-1">
            <p className="text-zinc-600 font-bold text-[10px] uppercase tracking-widest px-3 mb-2">Navigation</p>
            {sidebarTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200 ${activeTab === tab.id
                    ? "bg-red-600/15 text-red-400 border-red-600/20"
                    : "text-zinc-500 border-transparent hover:text-white hover:bg-white/5"
                  }`}>
                <span className={activeTab === tab.id ? "text-red-400" : "text-zinc-600"}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </aside>

          {/* Content */}
          <main className="min-w-0">
            {loading && !["scraper", "domain", "import"].includes(activeTab) ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <RefreshCw className="animate-spin text-red-500" size={36} strokeWidth={1.5} />
                <p className="text-zinc-500 text-sm">Loading…</p>
              </div>
            ) : (
              <>
                {/* ════ DASHBOARD ════ */}
                {activeTab === "dashboard" && (
                  <div className="flex flex-col gap-8 animate-fade-in">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight">Dashboard</h2>
                      <p className="text-zinc-500 text-sm mt-1">Overview of your ChillFlix platform</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label: "Total Movies", value: stats.totalMovies, icon: <Film size={20} />, color: "red" },
                        { label: "Total Users", value: stats.totalUsers, icon: <Users size={20} />, color: "blue" },
                        { label: "Memberships", value: stats.totalMemberships, icon: <CreditCard size={20} />, color: "green" },
                      ].map((s) => (
                        <div key={s.label} className="bg-zinc-900 border border-white/[0.06] rounded-xl p-5 flex items-center justify-between">
                          <div>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">{s.label}</p>
                            <p className="text-3xl font-extrabold mt-1.5">{s.value}</p>
                          </div>
                          <div className={`p-3 rounded-xl ${s.color === "red" ? "bg-red-500/10 text-red-400" : s.color === "blue" ? "bg-blue-500/10 text-blue-400" : "bg-green-500/10 text-green-400"}`}>{s.icon}</div>
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6">
                        <h3 className="font-bold text-base mb-5">Recent Users</h3>
                        {recentUsers.length === 0 ? <p className="text-zinc-600 text-sm">No users yet.</p> : (
                          <div className="flex flex-col divide-y divide-white/[0.04]">
                            {recentUsers.map((u) => (
                              <div key={u.id} className="flex justify-between items-center py-3">
                                <div><p className="text-sm font-semibold">{u.name || "Anonymous"}</p><p className="text-zinc-500 text-xs">{u.email}</p></div>
                                <span className="text-zinc-505 text-xs">{new Date(u.createdAt).toLocaleDateString()}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6 flex flex-col gap-3">
                        <div><h3 className="font-bold text-base mb-1">Quick Actions</h3><p className="text-zinc-500 text-xs">Jump to common tasks</p></div>
                        <button onClick={() => setActiveTab("import")} className="w-full btn-red text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2"><Database size={15} /> Import from TMDB</button>
                        <button onClick={() => setActiveTab("scraper")} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"><Sparkles size={15} /> Scraper Engine</button>
                        <button onClick={openAddModal} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 px-4 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"><Plus size={15} /> Add Title Manually</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ════ MOVIES & SERIES ════ */}
                {(activeTab === "movies" || activeTab === "series") && (
                  selectedSeries ? (
                    <EpisodesManager series={selectedSeries} onClose={() => setSelectedSeries(null)} />
                  ) : (
                    <div className="flex flex-col gap-6 animate-fade-in">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h2 className="text-2xl font-extrabold tracking-tight">
                            {activeTab === "movies" ? "Manage Movies" : "Manage TV Series"}
                          </h2>
                          <p className="text-zinc-500 text-sm mt-1">
                            {filteredMovies.length} title{filteredMovies.length !== 1 ? "s" : ""} in database
                          </p>
                        </div>
                        <button onClick={openAddModal} className="btn-red text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 self-start">
                          <Plus size={15} /> Add {activeTab === "movies" ? "Movie" : "Series"}
                        </button>
                      </div>
                      <div className="relative">
                        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          type="text"
                          placeholder={activeTab === "movies" ? "Search movies by title or genre…" : "Search TV series by title or genre…"}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className={`${inputCls} pl-10 w-full`}
                        />
                      </div>
                      {filteredMovies.length === 0 ? (
                        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl py-20 text-center">
                          {activeTab === "movies" ? (
                            <Film size={36} className="mx-auto text-zinc-700 mb-3" strokeWidth={1} />
                          ) : (
                            <Tv size={36} className="mx-auto text-zinc-700 mb-3" strokeWidth={1} />
                          )}
                          <p className="text-zinc-500 text-sm">
                            {movies.filter(m => activeTab === "movies" ? (m.type !== "series") : (m.type === "series")).length === 0
                              ? `No ${activeTab === "movies" ? "movies" : "TV series"} yet — try Import from TMDB!`
                              : "No results."}
                          </p>
                          {movies.length === 0 && (
                            <button onClick={() => setActiveTab("import")} className="mt-4 btn-red text-white text-sm font-bold py-2 px-5 rounded-xl flex items-center gap-2 mx-auto">
                              <Database size={14} /> Import from TMDB
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl overflow-hidden">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="border-b border-white/[0.05] text-zinc-650 text-[10px] font-bold uppercase tracking-widest">
                                <th className="px-5 py-3.5">{activeTab === "movies" ? "Movie" : "TV Series"}</th>
                                <th className="px-3 py-3.5 hidden md:table-cell">Type</th>
                                <th className="px-3 py-3.5 hidden md:table-cell">Genre</th>
                                <th className="px-3 py-3.5 hidden lg:table-cell">Duration</th>
                                <th className="px-3 py-3.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/[0.04]">
                              {filteredMovies.map((movie) => (
                                <tr key={movie.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="px-5 py-3.5">
                                    <div className="flex items-center gap-3">
                                      <div className="relative h-12 w-[72px] flex-shrink-0 rounded-md bg-zinc-800 overflow-hidden">
                                        {movie.thumbnailUrl ? (
                                          <Image src={movie.thumbnailUrl} alt={movie.title} fill className="object-cover" />
                                        ) : (
                                          <div className="h-full flex items-center justify-center">
                                            {movie.type === "series" ? <Tv size={16} className="text-zinc-600" /> : <Film size={16} className="text-zinc-600" />}
                                          </div>
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-semibold truncate max-w-[160px]">{movie.title}</p>
                                        {movie.onlyOnChillFlix && (
                                          <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                            Exclusive
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-3 py-3.5 hidden md:table-cell">
                                    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${movie.type === "series" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"}`}>
                                      {movie.type === "series" ? <Tv size={10} /> : <Clapperboard size={10} />} {movie.type ?? "movie"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-3.5 hidden md:table-cell text-zinc-400">{movie.genre}</td>
                                  <td className="px-3 py-3.5 hidden lg:table-cell text-zinc-500">{movie.duration || "—"}</td>
                                  <td className="px-3 py-3.5 text-right">
                                    <div className="flex justify-end gap-1">
                                      <button
                                        onClick={() => setSelectedSeries(movie)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          movie.type === "series"
                                            ? "text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10"
                                            : "text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                                        }`}
                                        title={movie.type === "series" ? "Manage Episodes" : "Manage Streams & Mirrors"}
                                      >
                                        {movie.type === "series" ? <Tv size={14} /> : <Clapperboard size={14} />}
                                      </button>
                                      {(() => {
                                        const isMovie = movie.type !== "series";
                                        const movieEp = (movie as any).Episode?.find((e: any) => e.season === 1 && e.episode === 1);
                                        const hasServers = movieEp && movieEp.videoUrl && movieEp.videoUrl.trim().startsWith("{");
                                        return isMovie && !hasServers && (
                                          <button
                                            onClick={() => handleResolveStream(movie.id, movie.title)}
                                            disabled={resolvingId === movie.id}
                                            title="Resolve stream from Cinevo"
                                            className={`p-2 rounded-lg transition-colors ${resolvingId === movie.id
                                                ? "text-zinc-600 cursor-wait"
                                                : resolvedIds.has(movie.id)
                                                  ? "text-green-400 bg-green-500/10"
                                                  : "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
                                              }`}
                                          >
                                            {resolvingId === movie.id ? (
                                              <RefreshCw size={14} className="animate-spin" />
                                            ) : resolvedIds.has(movie.id) ? (
                                              <Check size={14} />
                                            ) : (
                                              <PlayCircle size={14} />
                                            )}
                                          </button>
                                        );
                                      })()}
                                      <button onClick={() => openEditModal(movie)} className="p-2 rounded-lg text-zinc-550 hover:text-white hover:bg-white/5 transition-colors" title="Edit">
                                        <Edit3 size={14} />
                                      </button>
                                      <button onClick={() => handleDeleteMovie(movie.id, movie.title)} className="p-2 rounded-lg text-zinc-550 hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* ════ IMPORT FROM TMDB ════ */}
                {activeTab === "import" && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
                        <Database size={22} className="text-red-400" /> Import from TMDB
                      </h2>
                      <p className="text-zinc-500 text-sm mt-1">
                        Search any movie or TV show and import official metadata — title, description, poster, genre, rating, and runtime.
                      </p>
                    </div>

                    {/* TMDB key missing warning */}
                    {tmdbKeyMissing && (
                      <div className="bg-amber-500/8 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                        <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                          <p className="text-amber-300 font-bold mb-1">TMDB API key not configured</p>
                          <p className="text-zinc-400 text-xs leading-relaxed">
                            1. Get a free key at <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer" className="text-red-400 underline">themoviedb.org/settings/api</a><br />
                            2. Add to <code className="bg-zinc-800 px-1.5 py-0.5 rounded">.env.local</code>:<br />
                            <code className="bg-zinc-800 px-2 py-1 rounded block mt-1 text-green-400">TMDB_API_KEY=your_api_key_here</code><br />
                            3. Restart the dev server
                          </p>
                        </div>
                      </div>
                    )}

                    {/* ── Section 1: Search & import ── */}
                    <div className="bg-zinc-900 border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.06]">
                        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Search & Import</p>
                        <div className="flex flex-col sm:flex-row gap-3">
                          {/* Search input */}
                          <div className="relative flex-1">
                            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                            {tmdbSearching && <RefreshCw size={13} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 animate-spin" />}
                            <input
                              type="text"
                              placeholder='Search TMDB — e.g. "Inception", "Breaking Bad"…'
                              value={tmdbQuery}
                              onChange={(e) => setTmdbQuery(e.target.value)}
                              className={`${inputCls} pl-10 w-full`}
                              autoComplete="off"
                            />
                          </div>
                          {/* Type filter */}
                          <div className="flex rounded-lg overflow-hidden border border-zinc-700/60 flex-shrink-0">
                            {(["all", "movie", "tv"] as const).map((t) => (
                              <button key={t} onClick={() => setTmdbType(t)}
                                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${tmdbType === t ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                  }`}>
                                {t === "all" ? "All" : t === "movie" ? "🎬 Movies" : "📺 TV"}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Results grid */}
                      <div className="p-5 min-h-[220px]">
                        {!tmdbQuery.trim() && !tmdbSearching && (
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-700">
                            <Search size={32} strokeWidth={1} className="mb-3" />
                            <p className="text-sm">Type a title to search TMDB</p>
                          </div>
                        )}
                        {tmdbSearching && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="rounded-lg overflow-hidden">
                                <div className="aspect-[2/3] animate-shimmer rounded-lg" />
                                <div className="mt-2 h-3 bg-zinc-800 rounded animate-shimmer" />
                              </div>
                            ))}
                          </div>
                        )}
                        {!tmdbSearching && tmdbResults.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {tmdbResults.map((item) => {
                              const title = item.media_type === "tv" ? item.name : item.title;
                              const year = (item.release_date ?? item.first_air_date ?? "").slice(0, 4);
                              const isImported = importedIds.has(item.id);
                              const isLoading = importingId === item.id;
                              return (
                                <div key={item.id} className="group flex flex-col gap-2">
                                  <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-zinc-800">
                                    {item.poster_path
                                      ? <Image src={`${TMDB_IMG}${item.poster_path}`} alt={title ?? ""} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                                      : <div className="h-full flex items-center justify-center"><Film size={28} className="text-zinc-600" strokeWidth={1} /></div>}
                                    {/* overlay */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        onClick={() => !isImported && !isLoading && handleImport(item)}
                                        disabled={isImported || isLoading}
                                        className={`flex items-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all ${isImported ? "bg-green-600/80 text-white cursor-default" :
                                            isLoading ? "bg-zinc-700 text-zinc-400 cursor-wait" :
                                              "bg-red-600 hover:bg-red-500 text-white"
                                          }`}
                                      >
                                        {isLoading ? <><RefreshCw size={12} className="animate-spin" /> Adding…</> :
                                          isImported ? <><Check size={12} /> Added</> :
                                            <><BookmarkPlus size={12} /> Import</>}
                                      </button>
                                    </div>
                                    {/* badges */}
                                    <div className="absolute top-2 left-2 flex gap-1">
                                      <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${item.media_type === "tv" ? "bg-purple-600/90" : "bg-blue-600/90"} text-white`}>
                                        {item.media_type === "tv" ? "TV" : "Film"}
                                      </span>
                                      {isImported && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-green-600/90 text-white">✓</span>}
                                    </div>
                                    {item.vote_average > 0 && (
                                      <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-black/70 text-amber-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                        <Star size={9} fill="currentColor" /> {item.vote_average.toFixed(1)}
                                      </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-white truncate leading-tight">{title}</p>
                                    <p className="text-zinc-600 text-[10px]">{year}</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {!tmdbSearching && tmdbQuery.trim() && tmdbResults.length === 0 && (
                          <div className="flex flex-col items-center justify-center py-12 text-zinc-600">
                            <X size={28} strokeWidth={1} className="mb-3" />
                            <p className="text-sm">No results for &quot;{tmdbQuery}&quot;</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Section 2: Bulk import ── */}
                    <div className="bg-zinc-900 border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="px-5 py-4 border-b border-white/[0.06]">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 flex items-center gap-2"><TrendingUp size={13} /> Bulk Import</p>
                          <span className="text-zinc-600 text-xs">No search needed — imports from TMDB lists</span>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex rounded-lg overflow-hidden border border-zinc-700/60">
                            {([
                              { id: "trending", label: "🔥 Trending" },
                              { id: "popular_movies", label: "🎬 Popular Movies" },
                              { id: "popular_tv", label: "📺 Popular TV" },
                            ] as const).map((m) => (
                              <button key={m.id} onClick={() => setBulkMode(m.id)}
                                className={`px-3 py-2.5 text-xs font-bold transition-colors whitespace-nowrap ${bulkMode === m.id ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                                  }`}>{m.label}</button>
                            ))}
                          </div>
                          <Field label="">
                            <select value={bulkLimit} onChange={(e) => setBulkLimit(Number(e.target.value))} className={`${inputCls} py-2`}>
                              {[10, 20, 30, 40].map((n) => <option key={n} value={n}>{n} titles</option>)}
                            </select>
                          </Field>
                          <button onClick={handleBulkImport} disabled={bulkRunning}
                            className={`font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2 self-end transition-all whitespace-nowrap ${bulkRunning ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "btn-red text-white"
                              }`}>
                            {bulkRunning ? <><RefreshCw size={13} className="animate-spin" /> Importing…</> : <><Download size={13} /> Import {bulkLimit}</>}
                          </button>
                        </div>
                      </div>

                      {/* Import log */}
                      <div ref={importLogRef} className="p-4 bg-black min-h-[120px] max-h-[250px] overflow-y-auto font-mono text-xs flex flex-col gap-1 scrollbar-hide">
                        {importLog.length === 0
                          ? <span className="text-zinc-700">Log idle. Press &quot;Import&quot; to begin.</span>
                          : importLog.map((l, i) => (
                            <div key={i} className={
                              l.includes("❌") ? "text-red-400" :
                                l.includes("✅") || l.includes("🎉") ? "text-green-400" :
                                  l.includes("⏭️") ? "text-zinc-600" :
                                    l.includes("🚀") || l.includes("📡") ? "text-blue-400" :
                                      "text-zinc-300"
                            }>{l}</div>
                          ))}
                      </div>
                    </div>

                    {/* How it works callout */}
                    <div className="bg-zinc-900/60 border border-white/[0.04] rounded-xl p-5 flex gap-4">
                      <ChevronRight size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-zinc-500 space-y-1.5 leading-relaxed">
                        <p><strong className="text-zinc-300">Step 1 — Import Metadata</strong> (this tab): Adds movies to your database with official TMDB data — title, description, poster, genre, runtime, rating.</p>
                        <p><strong className="text-zinc-300">Step 2 — Resolve Streams</strong> (Scraper Engine tab): Opens each movie&apos;s Cinevo watch page with Playwright, cycles all servers, and caches embed URLs to the <code className="bg-zinc-800 px-1 rounded">Episode</code> table.</p>
                        <p><strong className="text-zinc-300">Step 3 — Watch</strong>: When a user presses Play, the app first checks the <code className="bg-zinc-800 px-1 rounded">Episode</code> cache. If found → instant load. If not → scrapes on-demand in the background.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ════ SCRAPER ENGINE ════ */}
                {activeTab === "scraper" && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    <div>
                      <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Sparkles size={22} className="text-red-400" /> Scraper Engine</h2>
                      <p className="text-zinc-500 text-sm mt-1">Seed catalog from Cinevo homepage OR resolve streams for imported movies.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Seed */}
                      <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6 flex flex-col gap-5">
                        <div>
                          <div className="flex items-center gap-2 mb-2"><span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black flex items-center justify-center">1</span><h3 className="font-bold text-sm uppercase tracking-wider text-zinc-300">Seed from Cinevo</h3></div>
                          <p className="text-zinc-500 text-xs leading-relaxed">Scrapes Cinevo homepage + visits each detail page for real metadata. Alternative to TMDB import — no API key needed.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Field label="Max movies"><select value={seedLimit} onChange={(e) => setSeedLimit(Number(e.target.value))} className={inputCls}>{[6, 12, 20, 30].map((n) => <option key={n} value={n}>{n} movies</option>)}</select></Field>
                          <label className="flex items-center gap-2.5 cursor-pointer">
                            <div className="relative"><input type="checkbox" className="sr-only" checked={seedForce} onChange={(e) => setSeedForce(e.target.checked)} /><div className={`w-9 h-5 rounded-full transition-colors ${seedForce ? "bg-red-600" : "bg-zinc-700"}`} /><div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${seedForce ? "translate-x-4" : ""}`} /></div>
                            <span className="text-zinc-400 text-xs font-medium">Force re-scrape duplicates</span>
                          </label>
                        </div>
                        <button onClick={handleSeed} disabled={isScraping} className={`w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${isScraping ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "btn-red text-white"}`}>
                          {seedStatus === "running" ? <><RefreshCw size={14} className="animate-spin" />Seeding…</> : <><Download size={14} />Seed from Cinevo</>}
                        </button>
                      </div>
                      {/* Resolve streams */}
                      <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6 flex flex-col gap-5">
                        <div>
                          <div className="flex items-center gap-2 mb-2"><span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black flex items-center justify-center">2</span><h3 className="font-bold text-sm uppercase tracking-wider text-zinc-300">Resolve Streams</h3></div>
                          <p className="text-zinc-500 text-xs leading-relaxed">For every movie in DB — opens Cinevo watch page, cycles all servers, caches embed URLs to the Episode table.</p>
                        </div>
                        <div className="flex-1" />
                        <div className="bg-zinc-800/40 border border-white/[0.04] rounded-lg p-3 text-[11px] text-zinc-500 space-y-1"><p>• Skips already-cached movies</p><p>• Runs sequentially to avoid rate-limits</p><p>• Stores all server URLs as JSON</p></div>
                        <button onClick={handleResolveStreams} disabled={isScraping} className={`w-full font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-all ${isScraping ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "bg-zinc-800 hover:bg-zinc-700 text-white border border-white/[0.06]"}`}>
                          {scrapeStatus === "running" ? <><RefreshCw size={14} className="animate-spin" />Resolving…</> : <><Zap size={14} />Resolve Streams</>}
                        </button>
                      </div>
                    </div>
                    {/* Console */}
                    <div className="bg-zinc-900 border border-white/[0.06] rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06] bg-zinc-950/50">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isScraping ? "bg-amber-500 animate-pulse" : (seedStatus === "success" || scrapeStatus === "success") ? "bg-green-500" : (seedStatus === "error" || scrapeStatus === "error") ? "bg-red-500" : "bg-zinc-700"}`} />
                          <span className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Console</span>
                        </div>
                        {scraperLogs.length > 0 && <button onClick={() => setScraperLogs([])} className="text-zinc-600 hover:text-zinc-400 text-xs">Clear</button>}
                      </div>
                      <div ref={logRef} className="p-5 bg-black min-h-[260px] max-h-[400px] overflow-y-auto font-mono text-xs flex flex-col gap-1.5 scrollbar-hide">
                        {scraperLogs.length === 0 ? <span className="text-zinc-700">Console idle.</span> : scraperLogs.map((l, i) => (
                          <div key={i} className={l.includes("❌") ? "text-red-400" : l.includes("✅") || l.includes("🎉") ? "text-green-400" : l.includes("⚠️") ? "text-amber-400" : l.includes("⏭️") ? "text-zinc-600" : l.includes("🚀") || l.includes("📄") || l.includes("🌐") ? "text-blue-400" : "text-zinc-300"}>{l}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ════ DOMAIN CONFIG ════ */}
                {activeTab === "domain" && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    <div><h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2"><Globe size={22} className="text-red-400" />Domain Config</h2><p className="text-zinc-500 text-sm mt-1">Update the Cinevo base URL when the site changes domains.</p></div>
                    <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-6 flex flex-col gap-6">
                      <div className="flex items-center gap-3 bg-zinc-800/50 border border-white/[0.04] rounded-xl px-5 py-4">
                        <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                        <div><p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Current Domain</p><p className="text-white font-mono text-sm">{cinevoUrl || "Loading…"}</p></div>
                      </div>
                      <Field label="New URL">
                        <input type="url" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="https://newdomain.xyz" className={inputCls} />
                      </Field>
                      <button onClick={handleDomainUpdate} disabled={domainLoading || editUrl === cinevoUrl} className={`font-bold py-3 px-6 rounded-xl text-sm flex items-center gap-2 self-start transition-all ${domainLoading || editUrl === cinevoUrl ? "bg-zinc-800 text-zinc-600 cursor-not-allowed" : "btn-red text-white"}`}>
                        {domainLoading ? <><RefreshCw size={14} className="animate-spin" />Saving…</> : <><Check size={14} />Update Domain</>}
                      </button>
                      <div className="bg-amber-500/5 border border-amber-500/15 rounded-xl p-4 flex gap-3">
                        <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-zinc-400 leading-relaxed">You can also set <code className="bg-zinc-800 px-1 rounded text-zinc-300">CINEVO_BASE_URL=https://...</code> in <code className="bg-zinc-800 px-1 rounded text-zinc-300">.env.local</code> for a permanent override. The env var takes highest priority.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ════ SUBSCRIPTIONS ════ */}
                {activeTab === "subscriptions" && (
                  <div className="flex flex-col gap-6 animate-fade-in">
                    <div><h2 className="text-2xl font-extrabold tracking-tight">Subscriptions</h2><p className="text-zinc-500 text-sm mt-1">{subscriptions.length} memberships</p></div>
                    {subscriptions.length === 0
                      ? <div className="bg-zinc-900 border border-white/[0.06] rounded-xl py-20 text-center"><CreditCard size={36} className="mx-auto text-zinc-700 mb-3" strokeWidth={1} /><p className="text-zinc-500 text-sm">No memberships yet.</p></div>
                      : <div className="bg-zinc-900 border border-white/[0.06] rounded-xl overflow-hidden"><table className="w-full text-left text-sm">
                        <thead><tr className="border-b border-white/[0.05] text-zinc-600 text-[10px] font-bold uppercase tracking-widest"><th className="px-5 py-3.5">Wallet</th><th className="px-3 py-3.5">Plan</th><th className="px-3 py-3.5 text-right">Date</th></tr></thead>
                        <tbody className="divide-y divide-white/[0.04]">{subscriptions.map((s) => (
                          <tr key={s.id} className="hover:bg-white/[0.02]">
                            
                            <td className="px-3 py-3.5"><span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${s.plan === "Premium" ? "bg-purple-500/10 text-purple-400" : s.plan === "Standard" ? "bg-blue-500/10 text-blue-400" : "bg-zinc-500/10 text-zinc-400"}`}>{s.plan}</span></td>
                            <td className="px-3 py-3.5 text-right text-zinc-500 text-xs">{new Date(s.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                          </tr>
                        ))}</tbody>
                      </table></div>}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* ══ Movie Add/Edit Modal ══ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setModalOpen(false)}>
          <div className="bg-zinc-900 border border-white/[0.07] rounded-2xl w-full max-w-2xl shadow-[0_32px_80px_rgba(0,0,0,0.8)] animate-fade-in-scale overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.06]">
              <h3 className="font-extrabold text-lg">{editingMovie ? `Edit: ${editingMovie.title}` : "Add New Movie"}</h3>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveMovie} className="p-6 grid grid-cols-2 gap-4 max-h-[72vh] overflow-y-auto scrollbar-hide">
              <div className="col-span-2"><Field label="Title"><input type="text" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Inception" className={inputCls} /></Field></div>
              <Field label="Content Type">
                <div className="flex gap-2">
                  {(["movie", "series"] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setFormType(t)} className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${formType === t ? "bg-red-600/20 border border-red-600/40 text-red-400" : "bg-zinc-800 border border-zinc-700/60 text-zinc-400 hover:text-white"}`}>
                      {t === "series" ? <Tv size={13} /> : <Clapperboard size={13} />}{t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Genre">
                <select value={formGenre} onChange={(e) => setFormGenre(e.target.value)} className={inputCls}>
                  {["Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Fantasy", "Horror", "Romance", "Sci-Fi", "Thriller", "War", "Western"].map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              {formType === "series" && (
                <div className="col-span-2">
                  <Field label="Seasons Data (JSON)">
                    <textarea
                      rows={2}
                      value={formSeasonsData}
                      onChange={(e) => setFormSeasonsData(e.target.value)}
                      placeholder='[{"seasonNumber": 1, "episodeCount": 12}]'
                      className={`${inputCls} font-mono text-xs`}
                    />
                  </Field>
                  <p className="text-[10px] text-zinc-650 mt-1 leading-normal">
                    Format: List of seasons and episode counts. E.g. <code className="bg-zinc-950 px-1 py-0.5 rounded text-purple-400">{"[{\"seasonNumber\": 1, \"episodeCount\": 12}, {\"seasonNumber\": 2, \"episodeCount\": 10}]"}</code>
                  </p>
                </div>
              )}
              <div className="col-span-2"><Field label="Duration"><input type="text" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder="e.g. 148 min or 24 Episodes" className={inputCls} /></Field></div>
              <div className="col-span-2"><Field label="Description"><textarea rows={3} value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Synopsis…" className={`${inputCls} resize-none`} /></Field></div>
              <div className="col-span-2">
                <Field label="Poster / Backdrop URL">
                  <input type="url" required value={formThumbnailUrl} onChange={(e) => setFormThumbnailUrl(e.target.value)} placeholder="https://image.tmdb.org/t/p/original/…" className={inputCls} />
                </Field>
                {formThumbnailUrl && <div className="mt-2 relative h-20 w-36 rounded-lg overflow-hidden bg-zinc-800"><Image src={formThumbnailUrl} alt="preview" fill className="object-cover" onError={() => { }} /></div>}
              </div>
              <div className="col-span-2"><Field label="Cinevo Watch URL (Optional for Series)"><input type="text" value={formVideoUrl} onChange={(e) => setFormVideoUrl(e.target.value)} placeholder="https://cinevo.us/watch/movie/inception" className={inputCls} /></Field></div>
              <div className="col-span-2 flex items-center gap-3">
                <button type="button" onClick={() => setFormOnlyOn(p => !p)} className={`relative w-10 h-5 rounded-full transition-colors ${formOnlyOn ? "bg-red-600" : "bg-zinc-700"}`}>
                  <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${formOnlyOn ? "translate-x-5" : ""}`} />
                </button>
                <span className="text-zinc-400 text-sm">Mark as &quot;Only on ChillFlix&quot; exclusive</span>
              </div>
              <div className="col-span-2 flex justify-end gap-3 pt-4 border-t border-white/[0.06]">
                <button type="button" onClick={() => setModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2.5 px-5 rounded-xl text-sm transition-colors">Cancel</button>
                <button type="submit" disabled={formSaving} className="btn-red text-white font-bold py-2.5 px-5 rounded-xl text-sm flex items-center gap-2">
                  {formSaving ? <><RefreshCw size={13} className="animate-spin" />Saving…</> : <><Check size={13} />{editingMovie ? "Save Changes" : "Create Movie"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EpisodesManager Sub-component
// ─────────────────────────────────────────────────────────────────────────────

interface EpisodesManagerProps {
  series: Movie;
  onClose: () => void;
}

function EpisodesManager({ series, onClose }: EpisodesManagerProps) {
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [resolvingEpId, setResolvingEpId] = useState<string | null>(null);

  // Edit episode modal
  const [editingEp, setEditingEp] = useState<any | null>(null);
  const [editEpTitle, setEditEpTitle] = useState("");
  /**
   * Mirror entries as an array of {label, url} pairs so the admin
   * can use plain inputs instead of raw JSON.
   */
  const [editEpMirrors, setEditEpMirrors] = useState<{ label: string; url: string }[]>([]);
  const [editEpModalOpen, setEditEpModalOpen] = useState(false);
  const [savingEp, setSavingEp] = useState(false);

  // Preview episode modal
  const [previewEp, setPreviewEp] = useState<any | null>(null);
  const [previewSource, setPreviewSource] = useState("");
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  const fetchEpisodes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/episodes?movieId=${series.id}`);
      if (!res.ok) throw new Error("Failed to load episodes");
      const data = await res.json();
      setEpisodes(data);
    } catch (e: any) {
      toast.error(e.message || "Error loading episodes");
    } finally {
      setLoading(false);
    }
  }, [series.id]);

  useEffect(() => {
    fetchEpisodes();
  }, [fetchEpisodes]);

  const seasonsList = useMemo(() => {
    if (series.seasonsData) {
      try {
        const parsed = JSON.parse(series.seasonsData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse seasonsData:", e);
      }
    }
    return [{ seasonNumber: 1, episodeCount: 12 }];
  }, [series.seasonsData]);

  const seasonEpisodes = useMemo(() => {
    return episodes.filter((ep: any) => ep.season === selectedSeason);
  }, [episodes, selectedSeason]);

  const stats = useMemo(() => {
    const total = episodes.length;
    const resolved = episodes.filter((ep: any) => ep.videoUrl && ep.videoUrl.trim().startsWith("{")).length;
    const pending = total - resolved;
    return { total, resolved, pending };
  }, [episodes]);

  const handleResolveEp = async (ep: any) => {
    setResolvingEpId(ep.id);
    const toastId = toast.loading(`Resolving S${ep.season}E${ep.episode} for "${series.title}"…`);
    try {
      const res = await fetch("/api/admin/resolve-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          movieId: series.id,
          season: ep.season,
          episode: ep.episode,
          force: true
        }),
      });
      const data = await res.json();
      toast.dismiss(toastId);
      if (!res.ok) throw new Error(data.error || "Failed to resolve stream");
      toast.success(data.message || `Successfully resolved S${ep.season}E${ep.episode}!`);
      fetchEpisodes();
    } catch (e: any) {
      toast.dismiss(toastId);
      toast.error(e.message || "Scraping failed");
    } finally {
      setResolvingEpId(null);
    }
  };

  const handleSaveEp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEpTitle.trim()) {
      toast.error("Episode title is required");
      return;
    }

    // Build the JSON object from the friendly mirror pair list
    const mirrorsObj: Record<string, string> = {};
    for (const { label, url } of editEpMirrors) {
      const l = label.trim();
      const u = url.trim();
      if (!l && !u) continue; // skip blank rows
      if (!l) { toast.error("Each server entry needs a name"); return; }
      if (!u) { toast.error(`Server "${l}" is missing a URL`); return; }
      mirrorsObj[l] = u;
    }

    const videoUrl = Object.keys(mirrorsObj).length > 0
      ? JSON.stringify(mirrorsObj)
      : "";

    setSavingEp(true);
    try {
      const res = await fetch("/api/admin/episodes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingEp.id,
          title: editEpTitle.trim(),
          videoUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save episode updates");
      toast.success("Episode updated!");
      setEditEpModalOpen(false);
      fetchEpisodes();
    } catch (e: any) {
      toast.error(e.message || "Failed to save episode");
    } finally {
      setSavingEp(false);
    }
  };

  /** Helpers for the mirror pair editor */
  const addMirrorRow = () =>
    setEditEpMirrors((p) => [...p, { label: "", url: "" }]);

  const updateMirrorRow = (
    index: number,
    field: "label" | "url",
    value: string
  ) =>
    setEditEpMirrors((p) =>
      p.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );

  const removeMirrorRow = (index: number) =>
    setEditEpMirrors((p) => p.filter((_, i) => i !== index));

  const openPreview = (ep: any) => {
    let sourcesMap: Record<string, string> = {};
    if (ep.videoUrl && ep.videoUrl.trim().startsWith("{")) {
      try {
        sourcesMap = JSON.parse(ep.videoUrl);
      } catch (e) {
        console.error(e);
      }
    }
    const sources = Object.entries(sourcesMap);
    if (sources.length === 0) {
      toast.error("No resolved streams to preview.");
      return;
    }
    setPreviewEp(ep);
    setPreviewSource(sources[0][1]);
    setPreviewModalOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      {/* Breadcrumbs / Header */}
      <div className="flex items-center gap-3">
        <button onClick={onClose} className="p-2 rounded-lg bg-zinc-900 border border-white/[0.05] hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            {series.type === "series" ? (
              <Tv className="text-purple-400" size={24} />
            ) : (
              <Clapperboard className="text-red-400" size={24} />
            )}
            {series.title}{" "}
            <span className="text-zinc-500 font-normal text-sm">
              {series.type === "series" ? "Episodes" : "Streams & Mirrors"}
            </span>
          </h2>
          <p className="text-zinc-500 text-xs mt-1">
            {series.type === "series"
              ? "Manage, verify, edit, and resolve episodes across seasons"
              : "Manage, verify, edit, and resolve streaming sources for this movie"}
          </p>
        </div>
      </div>

      {/* Series Info Grid & Stats */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
        {/* Info card */}
        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-5 flex gap-5 items-start">
          <div className="relative h-28 w-20 rounded-lg overflow-hidden bg-zinc-850 flex-shrink-0 border border-white/[0.05]">
            {series.thumbnailUrl ? (
              <Image src={series.thumbnailUrl} alt={series.title} fill className="object-cover" />
            ) : (
              <div className="h-full flex items-center justify-center font-bold">
                {series.type === "series" ? <Tv size={20} className="text-zinc-700" /> : <Clapperboard size={20} className="text-zinc-700" />}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                series.type === "series"
                  ? "bg-purple-500/10 text-purple-400"
                  : "bg-red-500/10 text-red-400"
              }`}>
                {series.type === "series" ? "TV Series" : "Movie"}
              </span>
              <span className="text-zinc-500 text-xs">{series.genre}</span>
            </div>
            <p className="text-zinc-300 text-sm leading-relaxed line-clamp-3">{series.description}</p>
            {series.videoUrl && (
              <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-1.5 truncate">
                <Globe size={11} className="text-zinc-600" /> {series.videoUrl}
              </div>
            )}
          </div>
        </div>

        {/* Stats card */}
        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl p-5 grid grid-cols-3 gap-2 text-center items-center">
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">
              {series.type === "series" ? "Total" : "Streams"}
            </p>
            <p className="text-2xl font-extrabold mt-1 text-white">{stats.total}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Cached</p>
            <p className="text-2xl font-extrabold mt-1 text-green-400">{stats.resolved}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Pending</p>
            <p className="text-2xl font-extrabold mt-1 text-amber-500">{stats.pending}</p>
          </div>
        </div>
      </div>

      {/* Season Selector Tabs */}
      {series.type === "series" && (
        <div className="flex gap-2 border-b border-white/[0.05] pb-px overflow-x-auto scrollbar-hide">
          {seasonsList.map((s: any) => (
            <button
              key={s.seasonNumber}
              onClick={() => setSelectedSeason(s.seasonNumber)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${selectedSeason === s.seasonNumber
                  ? "border-purple-500 text-purple-400"
                  : "border-transparent text-zinc-500 hover:text-white"
                }`}
            >
              Season {s.seasonNumber} ({s.episodeCount} Ep)
            </button>
          ))}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <RefreshCw className="animate-spin text-purple-400" size={32} />
          <p className="text-zinc-500 text-sm">Loading episodes…</p>
        </div>
      ) : seasonEpisodes.length === 0 ? (
        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl py-16 text-center">
          <Tv size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">No episodes found for this season.</p>
        </div>
      ) : (
        /* Episodes list table */
        <div className="bg-zinc-900 border border-white/[0.06] rounded-xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.05] text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
                <th className="px-5 py-3.5">Episode</th>
                <th className="px-3 py-3.5">Title</th>
                <th className="px-3 py-3.5 hidden sm:table-cell">Resolved Mirrors</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {seasonEpisodes.map((ep: any) => {
                let mirrors: string[] = [];
                if (ep.videoUrl && ep.videoUrl.trim().startsWith("{")) {
                  try {
                    mirrors = Object.keys(JSON.parse(ep.videoUrl));
                  } catch (e) { }
                }
                const isResolved = mirrors.length > 0;

                return (
                  <tr key={ep.id} className="hover:bg-white/[0.01] transition-colors">
                    <td className="px-5 py-3.5 font-bold text-zinc-400">
                      S{ep.season}E{ep.episode}
                    </td>
                    <td className="px-3 py-3.5 font-medium text-white">
                      {ep.title || `Episode ${ep.episode}`}
                    </td>
                    <td className="px-3 py-3.5 hidden sm:table-cell">
                      {isResolved ? (
                        <div className="flex flex-wrap gap-1">
                          {mirrors.map((m) => (
                            <span key={m} className="text-[9px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded uppercase">
                              {m}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-650 italic">Not Resolved (Dynamic on-demand)</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button
                          onClick={() => openPreview(ep)}
                          disabled={!isResolved}
                          className={`p-2 rounded-lg transition-colors ${isResolved
                              ? "text-zinc-500 hover:text-green-400 hover:bg-green-500/10"
                              : "text-zinc-700 cursor-not-allowed"
                            }`}
                          title="Preview stream"
                        >
                          <PlayCircle size={14} />
                        </button>
                        <button
                          onClick={() => handleResolveEp(ep)}
                          disabled={resolvingEpId === ep.id}
                          className={`p-2 rounded-lg transition-colors ${resolvingEpId === ep.id
                              ? "text-zinc-500 animate-spin"
                              : "text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10"
                            }`}
                          title="Scrape mirrors from Cinevo"
                        >
                          <RefreshCw size={14} className={resolvingEpId === ep.id ? "animate-spin" : ""} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingEp(ep);
                            setEditEpTitle(ep.title || `Episode ${ep.episode}`);
                            // Parse stored JSON mirrors into friendly row array
                            let rows: { label: string; url: string }[] = [];
                            if (ep.videoUrl?.trim().startsWith("{")) {
                              try {
                                const obj = JSON.parse(ep.videoUrl);
                                rows = Object.entries(obj).map(([label, url]) => ({
                                  label,
                                  url: url as string,
                                }));
                              } catch { }
                            }
                            if (rows.length === 0) rows = [{ label: "", url: "" }];
                            setEditEpMirrors(rows);
                            setEditEpModalOpen(true);
                          }}
                          className="p-2 rounded-lg text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                          title="Edit mirrors JSON"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Episode Modal */}
      {editEpModalOpen && editingEp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm" onClick={() => setEditEpModalOpen(false)}>
          <div className="bg-zinc-900 border border-white/[0.08] rounded-2xl w-full max-w-lg shadow-[0_32px_80px_rgba(0,0,0,0.85)] overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-white/[0.06]">
              <div>
                <h3 className="font-extrabold text-base">
                  Edit Episode
                </h3>
                <p className="text-zinc-500 text-xs mt-0.5">
                  {series.title} &mdash; S{editingEp.season}E{editingEp.episode}
                </p>
              </div>
              <button onClick={() => setEditEpModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            <form onSubmit={handleSaveEp} className="p-6 flex flex-col gap-5">
              {/* Title */}
              <Field label="Episode Title">
                <input type="text" required value={editEpTitle} onChange={(e) => setEditEpTitle(e.target.value)} className={inputCls} />
              </Field>
              {/* Mirrors List Editor */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-bold text-[10px] uppercase tracking-widest">Mirror Servers</span>
                  <button
                    type="button"
                    onClick={addMirrorRow}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:text-red-400 transition-colors uppercase tracking-wider"
                  >
                    <Plus size={12} /> Add Mirror
                  </button>
                </div>

                <div className="flex flex-col gap-2.5 max-h-[200px] overflow-y-auto pr-1 scrollbar-thin">
                  {editEpMirrors.map((mirror, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Server Name (e.g. VidCore)"
                        value={mirror.label}
                        onChange={(e) => updateMirrorRow(index, "label", e.target.value)}
                        className={`${inputCls} flex-1 py-1.5 px-3 text-xs`}
                      />
                      <input
                        type="url"
                        placeholder="Embed URL (https://...)"
                        value={mirror.url}
                        onChange={(e) => updateMirrorRow(index, "url", e.target.value)}
                        className={`${inputCls} flex-[2] py-1.5 px-3 text-xs`}
                      />
                      <button
                        type="button"
                        onClick={() => removeMirrorRow(index)}
                        className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Remove mirror"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {editEpMirrors.length === 0 && (
                    <div className="text-center py-4 border border-dashed border-white/[0.06] rounded-xl text-zinc-500 text-xs">
                      No mirrors configured. This episode will dynamically attempt auto-scraping when playing.
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-white/[0.06] mt-2">
                <button type="button" onClick={() => setEditEpModalOpen(false)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-2 px-4 rounded-xl text-xs transition-colors">Cancel</button>
                <button type="submit" disabled={savingEp} className="btn-red text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5">
                  {savingEp ? <><RefreshCw size={12} className="animate-spin" />Saving…</> : <><Check size={12} />Save Changes</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stream Preview Modal */}
      {previewModalOpen && previewEp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md" onClick={() => setPreviewModalOpen(false)}>
          <div className="bg-zinc-950 border border-white/[0.08] rounded-2xl w-full max-w-4xl shadow-[0_32px_80px_rgba(0,0,0,0.9)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/[0.06] bg-zinc-900/50">
              <div>
                <h3 className="font-extrabold text-sm flex items-center gap-2">
                  <PlayCircle className="text-green-400" size={16} /> Previewing: {series.title} — S{previewEp.season}E{previewEp.episode}
                </h3>
                <p className="text-zinc-500 text-[10px] mt-0.5">{previewEp.title || `Episode ${previewEp.episode}`}</p>
              </div>
              <button onClick={() => setPreviewModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
            </div>

            {/* Mirror Switcher Tabs */}
            <div className="px-6 py-2.5 bg-zinc-900/20 border-b border-white/[0.05] flex gap-1.5 overflow-x-auto scrollbar-hide">
              {Object.entries(JSON.parse(previewEp.videoUrl || "{}")).map(([label, url]: any) => (
                <button
                  key={label}
                  onClick={() => setPreviewSource(url)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${previewSource === url
                      ? "bg-purple-600/20 border-purple-500/50 text-purple-400"
                      : "bg-zinc-900/50 border-white/[0.04] text-zinc-500 hover:text-white hover:border-zinc-700"
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Iframe Viewport */}
            <div className="relative aspect-video w-full bg-black">
              {previewSource ? (
                <iframe
                  src={previewSource}
                  title="Stream Preview"
                  className="w-full h-full border-0"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-700 text-xs">No stream URL selected</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
