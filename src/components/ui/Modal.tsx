import { useEffect, useRef, type ReactNode } from 'react';

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current; if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} aria-labelledby="modal-title"
      className="w-[calc(100%-2rem)] max-w-md rounded-card p-0 backdrop:bg-ink/60">
      <div className="space-y-4 p-5"><h2 id="modal-title" className="text-xl font-extrabold">{title}</h2>{open && children}</div>
    </dialog>
  );
}
