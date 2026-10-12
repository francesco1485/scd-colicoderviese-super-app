import { X } from "lucide-react";
import { useEffect, useId, type ReactNode } from "react";

/** Modal sheet used by the work areas: bottom sheet on phones, centred card on larger screens; Esc closes. */
export function Dialog({ title, onClose, children, testId }: { title: string; onClose: () => void; children: ReactNode; testId: string }) {
  const id = useId();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[rgb(2_15_40/0.6)] p-3 sm:items-center" onClick={onClose}>
      <section role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} onClick={(e) => e.stopPropagation()} className="w-full max-w-[520px] rounded-[20px] bg-white p-5 text-[var(--in-ink)] shadow-[0_24px_48px_rgb(0_8_30/0.5)]" data-testid={testId}>
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-t`} className="m-0 text-[22px] font-bold leading-tight">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Chiudi" className="scd-focus grid size-10 place-items-center rounded-full bg-[#eef3f9]">
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
