import { useEffect, useRef } from "react";

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const Modal = ({ title, onClose, children, size = "md", drawer = false }) => {
  const ref = useRef(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement;
    const el = ref.current;
    const items = () => [...el.querySelectorAll(FOCUSABLE)].filter((x) => !x.disabled);
    items()[0]?.focus();

    const onKey = (e) => {
      if (e.key === "Escape") return closeRef.current();
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus?.();
    };
  }, []);

  const width = { sm: "max-w-md", md: "max-w-2xl" }[size];

  return (
    <div className={`fixed inset-0 z-50 flex ${drawer ? "justify-end" : "items-center justify-center p-4"}`}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex flex-col bg-white shadow-xl ${
          drawer ? "h-full w-full max-w-lg" : `max-h-[90vh] w-full ${width} rounded-lg`
        }`}
      >
        <div className="flex items-center justify-between border-b border-earth-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-earth-900">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 text-2xl leading-none text-earth-600 hover:bg-earth-100">
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;