"use client";

import React, { useId, useMemo, useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { META_COUNTRIES } from "@/lib/meta-ads-constants";

/** Evita códigos duplicados na lista exportada (ex.: IE repetido). */
const COUNTRIES_UNIQ: { code: string; name: string }[] = (() => {
  const m = new Map<string, { code: string; name: string }>();
  for (const c of META_COUNTRIES) {
    if (!m.has(c.code)) m.set(c.code, c);
  }
  return [...m.values()];
})();

function normalizeSearch(s: string) {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function countryByCode(code: string) {
  return COUNTRIES_UNIQ.find((c) => c.code === code);
}

export type MetaCountryPickerProps = {
  value: string[];
  onChange: (codes: string[]) => void;
  /** Máximo de países (Meta costuma aceitar ~25). Default 25. */
  max?: number;
  /** Texto do botão que abre o modal. */
  searchButtonLabel?: string;
  /** `id` do botão (para associar ao &lt;label htmlFor&gt;). */
  openButtonId?: string;
  className?: string;
};

/**
 * Seleção de países: botão abre modal com busca + checkboxes; fora do modal, países como tags laranja (estilo plataformas).
 */
export default function MetaCountryPicker({
  value,
  onChange,
  max = 25,
  searchButtonLabel = "Pesquisar e escolher países",
  openButtonId,
  className = "",
}: MetaCountryPickerProps) {
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<string[]>([]);

  const openModal = useCallback(() => {
    setDraft(value.length ? [...value] : ["BR"]);
    setQuery("");
    setOpen(true);
  }, [value]);

  const closeModal = useCallback(() => setOpen(false), []);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return COUNTRIES_UNIQ;
    return COUNTRIES_UNIQ.filter((c) => {
      const name = normalizeSearch(c.name);
      return name.includes(q) || c.code.toLowerCase().includes(q);
    });
  }, [query]);

  const toggleDraft = useCallback(
    (code: string) => {
      setDraft((prev) => {
        if (prev.includes(code)) {
          const next = prev.filter((x) => x !== code);
          return next.length === 0 ? prev : next;
        }
        if (prev.length >= max) return prev;
        return [...prev, code];
      });
    },
    [max]
  );

  const confirm = useCallback(() => {
    if (draft.length > 0) onChange([...draft].sort());
    setOpen(false);
  }, [draft, onChange]);

  const removeTag = useCallback(
    (code: string) => {
      const next = value.filter((c) => c !== code);
      if (next.length === 0) return;
      onChange(next);
    },
    [value, onChange]
  );

  const sortedTags = useMemo(() => {
    return [...value].sort((a, b) => {
      const na = countryByCode(a)?.name ?? a;
      const nb = countryByCode(b)?.name ?? b;
      return na.localeCompare(nb, "pt");
    });
  }, [value]);

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

  const modal =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-6 bg-black/70 backdrop-blur-[2px]"
            role="presentation"
            onClick={closeModal}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="w-full max-w-lg max-h-[min(560px,85vh)] flex flex-col rounded-2xl border border-dark-border bg-dark-card shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="shrink-0 px-4 pt-4 pb-3 border-b border-dark-border/60 bg-dark-bg/40">
                <h2 id={titleId} className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-shopee-orange/15 border border-shopee-orange/25">
                    <Search className="h-4 w-4 text-shopee-orange" />
                  </span>
                  Escolher países do público
                </h2>
                <p className="text-[11px] text-text-secondary/75 mt-1.5 leading-relaxed">
                  Busque pelo nome ou código (ex.: Brasil, BR). Marque quantos quiser (máx. {max}). Depois clique em{" "}
                  <strong className="text-text-secondary">Confirmar</strong>.
                </p>
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary/45 pointer-events-none" />
                  <input
                    type="search"
                    autoFocus
                    placeholder="Digite para filtrar países…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full rounded-xl border border-dark-border bg-dark-bg py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none focus:border-shopee-orange/60 focus:ring-1 focus:ring-shopee-orange/20"
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto p-3 scrollbar-shopee">
                {filtered.length === 0 ? (
                  <p className="text-sm text-text-secondary text-center py-8">Nenhum país encontrado.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filtered.map((c) => {
                      const checked = draft.includes(c.code);
                      return (
                        <label
                          key={c.code}
                          className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer text-sm font-medium transition-all ${
                            checked
                              ? "border-shopee-orange/50 bg-shopee-orange/10 text-text-primary"
                              : "border-dark-border/60 bg-dark-bg/30 text-text-secondary hover:border-shopee-orange/30"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleDraft(c.code)}
                            className="rounded border-dark-border accent-shopee-orange shrink-0"
                          />
                          <span className="truncate">
                            {c.name}{" "}
                            <span className="text-text-secondary/60 font-normal">({c.code})</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="shrink-0 flex items-center justify-between gap-2 px-4 py-3 border-t border-dark-border/60 bg-dark-bg/30">
                <p className="text-[11px] text-text-secondary/70">
                  <span className="text-shopee-orange font-semibold">{draft.length}</span> selecionado(s)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-xl border border-dark-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-dark-bg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={confirm}
                    disabled={draft.length === 0}
                    className="rounded-xl bg-shopee-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_2px_12px_rgba(238,77,45,0.25)]"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  const hasCountries = sortedTags.length > 0;

  return (
    <div className={className}>
      {!hasCountries ? (
        <button
          id={openButtonId}
          type="button"
          onClick={openModal}
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-shopee-orange/45 bg-shopee-orange/10 px-4 py-2.5 text-sm font-semibold text-shopee-orange hover:bg-shopee-orange/18 transition-colors"
        >
          <Search className="h-4 w-4 shrink-0" />
          {searchButtonLabel}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {sortedTags.map((code) => {
            const c = countryByCode(code);
            const label = c ? `${c.name} (${code})` : code;
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 rounded-lg border border-shopee-orange/50 bg-shopee-orange/8 px-2.5 py-1.5 text-xs sm:text-sm font-medium text-text-primary"
              >
                <span className="truncate max-w-[200px]">{label}</span>
                <button
                  type="button"
                  onClick={() => removeTag(code)}
                  disabled={value.length <= 1}
                  className="shrink-0 rounded-md p-0.5 text-text-secondary hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-secondary"
                  aria-label={`Remover ${label}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
          <button
            type="button"
            id={openButtonId}
            onClick={openModal}
            title="Adicionar ou editar países"
            aria-label="Pesquisar e escolher países"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-shopee-orange/45 bg-shopee-orange/10 text-shopee-orange hover:bg-shopee-orange/18 transition-colors"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      )}

      {modal}
    </div>
  );
}
