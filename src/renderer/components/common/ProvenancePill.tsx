import React from 'react';
import { Shield, Cloud } from 'lucide-react';

interface ProvenancePillProps {
  kind: 'local' | 'cloud';
  providerName?: string;
  modelName?: string;
  className?: string;
}

/**
 * Signature Provenance Indicator (§11.1 in docs/Designv2.md)
 * - Teal: "On this device"
 * - Violet: "Leaves this device / Sent to [Provider] ([Model])"
 * - radius-full, text-small, medium weight
 */
export const ProvenancePill: React.FC<ProvenancePillProps> = ({
  kind,
  providerName,
  modelName,
  className = '',
}) => {
  const isLocal = kind === 'local';

  if (isLocal) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-small font-medium bg-teal-100 border border-teal-300 text-teal-600 shrink-0 ${className}`}
        title="Processing performed 100% on this local device. No clinical data leaves your computer."
      >
        <Shield className="w-3.5 h-3.5 shrink-0 text-teal-600" strokeWidth={1.75} />
        <span>On this device</span>
      </span>
    );
  }

  // Cloud BYOK
  const destination = providerName && modelName
    ? `Sent to ${providerName} (${modelName})`
    : providerName
    ? `Sent to ${providerName}`
    : modelName
    ? `Sent to ${modelName}`
    : 'External Cloud API';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-small font-medium bg-violet-100 border border-violet-300 text-violet-600 shrink-0 ${className}`}
      title="Medical data will be transmitted securely to your configured cloud AI endpoint."
    >
      <Cloud className="w-3.5 h-3.5 shrink-0 text-violet-600" strokeWidth={1.75} />
      <span className="truncate max-w-[280px]">{destination}</span>
    </span>
  );
};
