"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useIdbKeyState } from "@/app/hooks/useIdbKeyState";
import { useSupabase } from "@/app/components/auth/AuthProvider";
import {
  Calculator,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  AlertTriangle,
  Info,
  ArrowRight,
  MessageCircle,
  Search,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MousePointerClick,
  Zap,
  Target,
  BarChart3,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import LoadingOverlay from "@/app/components/ui/LoadingOverlay";

interface CommissionDataRow {
  "ID do pedido": string;
  "Comissão líquida do afiliado(R$)": string;
  "Horário do pedido": string;
  "Status do Pedido"?: string;
  Canal?: string;
  "Canal do pedido"?: string;
  "Canal de divulgação"?: string;
  "Canal do afiliado"?: string;
  "Canal de origem"?: string;
  [key: string]: unknown;
}

function parseMoneyPt(input: unknown): number {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (input == null) return 0;
  const s = String(input).trim();
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, "").replace(/[R$\u00A0]/g, "").replace(/[%]/g, "");
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  let normalized = cleaned;
  if (hasComma && hasDot) {
    normalized = cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (hasComma) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

const formatCurrency = (value: number) =>
  `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function normalizeStr(input?: unknown): string {
  return String(input ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function localYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return localYMD(d);
}

function get3MonthsAgo(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return localYMD(d);
}

function formatDateBR(ymd: string): string {
  if (!ymd || ymd.length < 10) return "—";
  const [y, m, d] = ymd.slice(0, 10).split("-");
  return [d, m, y].join("/");
}

function extractChannel(row: CommissionDataRow): string {
  const candidates = ["Canal", "Canal do pedido", "Canal de divulgação", "Canal do afiliado", "Canal de origem"];
  for (const key of candidates) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v);
  }
  return "";
}

type CanonicalChannel = "whatsapp" | "websites" | "others" | "unknown";
function normalizeChannel(raw: unknown): CanonicalChannel {
  const s = normalizeStr(raw);
  if (!s) return "unknown";
  if (s.includes("whats")) return "whatsapp";
  if (s.includes("web")) return "websites";
  if (s.includes("other") || s.includes("outro")) return "others";
  return "unknown";
}
const TARGET_CHANNELS: CanonicalChannel[] = ["whatsapp", "websites", "others"];

function extractOrderStatus(row: CommissionDataRow): string {
  const v = row["Status do Pedido"];
  if (v == null) return "";
  return String(v);
}

type CanonicalOrderStatus = "pending" | "completed" | "other" | "unknown";
function normalizeOrderStatus(raw: unknown): CanonicalOrderStatus {
  const s = normalizeStr(raw);
  if (!s) return "unknown";
  if (s.includes("pend")) return "pending";
  if (s.includes("conclu") || s.includes("complet")) return "completed";
  if (s.includes("cancel") || s.includes("nao pago") || s.includes("não pago") || s.includes("unpaid")) return "other";
  return "other";
}
const TARGET_ORDER_STATUSES: CanonicalOrderStatus[] = ["pending", "completed"];

function getInclusiveDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(startDateStr + "T00:00:00");
  const end = new Date(endDateStr + "T00:00:00");
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

type ApiCheckState = "checking" | "hasKeys" | "noKeys";
type GplApiRangeCache = { fromDraft: string; toDraft: string; fromApplied: string; toApplied: string };
type EvolutionInstanceItem = { id: string; nome_instancia: string; numero_whatsapp: string | null };
type WhatsAppGroup = { id: string; nome: string; qtdMembros: number };
type TraficoGruposAd = { id: string; name: string; status: string; spend: number; clicks: number; impressions: number; ctr: number; cpc: number };
type TraficoGruposAdSet = { id: string; name: string; status: string; spend: number; ads: TraficoGruposAd[] };
type TraficoGruposCampaignDetail = { id: string; name: string; ad_account_id: string; status: string; spend: number; adSets: TraficoGruposAdSet[] };

const LS_API_CHECK_KEY = "gpl_api_check_state_v1";
function readApiCheckFromLocalStorage(): ApiCheckState {
  if (typeof window === "undefined") return "checking";
  const v = window.localStorage.getItem(LS_API_CHECK_KEY);
  return v === "hasKeys" || v === "noKeys" ? v : "checking";
}
function writeApiCheckToLocalStorage(v: ApiCheckState) {
  if (typeof window === "undefined") return;
  if (v === "hasKeys" || v === "noKeys") window.localStorage.setItem(LS_API_CHECK_KEY, v);
}

// ─── Tooltip via Portal ───────────────────────────────────────────────────────
function Tooltip({ text, children, wide }: { text: string; children?: React.ReactNode; wide?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);

  const show = useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({
      top: rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2 + window.scrollX,
    });
    setVisible(true);
  }, []);

  const hide = useCallback(() => setVisible(false), []);

  const tooltip = visible
    ? createPortal(
        <span
          style={{ position: "absolute", top: coords.top, left: coords.left, transform: "translate(-50%, -100%)", zIndex: 99999 }}
          className={`pointer-events-none ${wide ? "w-72" : "w-56"} p-2.5 bg-[#111111] border border-[#333] rounded-lg shadow-2xl text-xs text-[#bbb] leading-relaxed whitespace-normal block`}
        >
          {text}
          <span className="absolute left-1/2 -translate-x-1/2 top-full -mt-px border-4 border-transparent border-t-[#111111]" />
        </span>,
        document.body
      )
    : null;

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

// ─── Checkbox customizado ─────────────────────────────────────────────────────
function OrangeCheckbox({ checked, onChange, className }: { checked: boolean; onChange: () => void; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className={`shrink-0 w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${
        checked
          ? "bg-shopee-orange border-shopee-orange shadow-[0_0_8px_rgba(238,77,45,0.4)]"
          : "bg-dark-bg border-dark-border hover:border-shopee-orange/50"
      } ${className ?? ""}`}
    >
      {checked && (
        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2,6 5,9 10,3" />
        </svg>
      )}
    </button>
  );
}

// ─── Metric card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, color, tooltip, accent }: {
  label: string; value: string; sub?: string; color?: string; tooltip?: string; accent?: boolean;
}) {
  return (
    <div className={`bg-dark-card rounded-xl border p-3 flex flex-col gap-1 min-w-0 ${accent ? "border-shopee-orange/30 bg-shopee-orange/5" : "border-dark-border"}`}>
      <div className="flex items-center gap-1 text-[11px] text-text-secondary font-medium truncate">
        <span className="truncate">{label}</span>
        {tooltip && <Tooltip text={tooltip} wide />}
      </div>
      <p className={`text-xl font-bold tabular-nums truncate ${color ?? "text-text-primary"}`}>{value}</p>
      {sub && <p className="text-[11px] text-text-secondary/70">{sub}</p>}
    </div>
  );
}

export default function GplCalculatorPage() {
  const context = useSupabase();
  const session = context?.session;

  const [idbRawData, , isDataLoading] = useIdbKeyState<CommissionDataRow[]>("commissionsRawData_idb", []);
  const [apiRowsCache, setApiRowsCache, isApiRowsCacheLoading] = useIdbKeyState<CommissionDataRow[]>("gplApiRows_idb", []);
  const [apiRangeCache, setApiRangeCache, isApiRangeCacheLoading] = useIdbKeyState<GplApiRangeCache>("gplApiRange_idb", { fromDraft: "", toDraft: "", fromApplied: "", toApplied: "" });
  const [apiCheckState, setApiCheckState] = useState<ApiCheckState>(() => readApiCheckFromLocalStorage());
  const hasShopeeKeys = apiCheckState === "hasKeys";

  const [isApiLoading, setIsApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [apiFetchTick, setApiFetchTick] = useState(0);
  const [apiFetchedOnce, setApiFetchedOnce] = useState(false);

  const [startDateDraft, setStartDateDraft] = useState<string>("");
  const [endDateDraft, setEndDateDraft] = useState<string>("");
  const [startDateApplied, setStartDateApplied] = useState<string>("");
  const [endDateApplied, setEndDateApplied] = useState<string>("");

  const [groupSize, setGroupSize] = useState<string>("");
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [gplPeriod, setGplPeriod] = useState<number>(0);
  const [gplMonthly, setGplMonthly] = useState<number>(0);
  const [monthlyRevenue, setMonthlyRevenue] = useState<number>(0);
  const [daysInPeriod, setDaysInPeriod] = useState<number>(0);
  const [draftDays, setDraftDays] = useState<number>(0);
  const [showShortPeriodWarning, setShowShortPeriodWarning] = useState(false);
  const [showMaxPeriodWarning, setShowMaxPeriodWarning] = useState(false);

  const [evolutionInstances, setEvolutionInstances] = useState<EvolutionInstanceItem[]>([]);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string>("");
  const [groupsCache, setGroupsCache] = useState<Record<string, WhatsAppGroup[]>>({});
  const [groups, setGroups] = useState<WhatsAppGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [groupNameFilter, setGroupNameFilter] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [groupsLastFetchedAt, setGroupsLastFetchedAt] = useState<string | null>(null);
  const [groupSnapshots, setGroupSnapshots] = useState<Array<{ date: string; groups: WhatsAppGroup[] }>>([]);
  const [previousGroupsForComparison, setPreviousGroupsForComparison] = useState<WhatsAppGroup[] | null>(null);
  const [baseGroups, setBaseGroups] = useState<WhatsAppGroup[] | null>(null);
  const [groupCumulative, setGroupCumulative] = useState<Record<string, { total_novos: number; total_saidas: number }>>({});

  const [traficoGruposCampaigns, setTraficoGruposCampaigns] = useState<TraficoGruposCampaignDetail[]>([]);
  const [traficoGruposLoading, setTraficoGruposLoading] = useState(false);
  const [traficoGruposError, setTraficoGruposError] = useState<string | null>(null);
  const [expandedTraficoCampaigns, setExpandedTraficoCampaigns] = useState<Record<string, boolean>>({});
  const [expandedTraficoAdSets, setExpandedTraficoAdSets] = useState<Record<string, boolean>>({});
  const [selectedTraficoCampaignIds, setSelectedTraficoCampaignIds] = useState<Set<string>>(new Set());
  const [traficoGruposCache, setTraficoGruposCache, isTraficoCacheLoading] = useIdbKeyState<Record<string, { campaigns: TraficoGruposCampaignDetail[]; fetchedAt: string }>>("gpl_trafico_grupos_cache", {});
  const [campaignsOpen, setCampaignsOpen] = useState(false);

  // 1) Checar chaves
  useEffect(() => {
    if (isApiRowsCacheLoading || isApiRangeCacheLoading) return;
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/settings/shopee");
        const json = await res.json();
        if (!res.ok) throw new Error();
        const ok = !!json?.has_key && !!json?.shopee_app_id;
        if (!alive) return;
        if (!ok) { setApiCheckState("noKeys"); writeApiCheckToLocalStorage("noKeys"); return; }
        setApiCheckState("hasKeys"); writeApiCheckToLocalStorage("hasKeys");
        const hasCachedRows = (apiRowsCache?.length ?? 0) > 0;
        const hasCachedRange = !!apiRangeCache?.fromApplied && !!apiRangeCache?.toApplied;
        if (hasCachedRows && hasCachedRange) {
          setStartDateDraft(apiRangeCache.fromDraft || apiRangeCache.fromApplied);
          setEndDateDraft(apiRangeCache.toDraft || apiRangeCache.toApplied);
          setStartDateApplied(apiRangeCache.fromApplied);
          setEndDateApplied(apiRangeCache.toApplied);
          setApiFetchedOnce(true);
          return;
        }
        const y = getYesterday();
        setStartDateDraft((prev) => prev || y);
        setEndDateDraft((prev) => prev || y);
        setStartDateApplied(y);
        setEndDateApplied(y);
        setApiRangeCache({ fromDraft: y, toDraft: y, fromApplied: y, toApplied: y });
        setApiFetchTick((t) => t + 1);
      } catch {
        if (!alive) return;
        setApiCheckState("noKeys"); writeApiCheckToLocalStorage("noKeys");
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiRowsCacheLoading, isApiRangeCacheLoading]);

  useEffect(() => {
    if (hasShopeeKeys) return;
    setStartDateApplied(startDateDraft);
    setEndDateApplied(endDateDraft);
  }, [hasShopeeKeys, startDateDraft, endDateDraft]);

  useEffect(() => {
    if (!startDateDraft || !endDateDraft) { setDraftDays(0); setShowShortPeriodWarning(false); setShowMaxPeriodWarning(false); return; }
    const start = new Date(startDateDraft + "T00:00:00");
    const end = new Date(endDateDraft + "T00:00:00");
    if (end < start) { setEndDateDraft(""); setDraftDays(0); setShowShortPeriodWarning(false); setShowMaxPeriodWarning(false); return; }
    const inclusiveDays = getInclusiveDays(startDateDraft, endDateDraft);
    if (inclusiveDays > 30) { setEndDateDraft(""); setDraftDays(0); setShowShortPeriodWarning(false); setShowMaxPeriodWarning(false); return; }
    setDraftDays(inclusiveDays);
    setShowShortPeriodWarning(inclusiveDays < 3);
    setShowMaxPeriodWarning(inclusiveDays === 30);
  }, [startDateDraft, endDateDraft]);

  const availableDateRange = useMemo(() => {
    if (hasShopeeKeys) return { min: get3MonthsAgo(), max: getYesterday() };
    return null as null | { min: string; max: string };
  }, [hasShopeeKeys]);

  const maxEndDate = useMemo(() => {
    const range = availableDateRange;
    if (!startDateDraft || !range) return range?.max || "";
    const start = new Date(startDateDraft + "T00:00:00");
    const maxAllowed = new Date(start);
    maxAllowed.setDate(start.getDate() + 29);
    const reportMax = new Date(range.max + "T00:00:00");
    const finalMax = maxAllowed < reportMax ? maxAllowed : reportMax;
    return localYMD(finalMax);
  }, [startDateDraft, availableDateRange]);

  useEffect(() => {
    if (!hasShopeeKeys || !startDateApplied || !endDateApplied) return;
    let alive = true;
    (async () => {
      setIsApiLoading(true); setApiError(null);
      try {
        const res = await fetch(`/api/shopee/conversion-report?start=${encodeURIComponent(startDateApplied)}&end=${encodeURIComponent(endDateApplied)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Erro ao buscar dados da Shopee");
        if (!alive) return;
        const rows = (json?.data ?? []) as CommissionDataRow[];
        setApiRowsCache(rows);
        setApiRangeCache({ fromDraft: startDateDraft || startDateApplied, toDraft: endDateDraft || endDateApplied, fromApplied: startDateApplied, toApplied: endDateApplied });
        setApiFetchedOnce(true);
      } catch (e) {
        if (!alive) return;
        setApiRowsCache([]); setApiFetchedOnce(true); setApiError(e instanceof Error ? e.message : "Erro");
      } finally {
        if (alive) setIsApiLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShopeeKeys, startDateApplied, endDateApplied, apiFetchTick]);

  const sourceRows = useMemo(() => {
    if (hasShopeeKeys) return apiRowsCache ?? [];
    return idbRawData ?? [];
  }, [hasShopeeKeys, apiRowsCache, idbRawData]);

  const filteredData = useMemo(() => {
    return (sourceRows ?? []).filter((row) => {
      const chOk = TARGET_CHANNELS.includes(normalizeChannel(extractChannel(row as CommissionDataRow)));
      const stOk = TARGET_ORDER_STATUSES.includes(normalizeOrderStatus(extractOrderStatus(row as CommissionDataRow)));
      return chOk && stOk;
    });
  }, [sourceRows]);

  const idbDateRange = useMemo(() => {
    if (hasShopeeKeys) return null;
    if (!filteredData || filteredData.length === 0) return null;
    const ymds: string[] = [];
    for (const row of filteredData) {
      const dateStr = (row as CommissionDataRow)["Horário do pedido"];
      if (!dateStr) continue;
      const d = new Date(String(dateStr));
      if (!Number.isNaN(d.getTime())) ymds.push(localYMD(d));
    }
    if (ymds.length === 0) return null;
    ymds.sort();
    return { min: ymds[0], max: ymds[ymds.length - 1] };
  }, [hasShopeeKeys, filteredData]);

  const effectiveRange = hasShopeeKeys ? availableDateRange : idbDateRange;

  const maxEndDateEffective = useMemo(() => {
    const range = effectiveRange;
    if (!startDateDraft || !range) return range?.max || "";
    const start = new Date(startDateDraft + "T00:00:00");
    const maxAllowed = new Date(start);
    maxAllowed.setDate(start.getDate() + 29);
    const reportMax = new Date(range.max + "T00:00:00");
    const finalMax = maxAllowed < reportMax ? maxAllowed : reportMax;
    return localYMD(finalMax);
  }, [startDateDraft, effectiveRange]);

  useEffect(() => {
    if (!startDateApplied || !endDateApplied) { setDaysInPeriod(0); return; }
    const start = new Date(startDateApplied + "T00:00:00");
    const end = new Date(endDateApplied + "T00:00:00");
    if (end < start) { setDaysInPeriod(0); return; }
    setDaysInPeriod(getInclusiveDays(startDateApplied, endDateApplied));
  }, [startDateApplied, endDateApplied]);

  useEffect(() => {
    if (!filteredData || filteredData.length === 0 || !startDateApplied || !endDateApplied) { setTotalProfit(0); return; }
    let profitSum = 0;
    for (const row of filteredData) {
      const dateStr = (row as CommissionDataRow)["Horário do pedido"];
      if (!dateStr) continue;
      const orderDate = new Date(String(dateStr));
      if (Number.isNaN(orderDate.getTime())) continue;
      const orderYMD = localYMD(orderDate);
      if (orderYMD < startDateApplied || orderYMD > endDateApplied) continue;
      profitSum += parseMoneyPt((row as CommissionDataRow)["Comissão líquida do afiliado(R$)"]);
    }
    setTotalProfit(profitSum);
  }, [filteredData, startDateApplied, endDateApplied]);

  useEffect(() => {
    const groupNum = parseFloat(groupSize || "0");
    if (isNaN(groupNum) || groupNum <= 0 || daysInPeriod === 0) { setGplPeriod(0); setGplMonthly(0); setMonthlyRevenue(0); return; }
    const gplInPeriod = totalProfit / groupNum;
    setGplPeriod(gplInPeriod);
    const gplMonth = (gplInPeriod / daysInPeriod) * 30;
    setGplMonthly(gplMonth);
    setMonthlyRevenue(gplMonth * groupNum);
  }, [groupSize, totalProfit, daysInPeriod]);

  useEffect(() => {
    let alive = true;
    fetch("/api/evolution/instances").then((r) => r.json()).then((data) => {
      if (alive && Array.isArray(data.instances)) setEvolutionInstances(data.instances);
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const selectedInstance = evolutionInstances.find((i) => i.id === selectedInstanceId);
  const selectedInstanceName = selectedInstance?.nome_instancia ?? "";

  const loadGroupSnapshots = async (instanceId: string, start?: string, end?: string) => {
    setGroupsLoading(true); setGroupsError(null);
    try {
      const params = new URLSearchParams({ instance_id: instanceId });
      if (start && end) { params.set("start", start); params.set("end", end); }
      const res = await fetch(`/api/gpl/group-snapshots?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao carregar snapshots");
      const snapshots = Array.isArray(json.snapshots) ? json.snapshots : [];
      const normalized = snapshots.map((s: { date: string; groups: unknown[]; created_at?: string }) => ({
        date: s.date,
        groups: ((s.groups ?? []) as Array<{ id?: string; nome?: string; qtdMembros?: number }>).map((g) => ({ id: String(g?.id ?? ""), nome: String(g?.nome ?? ""), qtdMembros: Number(g?.qtdMembros ?? 0) })),
      })) as Array<{ date: string; groups: WhatsAppGroup[] }>;
      setGroupSnapshots(normalized);
      const latest = normalized[0];
      const groupsFromSnapshot = latest?.groups ?? [];
      setGroups(groupsFromSnapshot);
      setGroupsCache((prev) => ({ ...prev, [instanceId]: groupsFromSnapshot }));
      setGroupsLastFetchedAt(snapshots[0]?.created_at ?? null);
      setPreviousGroupsForComparison(null);
      const baseRaw = json.base?.groups;
      const baseNormalized = Array.isArray(baseRaw)
        ? (baseRaw as Array<{ id?: string; nome?: string; qtdMembros?: number }>).map((g) => ({ id: String(g?.id ?? ""), nome: String(g?.nome ?? ""), qtdMembros: Number(g?.qtdMembros ?? 0) }))
        : [];
      setBaseGroups(baseNormalized.length > 0 ? baseNormalized : null);
      const cum = json.cumulative ?? [];
      const cumMap: Record<string, { total_novos: number; total_saidas: number }> = {};
      for (const c of cum) {
        if (c?.group_id) cumMap[c.group_id] = { total_novos: Number(c.total_novos ?? 0), total_saidas: Number(c.total_saidas ?? 0) };
      }
      setGroupCumulative(cumMap);
    } catch (e) {
      setGroups([]); setBaseGroups(null); setGroupCumulative({});
      setGroupsError(e instanceof Error ? e.message : "Erro ao carregar grupos salvos");
      setGroupsCache((prev) => ({ ...prev, [instanceId]: [] }));
      setGroupSnapshots([]); setGroupsLastFetchedAt(null);
    } finally {
      setGroupsLoading(false);
    }
  };

  const fetchGroupsForInstance = async (instanceId: string, nomeInstancia: string) => {
    setGroupsLoading(true); setGroupsError(null);
    setPreviousGroupsForComparison(groups.length > 0 ? [...groups] : null);
    try {
      const res = await fetch("/api/evolution/n8n-action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipoAcao: "buscar_grupo", nomeInstancia }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha ao buscar grupos");
      const lista = json?.grupos ?? [];
      const normalized: WhatsAppGroup[] = lista.map((g: { id?: string; nome?: string; subject?: string; name?: string; qtdMembros?: number; size?: number; participants?: unknown[] }) => ({
        id: String(g.id ?? ""),
        nome: String(g.nome ?? g.subject ?? g.name ?? "Sem nome"),
        qtdMembros: Number(g.qtdMembros ?? g.size ?? (Array.isArray(g.participants) ? g.participants.length : 0)),
      }));
      setGroups(normalized);
      setGroupsCache((prev) => ({ ...prev, [instanceId]: normalized }));
      const saveRes = await fetch("/api/gpl/group-snapshots", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instance_id: instanceId, groups: normalized }) });
      if (saveRes.ok) {
        setGroupsLastFetchedAt(new Date().toISOString());
        setGroupSnapshots((prev) => [{ date: new Date().toISOString().slice(0, 10), groups: normalized }, ...prev]);
        const start = startDateApplied || getYesterday();
        const end = endDateApplied || getYesterday();
        const params = new URLSearchParams({ instance_id: instanceId });
        if (start && end) { params.set("start", start); params.set("end", end); }
        fetch(`/api/gpl/group-snapshots?${params.toString()}`, { cache: "no-store" }).then((r) => r.json()).then((data) => {
          const baseRaw = data.base?.groups;
          const baseNorm = Array.isArray(baseRaw) ? (baseRaw as Array<{ id?: string; nome?: string; qtdMembros?: number }>).map((g) => ({ id: String(g?.id ?? ""), nome: String(g?.nome ?? ""), qtdMembros: Number(g?.qtdMembros ?? 0) })) : [];
          setBaseGroups(baseNorm.length > 0 ? baseNorm : null);
          const cum = data.cumulative ?? [];
          const cumMap: Record<string, { total_novos: number; total_saidas: number }> = {};
          for (const c of cum) { if (c?.group_id) cumMap[c.group_id] = { total_novos: Number(c.total_novos ?? 0), total_saidas: Number(c.total_saidas ?? 0) }; }
          setGroupCumulative(cumMap);
        }).catch(() => {});
      } else {
        setGroupsLastFetchedAt(new Date().toISOString());
        setGroupSnapshots([{ date: new Date().toISOString().slice(0, 10), groups: normalized }]);
      }
    } catch (e) {
      setGroups([]); setGroupsError(e instanceof Error ? e.message : "Erro ao buscar grupos"); setGroupsCache((prev) => ({ ...prev, [instanceId]: [] }));
    } finally {
      setGroupsLoading(false);
    }
  };

  // Auto-load ao selecionar instância
  useEffect(() => {
    if (!selectedInstanceId || !selectedInstanceName) { setGroups([]); setBaseGroups(null); setGroupCumulative({}); setGroupsError(null); setGroupSnapshots([]); setGroupsLastFetchedAt(null); return; }
    const start = startDateApplied || getYesterday();
    const end = endDateApplied || getYesterday();
    loadGroupSnapshots(selectedInstanceId, start, end);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInstanceId, selectedInstanceName, startDateApplied, endDateApplied]);

  const filteredGroups = useMemo(() => {
    if (!groupNameFilter.trim()) return groups;
    const q = normalizeStr(groupNameFilter);
    return groups.filter((g) => normalizeStr(g.nome).includes(q));
  }, [groups, groupNameFilter]);

  const groupMemberDelta = useMemo(() => {
    const map = new Map<string, { anterior: number; delta: number }>();
    let anteriorList: WhatsAppGroup[];
    let atualList: WhatsAppGroup[];
    if (baseGroups !== null) { anteriorList = baseGroups; atualList = groups; }
    else if (previousGroupsForComparison !== null) { anteriorList = previousGroupsForComparison; atualList = groups; }
    else if (groupSnapshots.length >= 2) { anteriorList = groupSnapshots[groupSnapshots.length - 1].groups; atualList = groupSnapshots[0].groups; }
    else return map;
    const porIdAnterior = new Map<string, number>();
    for (const g of anteriorList) porIdAnterior.set(g.id, g.qtdMembros);
    for (const g of atualList) {
      const anterior = porIdAnterior.get(g.id) ?? g.qtdMembros;
      map.set(g.id, { anterior, delta: g.qtdMembros - anterior });
    }
    return map;
  }, [baseGroups, previousGroupsForComparison, groupSnapshots, groups]);

  const totalMembersSelected = useMemo(() => groups.filter((g) => selectedGroupIds.has(g.id)).reduce((acc, g) => acc + g.qtdMembros, 0), [groups, selectedGroupIds]);
  useEffect(() => { if (totalMembersSelected > 0) setGroupSize(String(totalMembersSelected)); }, [totalMembersSelected]);

  const toggleGroupSelection = (id: string) => {
    setSelectedGroupIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleTraficoCampaign = (id: string) => setExpandedTraficoCampaigns((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleTraficoAdSet = (id: string) => setExpandedTraficoAdSets((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleTraficoCampaignSelection = (id: string) => {
    setSelectedTraficoCampaignIds((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const custoTráfegoGrupos = useMemo(() => traficoGruposCampaigns.filter((c) => selectedTraficoCampaignIds.has(c.id)).reduce((acc, c) => acc + c.spend, 0), [traficoGruposCampaigns, selectedTraficoCampaignIds]);
  const totalCliquesMeta = useMemo(() => traficoGruposCampaigns.filter((c) => selectedTraficoCampaignIds.has(c.id)).reduce((acc, c) => acc + c.adSets.reduce((s, aset) => s + aset.ads.reduce((a, ad) => a + (ad.clicks ?? 0), 0), 0), 0), [traficoGruposCampaigns, selectedTraficoCampaignIds]);

  const totalNovos = useMemo(() => groups.filter((g) => selectedGroupIds.has(g.id)).reduce((acc, g) => acc + (groupCumulative[g.id]?.total_novos ?? 0), 0), [groups, selectedGroupIds, groupCumulative]);
  const pessoasNoGrupo = useMemo(() => { const n = parseInt(String(groupSize).replace(/\D/g, ""), 10); return Number.isFinite(n) && n > 0 ? n : totalMembersSelected; }, [groupSize, totalMembersSelected]);
  const totalSaidas = useMemo(() => groups.filter((g) => selectedGroupIds.has(g.id)).reduce((acc, g) => acc + (groupCumulative[g.id]?.total_saidas ?? 0), 0), [groups, selectedGroupIds, groupCumulative]);
  const cplInicial = useMemo(() => { if (custoTráfegoGrupos <= 0 || totalNovos <= 0) return 0; return custoTráfegoGrupos / totalNovos; }, [custoTráfegoGrupos, totalNovos]);
  const prejuizoSaidas = useMemo(() => { if (totalSaidas <= 0 || cplInicial <= 0) return 0; return totalSaidas * cplInicial; }, [totalSaidas, cplInicial]);
  const cplMeta = useMemo(() => { if (custoTráfegoGrupos <= 0 || totalCliquesMeta <= 0) return 0; return custoTráfegoGrupos / totalCliquesMeta; }, [custoTráfegoGrupos, totalCliquesMeta]);
  const cplReal = useMemo(() => { if (custoTráfegoGrupos <= 0) return 0; const liquido = totalNovos - totalSaidas; if (liquido <= 0) return 0; return custoTráfegoGrupos / liquido; }, [custoTráfegoGrupos, totalNovos, totalSaidas]);

  const fetchTraficoGrupos = async () => {
    const start = startDateApplied || getYesterday();
    const end = endDateApplied || getYesterday();
    setTraficoGruposLoading(true); setTraficoGruposError(null);
    try {
      const res = await fetch(`/api/ati/trafico-grupos?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Erro ao carregar campanhas");
      const campaigns = Array.isArray(json.campaigns) ? json.campaigns : [];
      setTraficoGruposCampaigns(campaigns);
      const periodKey = `${start}_${end}`;
      setTraficoGruposCache((prev) => ({ ...prev, [periodKey]: { campaigns, fetchedAt: new Date().toISOString() } }));
    } catch (e) {
      setTraficoGruposError(e instanceof Error ? e.message : "Erro ao carregar campanhas");
    } finally {
      setTraficoGruposLoading(false);
    }
  };

  useEffect(() => {
    if (isTraficoCacheLoading) return;
    const start = startDateApplied || getYesterday();
    const end = endDateApplied || getYesterday();
    const periodKey = `${start}_${end}`;
    const cached = traficoGruposCache[periodKey];
    setTraficoGruposCampaigns(cached?.campaigns ?? []);
  }, [startDateApplied, endDateApplied, traficoGruposCache, isTraficoCacheLoading]);

  const performanceBadge = useMemo(() => {
    if (gplMonthly >= 1.5) return { color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", label: "Excelente", icon: "🟢" };
    if (gplMonthly >= 0.8) return { color: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25", label: "Boa performance", icon: "🟡" };
    if (gplMonthly > 0) return { color: "bg-red-500/15 text-red-400 border-red-500/25", label: "Precisa melhorar", icon: "🔴" };
    return null;
  }, [gplMonthly]);

  const showResults = gplPeriod > 0;

  function onClickBuscar() {
    if (!hasShopeeKeys || !startDateDraft || !endDateDraft) return;
    setStartDateApplied(startDateDraft); setEndDateApplied(endDateDraft);
    setApiRangeCache({ fromDraft: startDateDraft, toDraft: endDateDraft, fromApplied: startDateDraft, toApplied: endDateDraft });
    setApiFetchTick((t) => t + 1);
    if (selectedInstanceId && selectedInstanceName) fetchGroupsForInstance(selectedInstanceId, selectedInstanceName);
  }

  const canSearchApi = hasShopeeKeys && !!startDateDraft && !!endDateDraft && draftDays > 0 && !isApiLoading && !apiError;
  const hasAnySource = hasShopeeKeys || (idbRawData && idbRawData.length > 0);
  const hasFilteredData = hasShopeeKeys ? apiFetchedOnce ? filteredData.length > 0 : true : filteredData.length > 0;

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!session) return <LoadingOverlay message="Carregando sessão..." />;
  if (apiCheckState === "checking") return <LoadingOverlay message="Verificando integração com a Shopee..." />;
  if (!hasShopeeKeys && isDataLoading) return <LoadingOverlay message="Carregando dados..." />;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <style jsx>{`
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(56%) sepia(93%) saturate(1573%) hue-rotate(358deg) brightness(100%) contrast(103%); cursor: pointer; }
        input[type="date"]:disabled::-webkit-calendar-picker-indicator { filter: opacity(0.5); }
        .date-empty::-webkit-datetime-edit-text, .date-empty::-webkit-datetime-edit-month-field, .date-empty::-webkit-datetime-edit-day-field, .date-empty::-webkit-datetime-edit-year-field { color: rgb(156 163 175) !important; }
        .date-filled::-webkit-datetime-edit-text, .date-filled::-webkit-datetime-edit-month-field, .date-filled::-webkit-datetime-edit-day-field, .date-filled::-webkit-datetime-edit-year-field { color: rgb(243 244 246) !important; }
      `}</style>

      {/* ─── CABEÇALHO ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 rounded-lg bg-shopee-orange/15">
              <Calculator className="h-5 w-5 text-shopee-orange" />
            </div>
            <h1 className="text-2xl font-bold text-text-primary font-heading">Calculadora GPL</h1>
            <Tooltip text="GPL = Ganho por Lead. Quanto cada membro do grupo gera de comissão, em média, no período selecionado." wide />
          </div>
          <p className="text-sm text-text-secondary ml-9">
            Canais: <span className="text-text-primary font-medium">WhatsApp · Websites · Others</span>
            {startDateApplied && endDateApplied && (
              <span className="ml-2 text-text-secondary/70">
                · {formatDateBR(startDateApplied)} a {formatDateBR(endDateApplied)}
                {daysInPeriod > 0 && <span className="text-shopee-orange/80"> ({daysInPeriod}d)</span>}
              </span>
            )}
          </p>
        </div>

        {/* Fonte de dados badge */}
        <div className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${hasShopeeKeys ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-blue-500/10 text-blue-400 border-blue-500/20"}`}>
          {hasShopeeKeys ? <><CheckCircle2 className="h-3.5 w-3.5" /> API Shopee</> : <><BarChart3 className="h-3.5 w-3.5" /> Relatório local</>}
        </div>
      </div>

      {/* ─── ERRO DE API ───────────────────────────────────────────────────── */}
      {apiError && (
        <div className="flex items-start gap-3 p-4 bg-red-500/8 border border-red-500/25 rounded-xl">
          <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-300">Erro ao buscar dados da Shopee</p>
            <p className="text-xs text-red-400/80 mt-0.5">{apiError}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href="/configuracoes" className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs font-medium transition-colors">Configurações</Link>
            <button onClick={() => { setApiError(null); setApiFetchTick((t) => t + 1); }} className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs font-medium transition-colors">Tentar novamente</button>
          </div>
        </div>
      )}

      {!hasAnySource ? (
        /* ── Sem dados ── */
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-5 rounded-2xl bg-dark-card border border-dark-border mb-4">
            <Calculator className="h-12 w-12 text-text-secondary/40" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary mb-2">Nenhum dado disponível</h2>
          <p className="text-sm text-text-secondary max-w-xs mb-6">Faça upload do relatório na seção &quot;Análise de Comissões&quot; ou cadastre suas chaves da Shopee.</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-shopee-orange hover:bg-shopee-orange/90 text-white font-semibold rounded-xl text-sm transition-colors">
            Ir para Análise <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          {/* ─── SEÇÃO 1: CONFIGURAÇÃO + RESULTADOS ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

            {/* ── Configurações (3 cols) ── */}
            <div className="lg:col-span-3 bg-dark-card rounded-xl border border-dark-border p-5 space-y-5">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Configuração</p>

              {/* Período */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Calendar className="h-4 w-4 text-sky-400" />
                  <span className="text-sm font-medium text-text-primary">Período de análise</span>
                  <Tooltip text="Selecione um intervalo de até 30 dias. Períodos mais longos geram projeções mais precisas." wide />
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <div className="flex-1 min-w-0">
                      <label className="text-[11px] text-text-secondary/80 mb-1 block">De</label>
                      <input type="date" value={startDateDraft} min={effectiveRange?.min} max={effectiveRange?.max}
                        onChange={(e) => setStartDateDraft(e.target.value)}
                        className={`w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm focus:outline-none focus:border-shopee-orange focus:ring-1 focus:ring-shopee-orange transition-all ${startDateDraft ? "date-filled" : "date-empty"}`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <label className="text-[11px] text-text-secondary/80 mb-1 block">Até</label>
                      <input type="date" value={endDateDraft} min={startDateDraft || effectiveRange?.min} max={maxEndDateEffective}
                        disabled={!startDateDraft} onChange={(e) => setEndDateDraft(e.target.value)}
                        className={`w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-sm focus:outline-none focus:border-shopee-orange focus:ring-1 focus:ring-shopee-orange transition-all disabled:opacity-40 disabled:cursor-not-allowed ${endDateDraft ? "date-filled" : "date-empty"}`}
                      />
                    </div>
                    {/* Buscar visível ao lado apenas em sm+ */}
                    {hasShopeeKeys && (
                      <div className="hidden sm:flex items-end shrink-0">
                        <button type="button" onClick={onClickBuscar} disabled={!canSearchApi}
                          className="px-4 py-2 rounded-lg bg-shopee-orange text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-1.5"
                        >
                          {isApiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                          Buscar
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Buscar full-width abaixo apenas em mobile */}
                  {hasShopeeKeys && (
                    <button type="button" onClick={onClickBuscar} disabled={!canSearchApi}
                      className="sm:hidden w-full py-2.5 rounded-lg bg-shopee-orange text-white text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center gap-2"
                    >
                      {isApiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      Buscar dados
                    </button>
                  )}
                </div>
                {draftDays > 0 && (
                  <p className="text-[11px] text-text-secondary mt-1.5">{draftDays} dia{draftDays !== 1 ? "s" : ""} selecionado{draftDays !== 1 ? "s" : ""}</p>
                )}
                {showShortPeriodWarning && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-yellow-500/8 border border-yellow-500/20 rounded-lg">
                    <AlertCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    <p className="text-xs text-yellow-400">Períodos curtos geram projeções imprecisas.</p>
                  </div>
                )}
                {showMaxPeriodWarning && (
                  <div className="flex items-center gap-2 mt-2 px-3 py-2 bg-blue-500/8 border border-blue-500/20 rounded-lg">
                    <Info className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                    <p className="text-xs text-blue-400">Período máximo de 30 dias atingido.</p>
                  </div>
                )}
              </div>

              <div className="border-t border-dark-border/50" />

              {/* Pessoas no grupo */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="h-4 w-4 text-indigo-400" />
                  <span className="text-sm font-medium text-text-primary">Pessoas no grupo</span>
                  <Tooltip text="Total de membros nos grupos onde você divulga. Selecione grupos abaixo para preencher automaticamente." wide />
                </div>
                <input id="groupSize" type="number" min="1" step="1" placeholder="Ex: 4741" value={groupSize}
                  onChange={(e) => setGroupSize(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-bg border border-dark-border rounded-lg text-text-primary focus:outline-none focus:border-shopee-orange focus:ring-1 focus:ring-shopee-orange transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                {totalMembersSelected > 0 && (
                  <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <Users className="h-3 w-3" /> {totalMembersSelected.toLocaleString("pt-BR")} membros selecionados (automático)
                  </p>
                )}
              </div>

              {/* Comissão líquida */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-text-primary">Comissão Líquida</span>
                  <Tooltip text="Total de comissões do período selecionado, filtrado pelos canais WhatsApp, Websites e Others. Calculado automaticamente." wide />
                </div>
                <div className="w-full px-4 py-2.5 bg-dark-bg/50 border border-dark-border rounded-lg text-text-primary font-semibold text-lg flex items-center gap-2">
                  {isApiLoading ? <Loader2 className="h-4 w-4 animate-spin text-text-secondary" /> : null}
                  <span className={isApiLoading ? "text-text-secondary" : ""}>{formatCurrency(totalProfit)}</span>
                </div>
              </div>

              {/* Custo de tráfego (condicional) */}
              {selectedTraficoCampaignIds.size > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="h-4 w-4 text-shopee-orange" />
                    <span className="text-sm font-medium text-text-primary">Custo de Tráfego para Grupos</span>
                    <Tooltip text="Soma do gasto das campanhas com tag 'Tráfego para Grupos' selecionadas abaixo." wide />
                  </div>
                  <div className="w-full px-4 py-2.5 bg-shopee-orange/8 border border-shopee-orange/30 rounded-lg text-shopee-orange font-semibold text-lg">
                    {formatCurrency(custoTráfegoGrupos)}
                  </div>
                </div>
              )}
            </div>

            {/* ── Resultados (2 cols) ── */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="bg-dark-card rounded-xl border border-dark-border p-5 flex-1">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-4 w-4 text-shopee-orange" />
                  <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Resultados GPL</p>
                  {performanceBadge && (
                    <span className={`ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full border ${performanceBadge.color}`}>
                      {performanceBadge.icon} {performanceBadge.label}
                    </span>
                  )}
                </div>

                {showResults ? (
                  <div className="space-y-3">
                    <div className="bg-dark-bg rounded-lg p-3 border border-dark-border">
                      <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                        GPL no período ({daysInPeriod}d) <Tooltip text="Comissão total ÷ nº de membros no período selecionado." />
                      </div>
                      <p className="text-2xl font-bold text-text-primary">{formatCurrency(gplPeriod)}</p>
                      <p className="text-[11px] text-text-secondary">por lead</p>
                    </div>
                    <div className="bg-dark-bg rounded-lg p-3 border border-shopee-orange/25 bg-shopee-orange/5">
                      <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                        GPL projetado/mês <Tooltip text="Extrapolação do GPL para 30 dias com base no período analisado." />
                      </div>
                      <p className="text-2xl font-bold text-shopee-orange">{formatCurrency(gplMonthly)}</p>
                      <p className="text-[11px] text-text-secondary">por lead/mês</p>
                    </div>
                    <div className="bg-dark-bg rounded-lg p-3 border border-emerald-500/25">
                      <div className="flex items-center gap-1 text-xs text-text-secondary mb-1">
                        Receita mensal estimada <Tooltip text="GPL projetado × número de membros. Estimativa de receita total do grupo por mês." />
                      </div>
                      <p className="text-2xl font-bold text-emerald-400">{formatCurrency(monthlyRevenue)}</p>
                      <p className="text-[11px] text-text-secondary">total/mês</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
                    <div className="p-3 rounded-full bg-dark-bg border border-dark-border">
                      <Zap className="h-6 w-6 text-text-secondary/40" />
                    </div>
                    <p className="text-xs text-text-secondary max-w-[160px]">
                      Preencha o número de membros para calcular o GPL.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── SEÇÃO 2: INSTÂNCIAS E GRUPOS ───────────────────────────────── */}
          <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
            {/* Header com instâncias */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-dark-border bg-dark-bg/30">
              <div className="flex items-center gap-2 shrink-0">
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-semibold text-text-primary">Grupos WhatsApp</span>
                <Tooltip text="Selecione grupos para somar automaticamente o número de membros no campo 'Pessoas no grupo' acima." wide />
              </div>

              {evolutionInstances.length === 0 ? (
                <p className="text-xs text-text-secondary">Nenhuma instância Evolution conectada.</p>
              ) : (
                <div className="flex flex-wrap gap-2 sm:ml-auto">
                  {evolutionInstances.map((inst) => (
                    <button key={inst.id} type="button"
                      onClick={() => { setSelectedInstanceId(inst.id); setSelectedGroupIds(new Set()); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${selectedInstanceId === inst.id ? "bg-shopee-orange text-white border-shopee-orange shadow-sm" : "bg-dark-bg text-text-secondary border-dark-border hover:border-shopee-orange/40 hover:text-text-primary"}`}
                    >
                      {inst.nome_instancia}
                    </button>
                  ))}
                  {selectedInstanceId && (
                    <button type="button" onClick={() => { setSelectedInstanceId(""); setSelectedGroupIds(new Set()); }}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dark-border text-text-secondary hover:text-red-400 hover:border-red-400/40 transition-colors"
                    >✕ Limpar</button>
                  )}
                </div>
              )}
            </div>

            {/* Conteúdo dos grupos */}
            <div className="p-4">
              {!selectedInstanceId ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="p-3 rounded-full bg-dark-bg border border-dark-border mb-3">
                    <MessageCircle className="h-6 w-6 text-text-secondary/30" />
                  </div>
                  <p className="text-sm text-text-secondary">Selecione uma instância acima para ver os grupos</p>
                </div>
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
                      <input type="text" placeholder="Filtrar grupos..." value={groupNameFilter}
                        onChange={(e) => setGroupNameFilter(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-dark-border bg-dark-bg text-text-primary text-sm placeholder-text-secondary/50 focus:outline-none focus:border-shopee-orange transition-colors"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {groupsLastFetchedAt && (
                        <p className="text-[11px] text-text-secondary hidden sm:block shrink-0">
                          Snapshot: {new Date(groupsLastFetchedAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      )}
                      <button type="button"
                        onClick={() => selectedInstanceId && selectedInstanceName && fetchGroupsForInstance(selectedInstanceId, selectedInstanceName)}
                        disabled={groupsLoading}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-shopee-orange text-white text-sm font-semibold hover:bg-shopee-orange/90 disabled:opacity-50 transition-opacity shrink-0"
                      >
                        {groupsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        Atualizar
                      </button>
                    </div>
                  </div>

                  {/* Resumo da seleção */}
                  {selectedGroupIds.size > 0 && (
                    <div className="mb-3 px-3 py-2 bg-shopee-orange/8 border border-shopee-orange/20 rounded-lg flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                      <span className="text-shopee-orange font-medium">
                        {selectedGroupIds.size} grupo{selectedGroupIds.size !== 1 ? "s" : ""} selecionado{selectedGroupIds.size !== 1 ? "s" : ""}
                      </span>
                      <span className="text-text-secondary">·</span>
                      <span className="text-emerald-400 font-semibold">{totalMembersSelected.toLocaleString("pt-BR")} membros → preenchido automaticamente acima</span>
                      <button type="button" onClick={() => { setSelectedGroupIds(new Set()); setGroupSize(""); }} className="ml-auto text-text-secondary/60 hover:text-red-400 transition-colors">limpar seleção</button>
                    </div>
                  )}

                  {/* Estado de erro */}
                  {groupsError && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-red-500/8 border border-red-500/20 rounded-lg mb-3">
                      <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                      <p className="text-xs text-red-400">{groupsError}</p>
                    </div>
                  )}

                  {/* Loading */}
                  {groupsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-text-secondary">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">Carregando grupos...</span>
                    </div>
                  ) : filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
                      <p className="text-sm text-text-secondary">
                        {groups.length === 0 ? "Nenhum dado salvo. Clique em Atualizar para buscar grupos via API." : "Nenhum grupo encontrado para o filtro digitado."}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                      {filteredGroups.map((g) => {
                        const cum = groupCumulative[g.id];
                        const delta = groupMemberDelta.get(g.id);
                        const novosValor = cum ? cum.total_novos : (delta !== undefined && delta.delta > 0 ? delta.delta : 0);
                        const sairamValor = cum ? cum.total_saidas : (delta !== undefined && delta.delta < 0 ? Math.abs(delta.delta) : 0);
                        const temComparacao = cum !== undefined || delta !== undefined;
                        const evasao = sairamValor > 0;
                        const isSelected = selectedGroupIds.has(g.id);
                        return (
                          <div key={g.id}
                            onClick={() => toggleGroupSelection(g.id)}
                            className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all select-none ${
                              evasao ? "bg-red-500/8 border-red-500/30 hover:bg-red-500/12" :
                              isSelected ? "bg-shopee-orange/8 border-shopee-orange/40 shadow-[0_0_0_1px_rgba(238,77,45,0.25)]" :
                              "bg-dark-bg/60 border-dark-border hover:border-dark-border/80 hover:bg-dark-bg"
                            }`}
                          >
                            <div className="flex items-start gap-2 mb-1.5">
                              <OrangeCheckbox checked={isSelected} onChange={() => toggleGroupSelection(g.id)} className="mt-0.5" />
                              <span className="text-xs font-semibold text-text-primary line-clamp-2 flex-1" title={g.nome}>{g.nome}</span>
                            </div>
                            <div className="pl-7 space-y-0.5">
                              <p className="text-[11px] text-text-secondary font-medium">{g.qtdMembros.toLocaleString("pt-BR")} membros</p>
                              {temComparacao && (
                                <div className="flex gap-2">
                                  <span className={`text-[11px] flex items-center gap-0.5 ${novosValor > 0 ? "text-emerald-400" : "text-text-secondary/60"}`}>
                                    <TrendingUp className="h-3 w-3" /> +{novosValor}
                                  </span>
                                  <span className={`text-[11px] flex items-center gap-0.5 ${sairamValor > 0 ? "text-red-400" : "text-text-secondary/60"}`}>
                                    <TrendingDown className="h-3 w-3" /> -{sairamValor}
                                  </span>
                                </div>
                              )}
                              {evasao && (
                                <div className="flex items-center gap-1 mt-1 text-[10px] text-red-400 font-medium">
                                  <AlertTriangle className="h-3 w-3 shrink-0" /> Alta evasão
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ─── SEÇÃO 3: MINI DASHBOARD (condicional) ──────────────────────── */}
          {traficoGruposCampaigns.length > 0 && (selectedTraficoCampaignIds.size > 0 || pessoasNoGrupo > 0) && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 overflow-hidden">
              <MetricCard label="Custo tráfego" value={formatCurrency(custoTráfegoGrupos)} color="text-shopee-orange" tooltip="Soma do gasto (spend) das campanhas selecionadas no período." />
              <MetricCard label="Membros" value={pessoasNoGrupo.toLocaleString("pt-BR")} color="text-indigo-400" tooltip="Total de membros dos grupos selecionados." />
              <MetricCard label="Entradas" value={`+${totalNovos.toLocaleString("pt-BR")}`} sub={pessoasNoGrupo > 0 ? `${((totalNovos / pessoasNoGrupo) * 100).toFixed(1)}%` : undefined} color="text-emerald-400" tooltip="Quantidade de membros que entraram (acumulado desde a base)." />
              <MetricCard label="Saídas" value={totalSaidas.toLocaleString("pt-BR")} sub={pessoasNoGrupo > 0 ? `${((totalSaidas / pessoasNoGrupo) * 100).toFixed(1)}%` : undefined} color="text-red-400" tooltip="Quantidade de membros que saíram (acumulado desde a base)." />
              <MetricCard label="CPL Inicial" value={custoTráfegoGrupos > 0 && totalNovos > 0 ? formatCurrency(cplInicial) : "—"} color="text-amber-400" tooltip="Custo tráfego ÷ total de entradas." />
              <MetricCard label="CPL Meta" value={custoTráfegoGrupos > 0 && totalCliquesMeta > 0 ? formatCurrency(cplMeta) : "—"} color="text-blue-400" tooltip="Custo por clique no link (Meta). Fórmula: custo tráfego ÷ cliques." />
              <MetricCard label="CPL Real" value={cplReal > 0 ? formatCurrency(cplReal) : "—"} color="text-emerald-400" tooltip="Custo por lead líquido. Fórmula: custo tráfego ÷ (entradas − saídas)." />
              <MetricCard label="Prejuízo" value={totalSaidas > 0 && cplInicial > 0 ? formatCurrency(prejuizoSaidas) : "—"} color="text-red-400" accent tooltip="Valor perdido pelas saídas. Fórmula: saídas × CPL Inicial." />
            </div>
          )}

          {/* ─── SEÇÃO 4: CAMPANHAS (colapsável) ────────────────────────────── */}
          <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
            <button type="button" onClick={() => setCampaignsOpen((v) => !v)}
              className="w-full flex items-center gap-3 p-4 hover:bg-dark-bg/30 transition-colors text-left"
            >
              <div className="p-1.5 rounded-lg bg-shopee-orange/10">
                <Target className="h-4 w-4 text-shopee-orange" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-text-primary">Campanhas de Tráfego para Grupos</p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {traficoGruposCampaigns.length > 0
                    ? `${traficoGruposCampaigns.length} campanha${traficoGruposCampaigns.length !== 1 ? "s" : ""} · ${selectedTraficoCampaignIds.size} selecionada${selectedTraficoCampaignIds.size !== 1 ? "s" : ""}`
                    : "Clique em Atualizar para buscar campanhas com a tag no ATI"}
                </p>
              </div>
              {campaignsOpen ? <ChevronUp className="h-4 w-4 text-text-secondary shrink-0" /> : <ChevronDown className="h-4 w-4 text-text-secondary shrink-0" />}
            </button>

            {campaignsOpen && (
              <div className="border-t border-dark-border p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={fetchTraficoGrupos}
                    disabled={traficoGruposLoading || !startDateApplied || !endDateApplied}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-shopee-orange text-white text-sm font-semibold hover:bg-shopee-orange/90 disabled:opacity-50 transition-opacity"
                  >
                    {traficoGruposLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    Atualizar campanhas
                  </button>
                  {startDateApplied && endDateApplied && (
                    <span className="text-xs text-text-secondary">
                      Período: {formatDateBR(startDateApplied)} a {formatDateBR(endDateApplied)}
                      <Tooltip text="Os dados de campanhas são buscados somente ao clicar em Atualizar. Marque a tag 'Tráfego para Grupos' no ATI para aparecer aqui." wide />
                    </span>
                  )}
                </div>

                {traficoGruposError && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-red-500/8 border border-red-500/20 rounded-lg">
                    <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-400">{traficoGruposError}</p>
                  </div>
                )}

                {traficoGruposLoading ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-text-secondary">
                    <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Carregando campanhas...</span>
                  </div>
                ) : traficoGruposCampaigns.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-text-secondary">Nenhuma campanha no cache para este período.</p>
                    <p className="text-xs text-text-secondary/60 mt-1">Clique em &quot;Atualizar campanhas&quot; para buscar da API.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {traficoGruposCampaigns.map((camp) => {
                      const isOpen = expandedTraficoCampaigns[camp.id];
                      const isSelected = selectedTraficoCampaignIds.has(camp.id);
                      return (
                        <div key={camp.id} className={`rounded-xl border overflow-hidden transition-colors ${isSelected ? "border-shopee-orange/30 bg-shopee-orange/5" : "border-dark-border bg-dark-bg/30"}`}>
                          <div className="flex items-center gap-2.5 p-3">
                            <OrangeCheckbox checked={isSelected} onChange={() => toggleTraficoCampaignSelection(camp.id)} />
                            <button type="button" onClick={() => toggleTraficoCampaign(camp.id)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
                              {isOpen ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-text-secondary" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary" />}
                              <span className="text-sm font-semibold text-text-primary truncate">{camp.name}</span>
                              <span className={`text-xs font-medium shrink-0 ${camp.status === "ACTIVE" ? "text-emerald-400" : "text-text-secondary/60"}`}>
                                {camp.status === "ACTIVE" ? "Ativo" : "Pausado"}
                              </span>
                              <span className="text-sm font-semibold text-shopee-orange shrink-0">{formatCurrency(camp.spend)}</span>
                            </button>
                            <Link href="/dashboard/ati" className="text-xs text-shopee-orange/70 hover:text-shopee-orange shrink-0 transition-colors">ATI →</Link>
                          </div>
                          {isOpen && (
                            <div className="border-t border-dark-border/50 bg-dark-bg/20">
                              {camp.adSets.map((aset) => {
                                const adSetOpen = expandedTraficoAdSets[aset.id];
                                return (
                                  <div key={aset.id} className="border-b border-dark-border/30 last:border-b-0">
                                    <button type="button" onClick={() => toggleTraficoAdSet(aset.id)}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-dark-bg/30 border-l-2 border-shopee-orange/30 transition-colors"
                                    >
                                      {adSetOpen ? <ChevronUp className="h-3 w-3 text-text-secondary" /> : <ChevronDown className="h-3 w-3 text-text-secondary" />}
                                      <span className="text-xs font-medium text-text-primary truncate flex-1">{aset.name}</span>
                                      <span className={`text-[11px] ${aset.status === "ACTIVE" ? "text-emerald-400" : "text-text-secondary/60"}`}>{aset.status === "ACTIVE" ? "Ativo" : "Pausado"}</span>
                                      <span className="text-xs text-shopee-orange">{formatCurrency(aset.spend)}</span>
                                    </button>
                                    {adSetOpen && (
                                      <div className="pl-8 pr-4 py-2 space-y-1.5 bg-dark-bg/20">
                                        {aset.ads.map((ad) => (
                                          <div key={ad.id} className="flex flex-wrap items-center gap-2 p-2 rounded-lg border border-dark-border/40 bg-dark-card/60">
                                            <span className="text-xs text-text-primary font-medium truncate flex-1 min-w-0">{ad.name}</span>
                                            <div className="flex items-center gap-3 text-[11px] text-text-secondary shrink-0">
                                              <span title="Gasto">{formatCurrency(ad.spend)}</span>
                                              <span className="flex items-center gap-0.5" title="Cliques"><MousePointerClick className="h-3 w-3" /> {ad.clicks}</span>
                                              <span title="CPC">{formatCurrency(ad.cpc)}</span>
                                              <span className={ad.status === "ACTIVE" ? "text-emerald-400" : "text-text-secondary/50"}>{ad.status === "ACTIVE" ? "Ativo" : "Pausado"}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
