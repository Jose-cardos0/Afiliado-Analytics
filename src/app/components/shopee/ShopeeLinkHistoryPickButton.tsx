"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Search, Loader2, Link2 } from "lucide-react";

export type ShopeeLinkHistoryRow = {
  id: string;
  shortLink: string;
  subId1: string;
  subId2: string;
  subId3: string;
  productName: string;
  imageUrl: string;
  commissionRate: number;
  commissionValue: number;
  createdAt: string;
};

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "";
  }
}

const LUPA_BTN_CLASS =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-shopee-orange/45 bg-shopee-orange/10 text-shopee-orange hover:bg-shopee-orange/18 disabled:opacity-40 disabled:cursor-not-allowed transition-colors";

type Props = {
  onPick: (shortLink: string) => void;
  /** `aria-label` / title do botão */
  "aria-label"?: string;
  title?: string;
  className?: string;
};

/**
 * Botão com ícone de lupa (estilo Meta) que abre o histórico do Gerador de Links Shopee;
 * ao escolher um item, envia o `shortLink` já gerado (com afiliado e sub-IDs salvos no histórico).
 */
export default function ShopeeLinkHistoryPickButton({
  onPick,
  "aria-label": ariaLabel = "Abrir histórico de links Shopee",
  title = "Histórico do gerador de links",
  className = "",
}: Props) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<ShopeeLinkHistoryRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debounced]);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (debounced) params.set("search", debounced);
      const res = await fetch(`/api/shopee/link-history?${params.toString()}`);
      const json = await res.json();
      if (res.status === 401) {
        setError("Faça login para ver o histórico.");
        setRows([]);
        return;
      }
      if (!res.ok) throw new Error(json?.error ?? "Erro ao carregar histórico");
      setRows(Array.isArray(json.data) ? json.data : []);
      setTotalPages(Math.max(1, Number(json.totalPages) || 1));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [open, page, debounced]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const pick = (shortLink: string) => {
    const u = shortLink.trim();
    if (!u) return;
    onPick(u);
    setOpen(false);
  };

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[140] flex items-center justify-center p-3 md:p-5 bg-black/75 backdrop-blur-[2px]"
            role="presentation"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="w-full max-w-2xl max-h-[min(640px,90vh)] flex flex-col rounded-2xl border border-dark-border bg-dark-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 px-4 pt-4 pb-3 border-b border-dark-border/60 bg-dark-bg/50">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 id={titleId} className="text-sm font-bold text-text-primary flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-shopee-orange/15 border border-shopee-orange/25">
                        <Link2 className="h-4 w-4 text-shopee-orange" />
                      </span>
                      Histórico — Gerador de links Shopee
                    </h2>
                    <p className="text-[11px] text-text-secondary/75 mt-1.5 leading-relaxed pr-2">
                      O link copiado é o <strong className="text-text-secondary">short link</strong> salvo no histórico (já com seu afiliado e sub-IDs que você usou ao gerar).
                    </p>
                    <Link
                      href="/dashboard/gerador-links-shopee"
                      className="text-[11px] text-shopee-orange hover:underline mt-1 inline-block"
                      onClick={() => setOpen(false)}
                    >
                      Abrir gerador de links →
                    </Link>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="shrink-0 text-text-secondary hover:text-text-primary text-lg leading-none px-2"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/45 pointer-events-none" />
                  <input
                    type="search"
                    autoFocus
                    placeholder="Filtrar por produto, link ou sub ID…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-xl border border-dark-border bg-dark-bg py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-shopee-orange/60 focus:ring-1 focus:ring-shopee-orange/20"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-shopee">
                {loading && rows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-text-secondary">
                    <Loader2 className="h-8 w-8 animate-spin text-shopee-orange" />
                    <span className="text-sm">Carregando histórico…</span>
                  </div>
                ) : error ? (
                  <p className="text-sm text-red-400 text-center py-10 px-2">{error}</p>
                ) : rows.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-2">
                    <p className="text-sm text-text-secondary">Nenhum link no histórico{debounced ? " para este filtro" : ""}.</p>
                    <p className="text-xs text-text-secondary/60">
                      Gere links em <strong className="text-text-secondary">Gerador de links Shopee</strong>; eles aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {rows.map((h) => {
                      const subs = [h.subId1, h.subId2, h.subId3].filter(Boolean);
                      const pct = (h.commissionRate ?? 0) * 100;
                      return (
                        <li
                          key={h.id}
                          className="flex gap-3 rounded-xl border border-dark-border/60 bg-dark-bg/40 p-2.5 hover:border-shopee-orange/35 transition-colors"
                        >
                          <div className="h-14 w-14 shrink-0 rounded-lg overflow-hidden bg-dark-bg border border-dark-border/50">
                            {h.imageUrl ? (
                              <img src={h.imageUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-[10px] text-text-secondary/40">—</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-text-primary line-clamp-2">{h.productName || "Produto"}</p>
                            <p className="text-[11px] text-text-secondary/65 mt-0.5">{formatDate(String(h.createdAt))}</p>
                            {subs.length > 0 ? (
                              <p className="text-[10px] text-text-secondary/55 mt-1 truncate" title={subs.join(" · ")}>
                                Sub IDs: {subs.join(" · ")}
                              </p>
                            ) : null}
                            {(h.commissionRate > 0 || h.commissionValue > 0) && (
                              <p className="text-xs font-semibold text-emerald-400 mt-1">
                                {pct.toFixed(1)}% · {formatBRL(h.commissionValue ?? 0)}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col justify-center">
                            <button
                              type="button"
                              onClick={() => pick(h.shortLink)}
                              className="rounded-lg border border-shopee-orange/50 bg-shopee-orange/15 px-3 py-2 text-xs font-semibold text-shopee-orange hover:bg-shopee-orange/25 transition-colors whitespace-nowrap"
                            >
                              Usar link
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {totalPages > 1 && (
                <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-t border-dark-border/60 bg-dark-bg/30">
                  <button
                    type="button"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="rounded-lg border border-dark-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-dark-bg disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-[11px] text-text-secondary">
                    Página {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-dark-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-dark-bg disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={`${LUPA_BTN_CLASS} ${className}`}
        onClick={() => {
          setSearch("");
          setDebounced("");
          setPage(1);
          setError(null);
          setOpen(true);
        }}
        title={title}
        aria-label={ariaLabel}
      >
        <Search className="h-4 w-4" />
      </button>
      {modal}
    </>
  );
}
