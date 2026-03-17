"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  MessageCircle,
  Loader2,
  Trash2,
  Send,
  AlertCircle,
  Search,
  ShoppingBag,
  Clock,
  PlayCircle,
  StopCircle,
  List,
  PlusCircle,
  Info,
  Package,
  Zap,
  Tag,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import BuscarGruposModal, {
  type BuscarGruposPayload,
  type EvolutionInstanceItem,
} from "../gpl/BuscarGruposModal";

// ─── Types ────────────────────────────────────────────────────────────────────
type ListaGrupos = { id: string; instanceId: string; nomeLista: string; createdAt: string };
type ContinuoItem = {
  id: string; listaId: string | null; listaNome: string;
  listaOfertasId: string | null; listaOfertasNome: string | null;
  instanceId: string; keywords: string[]; subId1: string; subId2: string; subId3: string;
  ativo: boolean; proximoIndice: number; ultimoDisparoAt: string | null; updatedAt: string;
  proximaKeyword: string | null;
  horarioInicio: string | null; horarioFim: string | null;
};
type ListaOfertasItem = { id: string; nome: string; totalItens: number };
type Instance = EvolutionInstanceItem & { id: string };

// ─── Tooltip (portal) ─────────────────────────────────────────────────────────
function Tooltip({ text, children, wide }: { text: string; children?: React.ReactNode; wide?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const show = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCoords({ top: rect.top + window.scrollY - 8, left: rect.left + rect.width / 2 + window.scrollX });
    setVisible(true);
  }, []);
  const hide = useCallback(() => setVisible(false), []);
  const tooltip = visible ? createPortal(
    <span style={{ position: "absolute", top: coords.top, left: coords.left, transform: "translate(-50%, -100%)", zIndex: 99999 }}
      className={`pointer-events-none ${wide ? "w-72" : "w-56"} p-2.5 bg-[#111] border border-[#333] rounded-lg shadow-2xl text-xs text-[#bbb] leading-relaxed whitespace-normal block`}>
      {text}
      <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-px border-4 border-transparent border-t-[#111]" />
    </span>, document.body
  ) : null;
  return (
    <span ref={anchorRef} className="relative inline-flex items-center" onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children ?? (
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#333]/80 text-[#888] hover:bg-shopee-orange/20 hover:text-shopee-orange transition-colors cursor-help">
          <Info className="h-2.5 w-2.5" />
        </span>
      )}
      {tooltip}
    </span>
  );
}

// ─── Disparo card ─────────────────────────────────────────────────────────────
function DisparoCard({
  c, togglingId, onToggle, onRemove,
}: {
  c: ContinuoItem;
  togglingId: string | null;
  onToggle: (id: string, ativar: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const subIds = [c.subId1, c.subId2, c.subId3].filter(Boolean);
  return (
    <div className={`rounded-xl border p-4 transition-all ${c.ativo ? "border-emerald-500/30 bg-emerald-500/5" : "border-dark-border bg-dark-bg/60"}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          {/* Nome + badge status */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="font-semibold text-sm text-text-primary">{c.listaNome}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
              c.ativo ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-dark-card text-text-secondary border border-dark-border"
            }`}>
              {c.ativo ? <PlayCircle className="h-2.5 w-2.5" /> : <StopCircle className="h-2.5 w-2.5" />}
              {c.ativo ? "Ativo" : "Parado"}
            </span>
          </div>

          {/* Detalhes */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {c.listaOfertasNome ? (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Package className="h-3 w-3 text-shopee-orange/60" />
                Lista: <span className="text-text-primary font-medium">{c.listaOfertasNome}</span>
              </span>
            ) : c.keywords.length > 0 ? (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Search className="h-3 w-3 text-shopee-orange/60" />
                <span className="text-text-primary font-medium">{c.keywords.slice(0, 2).join(", ")}{c.keywords.length > 2 ? ` +${c.keywords.length - 2}` : ""}</span>
              </span>
            ) : null}
            {subIds.length > 0 && (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Tag className="h-3 w-3 text-text-secondary/50" />
                {subIds.map((s, i) => (
                  <span key={i} className="bg-dark-card border border-dark-border px-1.5 py-px rounded text-[10px] text-text-primary">{s}</span>
                ))}
              </span>
            )}
            {(c.horarioInicio && c.horarioFim) && (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Clock className="h-3 w-3 text-shopee-orange/60" />
                <span className="text-text-primary font-medium">{c.horarioInicio} – {c.horarioFim}</span>
                <span className="text-text-secondary/50">Brasília</span>
              </span>
            )}
            {c.ultimoDisparoAt && (
              <span className="text-xs text-text-secondary flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(c.ultimoDisparoAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 shrink-0">
          {c.ativo ? (
            <button type="button" onClick={() => onToggle(c.id, false)} disabled={togglingId === c.id}
              className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-all">
              {togglingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Pausar"}
            </button>
          ) : (
            <button type="button" onClick={() => onToggle(c.id, true)} disabled={togglingId === c.id}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40 transition-all">
              {togglingId === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : "Ativar"}
            </button>
          )}
          <button type="button" onClick={() => onRemove(c.id)}
            className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all" aria-label="Remover">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GruposVendaPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState("");
  const [listas, setListas] = useState<ListaGrupos[]>([]);
  const [loadingListas, setLoadingListas] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedListaId, setSelectedListaId] = useState("");
  const [keywords, setKeywords] = useState("");
  const [subId1, setSubId1] = useState("");
  const [subId2, setSubId2] = useState("");
  const [subId3, setSubId3] = useState("");
  const [disparando, setDisparando] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [continuoList, setContinuoList] = useState<ContinuoItem[]>([]);
  const [continuoLoading, setContinuoLoading] = useState(false);
  const [continuoTogglingId, setContinuoTogglingId] = useState<string | null>(null);
  const [deletingListaId, setDeletingListaId] = useState<string | null>(null);
  const [cronTestLoading, setCronTestLoading] = useState(false);
  const [cronTestResult, setCronTestResult] = useState<string | null>(null);
  const [listasOfertas, setListasOfertas] = useState<ListaOfertasItem[]>([]);
  const [loadingListasOfertas, setLoadingListasOfertas] = useState(false);
  const [selectedListaOfertasId, setSelectedListaOfertasId] = useState("");
  const [disparoOpen, setDisparoOpen] = useState(true);
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFim, setHoraFim] = useState("");

  const loadInstances = useCallback(async () => {
    try {
      const res = await fetch("/api/evolution/instances");
      const data = await res.json();
      const list = Array.isArray(data.instances) ? data.instances : [];
      setInstances(list.map((i: { id: string; nome_instancia: string; hash?: string | null }) => ({
        id: i.id, nome_instancia: i.nome_instancia, hash: i.hash ?? null,
      })));
      if (list.length > 0 && !selectedInstanceId) setSelectedInstanceId(list[0].id);
    } catch { setInstances([]); }
  }, [selectedInstanceId]);

  const loadListas = useCallback(async () => {
    setLoadingListas(true);
    try {
      const url = selectedInstanceId
        ? `/api/grupos-venda/listas?instanceId=${encodeURIComponent(selectedInstanceId)}`
        : "/api/grupos-venda/listas";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao carregar listas");
      setListas(Array.isArray(data.data) ? data.data : []);
    } catch (e) { setListas([]); setError(e instanceof Error ? e.message : "Erro"); }
    finally { setLoadingListas(false); }
  }, [selectedInstanceId]);

  const loadContinuo = useCallback(async () => {
    setContinuoLoading(true);
    try {
      const res = await fetch("/api/grupos-venda/continuo");
      const data = await res.json();
      if (res.ok) setContinuoList(Array.isArray(data.data) ? data.data : []);
    } catch { setContinuoList([]); }
    finally { setContinuoLoading(false); }
  }, []);

  const loadListasOfertas = useCallback(async () => {
    setLoadingListasOfertas(true);
    try {
      const res = await fetch("/api/shopee/minha-lista-ofertas/listas");
      const data = await res.json();
      if (res.ok) setListasOfertas(Array.isArray(data.data) ? data.data : []);
    } catch { setListasOfertas([]); }
    finally { setLoadingListasOfertas(false); }
  }, []);

  useEffect(() => { loadInstances(); }, [loadInstances]);
  useEffect(() => { loadListas(); }, [loadListas]);
  useEffect(() => { loadContinuo(); }, [loadContinuo]);
  useEffect(() => { loadListasOfertas(); }, [loadListasOfertas]);

  const handleConfirmGroups = useCallback(async (payload: BuscarGruposPayload) => {
    const instance = instances.find((i) => i.nome_instancia === payload.nomeInstancia);
    if (!instance) { setError("Instância não encontrada."); return; }
    const nomeLista = payload.nomeLista?.trim();
    if (!nomeLista) { setError("Informe o nome da lista."); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/grupos-venda/listas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceId: instance.id, nomeLista, groups: payload.grupos.map((g) => ({ id: g.id, nome: g.nome })) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao criar lista");
      setFeedback(`Lista "${data.data?.nomeLista ?? nomeLista}" criada com ${data.data?.groupsCount ?? payload.grupos.length} grupo(s).`);
      setTimeout(() => setFeedback(""), 5000);
      loadListas();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao criar lista"); }
    finally { setSaving(false); }
    setModalOpen(false);
  }, [instances, loadListas]);

  const handleDeleteLista = useCallback(async (id: string) => {
    setDeletingListaId(id);
    try {
      const res = await fetch(`/api/grupos-venda/listas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
      loadListas();
      setContinuoList((prev) => prev.filter((c) => c.listaId !== id));
    } catch { setError("Erro ao remover lista"); }
    finally { setDeletingListaId(null); }
  }, [loadListas]);

  const handleDisparar = useCallback(async () => {
    if (!selectedListaId) { setError("Selecione uma lista de grupos."); return; }
    const kwList = keywords.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (kwList.length === 0) { setError("Digite ao menos uma keyword."); return; }
    setDisparando(true); setError(null); setFeedback("");
    try {
      const res = await fetch("/api/grupos-venda/disparar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listaId: selectedListaId, keywords: kwList, subId1, subId2, subId3 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro ao disparar");
      const sent = data.sent ?? 0;
      const errList = data.errors ?? [];
      setFeedback(`${sent} oferta(s) enviada(s).${errList.length > 0 ? ` ${errList.length} erro(s).` : ""}`);
      setTimeout(() => setFeedback(""), 8000);
      if (errList.length > 0)
        setError(errList.map((e: { keyword: string; error: string }) => `${e.keyword}: ${e.error}`).join("; "));
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao disparar"); }
    finally { setDisparando(false); }
  }, [selectedListaId, keywords, subId1, subId2, subId3]);

  const handleContinuoToggle = useCallback(async (configId: string, ativar: boolean) => {
    setContinuoTogglingId(configId); setError(null);
    try {
      if (!ativar) {
        const res = await fetch("/api/grupos-venda/continuo", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: configId, ativo: false }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Erro");
        setFeedback("Disparo 24h pausado.");
      } else {
        const c = continuoList.find((x) => x.id === configId);
        if (!c?.listaId) throw new Error("Config sem lista");
        const res = await fetch("/api/grupos-venda/continuo", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: configId, listaId: c.listaId, listaOfertasId: c.listaOfertasId || undefined, keywords: c.keywords, subId1: c.subId1, subId2: c.subId2, subId3: c.subId3, horarioInicio: c.horarioInicio || undefined, horarioFim: c.horarioFim || undefined, ativo: true }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? "Erro ao ativar");
        setFeedback("Disparo 24h ativado.");
      }
      setTimeout(() => setFeedback(""), 4000);
      await loadContinuo();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro"); }
    finally { setContinuoTogglingId(null); }
  }, [continuoList, loadContinuo]);

  const handleAddContinuo = useCallback(async () => {
    if (!selectedListaId) { setError("Selecione uma lista de grupos."); return; }
    const useListaOfertas = !!selectedListaOfertasId;
    const kwList = keywords.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    if (!useListaOfertas && kwList.length === 0) {
      setError("Digite ao menos uma keyword ou selecione uma lista de ofertas."); return;
    }
    setContinuoTogglingId("new"); setError(null);
    try {
      const res = await fetch("/api/grupos-venda/continuo", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listaId: selectedListaId,
          listaOfertasId: useListaOfertas ? selectedListaOfertasId : undefined,
          keywords: useListaOfertas ? [] : kwList,
          subId1, subId2, subId3,
          horarioInicio: horaInicio || undefined,
          horarioFim: horaFim || undefined,
          ativo: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Erro");
      const horarioMsg = horaInicio && horaFim ? ` Ativo das ${horaInicio} às ${horaFim} (Brasília).` : "";
      setFeedback(useListaOfertas ? `Disparo 24h por lista de ofertas adicionado.${horarioMsg}` : `Disparo 24h adicionado. 1 produto a cada 2 min em loop.${horarioMsg}`);
      setTimeout(() => setFeedback(""), 5000);
      setSelectedListaId(""); setKeywords(""); setSelectedListaOfertasId(""); setSubId1(""); setSubId2(""); setSubId3(""); setHoraInicio(""); setHoraFim("");
      await loadContinuo();
    } catch (e) { setError(e instanceof Error ? e.message : "Erro ao adicionar disparo 24h"); }
    finally { setContinuoTogglingId(null); }
  }, [selectedListaId, selectedListaOfertasId, keywords, subId1, subId2, subId3, horaInicio, horaFim, loadContinuo]);

  const handleRemoveContinuo = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/grupos-venda/continuo?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Erro ao remover");
      loadContinuo();
    } catch { setError("Erro ao remover disparo"); }
  }, [loadContinuo]);

  const handleTestCron = useCallback(async () => {
    setCronTestLoading(true); setCronTestResult(null); setError(null);
    try {
      const res = await fetch("/api/grupos-venda/cron-disparo");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setCronTestResult(`Erro ${res.status}: ${data?.error ?? res.statusText}`); return; }
      const processed = data.processed ?? 0;
      const results = data.results ?? [];
      const okCount = results.filter((r: { ok?: boolean }) => r.ok).length;
      const errCount = results.filter((r: { ok?: boolean }) => !r.ok).length;
      setCronTestResult(`Processados: ${processed}. OK: ${okCount}${errCount > 0 ? `, erros: ${errCount}` : ""}. ${results.length ? results.map((r: { keyword?: string; ok?: boolean; error?: string }) => (r.ok ? `"${r.keyword}" enviado` : `"${r.keyword}": ${r.error}`)).join("; ") : "Nenhum disparo ativo."}`);
      if (processed > 0) loadContinuo();
    } catch (e) { setCronTestResult(`Falha: ${e instanceof Error ? e.message : "Erro ao chamar cron"}`); }
    finally { setCronTestLoading(false); }
  }, [loadContinuo]);

  const ativos = continuoList.filter((c) => c.ativo).length;

  return (
    <div className="max-w-6xl mx-auto space-y-5 pb-10">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-shopee-orange/15 border border-shopee-orange/30 flex items-center justify-center shrink-0">
              <MessageCircle className="h-5 w-5 text-shopee-orange" />
            </div>
            <h1 className="text-xl font-bold text-text-primary">Grupos de Venda</h1>
          </div>
          <p className="text-text-secondary text-xs mt-1.5 ml-12">
            Crie listas de grupos WhatsApp e dispare ofertas automaticamente — uma vez ou 24h em loop.
          </p>
        </div>
        {continuoList.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${
              ativos > 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-dark-card border-dark-border text-text-secondary"
            }`}>
              <Zap className="h-3 w-3" />
              {ativos} ativo{ativos !== 1 ? "s" : ""} de {continuoList.length} disparo{continuoList.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* ── Feedback / Error ── */}
      {feedback && (
        <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <p className="text-sm text-emerald-400">{feedback}</p>
        </div>
      )}
      {error && (
        <div className="p-3 rounded-xl border border-red-500/40 bg-red-500/10 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="ml-auto text-red-400/60 hover:text-red-400 text-xs shrink-0">✕</button>
        </div>
      )}

      {/* ── Grid principal ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── Col esquerda: Listas de grupos ── */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-shopee-orange" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Listas de grupos</h2>
            <Tooltip text="Agrupe seus grupos WhatsApp em listas nomeadas. Cada lista pode ser usada para disparar ofertas uma vez ou em loop 24h." wide />
          </div>

          {/* Instância — botões */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-xs text-text-secondary font-medium">Instância</span>
              <Tooltip text="Selecione a instância WhatsApp cujos grupos você quer usar." />
            </div>
            {instances.length === 0 ? (
              <p className="text-xs text-text-secondary">Nenhuma instância encontrada.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {instances.map((inst) => (
                  <button key={inst.id} type="button"
                    onClick={() => setSelectedInstanceId(inst.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      selectedInstanceId === inst.id
                        ? "bg-shopee-orange border-shopee-orange text-white shadow-[0_0_10px_rgba(238,77,45,0.25)]"
                        : "bg-dark-bg border-dark-border text-text-secondary hover:border-shopee-orange/50 hover:text-text-primary"
                    }`}>
                    {inst.nome_instancia}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botão buscar grupos */}
          <button type="button" onClick={() => setModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl bg-shopee-orange text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-[0_2px_12px_rgba(238,77,45,0.25)]">
            <Search className="h-4 w-4" />
            Buscar grupos e criar lista
          </button>

          {/* Lista de grupos salvas */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary font-medium">
                {listas.length > 0 ? `${listas.length} lista${listas.length !== 1 ? "s" : ""} salva${listas.length !== 1 ? "s" : ""}` : "Listas salvas"}
              </span>
              <button type="button" onClick={loadListas} disabled={loadingListas}
                className="text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors">
                <RefreshCw className={`h-3.5 w-3.5 ${loadingListas ? "animate-spin" : ""}`} />
              </button>
            </div>
            {loadingListas ? (
              <div className="flex items-center gap-2 text-text-secondary text-xs py-3">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
              </div>
            ) : listas.length === 0 ? (
              <div className="py-6 flex flex-col items-center gap-2 text-center border border-dashed border-dark-border rounded-xl">
                <List className="h-7 w-7 text-text-secondary/30" />
                <p className="text-xs text-text-secondary/60">Nenhuma lista ainda.<br />Busque grupos e crie sua primeira lista.</p>
              </div>
            ) : (
              <ul className="space-y-1.5 max-h-52 overflow-y-auto scrollbar-shopee pr-1">
                {listas.map((l) => (
                  <li key={l.id}
                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-xl border border-dark-border bg-dark-bg/60 hover:border-dark-border/80 transition-colors">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-text-primary font-medium truncate block">{l.nomeLista}</span>
                      <span className="text-[10px] text-text-secondary">
                        {instances.find((i) => i.id === l.instanceId)?.nome_instancia ?? l.instanceId.slice(0, 8)}
                      </span>
                    </div>
                    <button type="button" onClick={() => handleDeleteLista(l.id)} disabled={deletingListaId === l.id}
                      className="p-1.5 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-40" aria-label="Excluir">
                      {deletingListaId === l.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {saving && (
            <p className="text-xs text-text-secondary flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando lista...
            </p>
          )}

          {/* Lista de ofertas */}
          <div className="border-t border-dark-border/50 pt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Package className="h-3.5 w-3.5 text-shopee-orange/70" />
              <span className="text-xs text-text-secondary font-medium">Lista de ofertas</span>
              <Tooltip text="Opcional: use uma lista de ofertas salva no Gerador de Links para o disparo 24h rodar em loop pelos produtos automaticamente." wide />
            </div>
            {loadingListasOfertas ? (
              <div className="flex items-center gap-2 text-text-secondary text-xs">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando listas...
              </div>
            ) : (
              <select value={selectedListaOfertasId} onChange={(e) => setSelectedListaOfertasId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-dark-border bg-dark-bg text-text-primary text-sm focus:outline-none focus:border-shopee-orange transition-colors">
                <option value="">Sem lista de ofertas (usa keywords)</option>
                {listasOfertas.map((l) => (
                  <option key={l.id} value={l.id}>{l.nome} ({l.totalItens} itens)</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* ── Col direita: Configurar disparo ── */}
        <div className="bg-dark-card rounded-xl border border-dark-border p-5 flex flex-col gap-4">
          {/* Header colapsável */}
          <button type="button" onClick={() => setDisparoOpen((v) => !v)}
            className="flex items-center gap-2 w-full text-left">
            <ShoppingBag className="h-4 w-4 text-shopee-orange" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide flex-1">Configurar disparo</h2>
            {disparoOpen ? <ChevronUp className="h-4 w-4 text-text-secondary" /> : <ChevronDown className="h-4 w-4 text-text-secondary" />}
          </button>

          {disparoOpen && (
            <>
              {/* Lista de grupos */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-xs text-text-secondary font-medium">Lista de grupos</span>
                  <Tooltip text="Escolha qual lista de grupos WhatsApp receberá as ofertas." />
                </div>
                <select value={selectedListaId} onChange={(e) => setSelectedListaId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-dark-border bg-dark-bg text-text-primary text-sm focus:outline-none focus:border-shopee-orange transition-colors">
                  <option value="">Selecione uma lista</option>
                  {listas.map((l) => <option key={l.id} value={l.id}>{l.nomeLista}</option>)}
                </select>
              </div>

              {/* Sub IDs */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag className="h-3.5 w-3.5 text-text-secondary/60" />
                  <span className="text-xs text-text-secondary font-medium">Sub IDs de rastreamento</span>
                  <Tooltip text="Identificadores para rastrear de onde veio cada clique no relatório da Shopee. Ex: Sub ID 1 = canal, Sub ID 2 = lista, Sub ID 3 = campanha." wide />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: subId1, set: setSubId1, ph: "canal" },
                    { val: subId2, set: setSubId2, ph: "lista" },
                    { val: subId3, set: setSubId3, ph: "campanha" },
                  ].map((f, i) => (
                    <input key={i} type="text" value={f.val} onChange={(e) => f.set(e.target.value)}
                      placeholder={`Sub ID ${i + 1} (${f.ph})`}
                      className="w-full px-2.5 py-2 rounded-xl border border-dark-border bg-dark-bg text-text-primary text-xs placeholder-text-secondary/50 focus:outline-none focus:border-shopee-orange transition-colors" />
                  ))}
                </div>
              </div>

              {/* Keywords */}
              <div>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-xs text-text-secondary font-medium">Keywords</span>
                  <Tooltip text="Uma keyword por linha ou separadas por vírgula. Cada keyword busca os melhores produtos na Shopee e envia um para cada grupo. Se usar lista de ofertas acima, deixe em branco." wide />
                </div>
                <textarea value={keywords} onChange={(e) => setKeywords(e.target.value)}
                  placeholder={"camisa masculina\ntenis corrida\nfone bluetooth"}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl border border-dark-border bg-dark-bg text-text-primary text-sm placeholder-text-secondary/50 focus:outline-none focus:border-shopee-orange resize-y transition-colors" />
                {selectedListaOfertasId && (
                  <p className="text-[11px] text-amber-400/80 mt-1 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Lista de ofertas selecionada — keywords serão ignoradas no disparo 24h.
                  </p>
                )}
              </div>

              {/* Horário de funcionamento */}
              <div className="border border-dark-border/60 rounded-xl p-3 bg-dark-bg/40">
                <div className="flex items-center gap-1.5 mb-2.5">
                  <Clock className="h-3.5 w-3.5 text-shopee-orange/70" />
                  <span className="text-xs text-text-secondary font-medium">Horário de funcionamento</span>
                  <Tooltip text="Opcional. Define em que período do dia o disparo 24h pode rodar (horário de Brasília, UTC-3). Fora desse intervalo, o cron pulará este disparo. Deixe em branco para rodar o dia todo." wide />
                  {(horaInicio || horaFim) && (
                    <button type="button" onClick={() => { setHoraInicio(""); setHoraFim(""); }}
                      className="ml-auto text-[10px] text-text-secondary/50 hover:text-red-400 transition-colors">
                      limpar
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-text-secondary/60 mb-1">Início</label>
                    <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-dark-border bg-dark-bg text-text-primary text-sm focus:outline-none focus:border-shopee-orange transition-colors" />
                  </div>
                  <span className="text-text-secondary/40 mt-4 shrink-0">→</span>
                  <div className="flex-1">
                    <label className="block text-[10px] text-text-secondary/60 mb-1">Fim</label>
                    <input type="time" value={horaFim} onChange={(e) => setHoraFim(e.target.value)}
                      className="w-full px-2.5 py-2 rounded-lg border border-dark-border bg-dark-bg text-text-primary text-sm focus:outline-none focus:border-shopee-orange transition-colors" />
                  </div>
                </div>
                {horaInicio && horaFim && (
                  <p className="text-[11px] text-emerald-400/80 mt-2 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Ativo das {horaInicio} às {horaFim} (horário de Brasília)
                  </p>
                )}
                {(!horaInicio && !horaFim) && (
                  <p className="text-[11px] text-text-secondary/40 mt-2">Sem restrição de horário — dispara o dia todo.</p>
                )}
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button type="button" onClick={handleDisparar}
                  disabled={disparando || !selectedListaId || !keywords.trim()}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-shopee-orange text-white font-semibold text-sm hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-[0_2px_12px_rgba(238,77,45,0.2)]">
                  {disparando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Disparar uma vez
                </button>
                <button type="button" onClick={handleAddContinuo}
                  disabled={continuoTogglingId === "new" || !selectedListaId || (!keywords.trim() && !selectedListaOfertasId)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {continuoTogglingId === "new" ? <Loader2 className="h-4 w-4 animate-spin" /> : (horaInicio && horaFim) ? <Clock className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                  {(horaInicio && horaFim) ? "Agendar disparo" : "Adicionar disparo 24h"}
                </button>
              </div>

              <p className="text-[11px] text-text-secondary/60 leading-relaxed">
                <strong className="text-text-secondary">Uma vez:</strong> dispara imediatamente 1 produto por grupo para cada keyword.{" "}
                <strong className="text-text-secondary">24h:</strong> roda em loop, 1 produto a cada 2 min.
              </p>
            </>
          )}
        </div>
      </div>

      {/* ── Resumo dos disparos 24h ── */}
      <div className="bg-dark-card rounded-xl border border-dark-border p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-shopee-orange" />
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wide">Disparos 24h</h2>
            <Tooltip text="Cada card é um disparo automático configurado. Ative, pause ou remova individualmente. O cron roda a cada 2 min na Vercel." wide />
            {continuoList.length > 0 && (
              <span className="text-[10px] bg-dark-bg border border-dark-border px-2 py-0.5 rounded-full text-text-secondary">
                {continuoList.length} configura{continuoList.length !== 1 ? "ções" : "ção"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleTestCron} disabled={cronTestLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-400 text-xs font-medium hover:bg-amber-500/10 disabled:opacity-40 transition-all"
              title="Simula o cron da Vercel (dispara um ciclo agora). Útil para testar em desenvolvimento.">
              {cronTestLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
              Testar agora
            </button>
            <button type="button" onClick={loadContinuo} disabled={continuoLoading}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary disabled:opacity-40 transition-colors">
              <RefreshCw className={`h-3.5 w-3.5 ${continuoLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {cronTestResult && (
          <div className="mb-4 p-3 rounded-xl bg-dark-bg border border-dark-border text-xs text-text-primary leading-relaxed">
            {cronTestResult}
          </div>
        )}

        {continuoLoading ? (
          <div className="flex items-center gap-2 text-text-secondary text-sm py-4">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : continuoList.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-3 text-center border border-dashed border-dark-border rounded-xl">
            <Clock className="h-9 w-9 text-text-secondary/20" />
            <div>
              <p className="text-sm text-text-secondary/60 font-medium">Nenhum disparo 24h configurado</p>
              <p className="text-xs text-text-secondary/40 mt-1">Configure um disparo no painel acima e clique em &ldquo;Adicionar disparo 24h&rdquo;.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {continuoList.map((c) => (
              <DisparoCard key={c.id} c={c} togglingId={continuoTogglingId} onToggle={handleContinuoToggle} onRemove={handleRemoveContinuo} />
            ))}
          </div>
        )}
      </div>

      <BuscarGruposModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmGroups}
        criarListaMode
        initialInstanceId={selectedInstanceId || undefined}
      />
    </div>
  );
}
