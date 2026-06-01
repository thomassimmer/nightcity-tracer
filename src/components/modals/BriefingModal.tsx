import { X, Radio } from "lucide-react";
import { useSimulationStore } from '@/store/useSimulationStore';

export function BriefingModal({ onClose }: { onClose: () => void }) {
  const { scenario } = useSimulationStore();
  if (!scenario) return null;

  const { briefing } = scenario.world;
  const ts = new Date(briefing.timestamp).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Incoming Transmission: ${scenario.world.corporation}`}
        className="cyber-panel w-full max-w-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="cyber-panel-header">
          <div className="flex items-center gap-2">
            <Radio size={14} className="text-theme-primary" />
            <span>INCOMING TRANSMISSION: {scenario.world.corporation}</span>
          </div>
          <button onClick={onClose} aria-label="Close" className="opacity-60 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              FROM: <span className="text-gray-300">{briefing.sender}</span>
            </span>
            <span>{ts}</span>
          </div>
          <div className="border-t border-theme-border" />
          <h3 className="text-sm font-bold text-theme-primary tracking-wide uppercase">
            {briefing.title}
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
            {briefing.body}
          </p>
          <div className="border-t border-theme-border pt-3 flex justify-end">
            <button onClick={onClose} className="cyber-button text-xs">
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
