import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Trash2,
  Shield,
  Zap,
  Radio,
  ExternalLink,
} from 'lucide-react';
import type { ProviderProfile, ConnectionTestResult } from '../../../shared/types';

interface Props {
  providers: ProviderProfile[];
  onSaveProvider: (profile: Omit<ProviderProfile, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onDeleteProvider: (id: string) => Promise<void>;
  onTestConnection: (profile: Partial<ProviderProfile>) => Promise<ConnectionTestResult>;
}

export const ProviderSettings: React.FC<Props> = ({
  providers,
  onSaveProvider,
  onDeleteProvider,
  onTestConnection,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'local' | 'cloud'>('local');
  const [providerType, setProviderType] = useState<ProviderProfile['provider_type']>('lm-studio');
  const [baseUrl, setBaseUrl] = useState('http://localhost:1234/v1');
  const [model, setModel] = useState('llama-3.2-3b-instruct');
  const [apiKey, setApiKey] = useState('');
  const [timeoutSeconds, setTimeoutSeconds] = useState(900);
  const [isDefault, setIsDefault] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [saving, setSaving] = useState(false);

  const handleEdit = (p: ProviderProfile) => {
    setEditingId(p.id);
    setName(p.name);
    setKind(p.kind);
    setProviderType(p.provider_type);
    setBaseUrl(p.base_url);
    setModel(p.model);
    setApiKey(p.api_key || '');
    setTimeoutSeconds(p.timeout_seconds || 900);
    setIsDefault(p.is_default === 1);
  };

  const handleNew = () => {
    setEditingId('new');
    setName('Custom Local Model');
    setKind('local');
    setProviderType('lm-studio');
    setBaseUrl('http://localhost:1234/v1');
    setModel('local-model');
    setApiKey('');
    setTimeoutSeconds(900);
    setIsDefault(false);
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleTest = async (profileToTest: Partial<ProviderProfile>, keyId: string) => {
    try {
      setTestingId(keyId);
      const res = await onTestConnection(profileToTest);
      setTestResults((prev) => ({ ...prev, [keyId]: res }));
    } finally {
      setTestingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await onSaveProvider({
        id: editingId === 'new' ? undefined : editingId || undefined,
        name: name.trim(),
        kind,
        provider_type: providerType,
        base_url: baseUrl.trim(),
        model: model.trim(),
        api_key: apiKey.trim() || undefined,
        timeout_seconds: Number(timeoutSeconds) || 900,
        is_default: isDefault ? 1 : 0,
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-canvas overflow-y-auto">
      <header className="h-14 px-6 border-b border-hairline flex items-center justify-between shrink-0 bg-surface/40 backdrop-blur-sm sticky top-0 z-10">
        <div>
          <h2 className="text-xs font-semibold text-ink uppercase tracking-wider font-mono">
            AI Provider Configurations
          </h2>
          <p className="text-[11px] text-mute">
            Configure local on-device models (LM Studio, Ollama) or BYOK cloud endpoints
          </p>
        </div>
        <div className="pr-14">
          <button
            onClick={handleNew}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-text hover:bg-primary-pressed rounded-md transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Profile
          </button>
        </div>
      </header>

      <div className="p-8 max-w-4xl mx-auto w-full space-y-6">
        {/* On-Device Privacy Banner */}
        <div className="p-4 rounded-lg bg-surface border border-hairline flex items-start gap-3">
          <Shield className="w-5 h-5 text-accent-green shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed text-body">
            <h4 className="font-semibold text-ink mb-1">Local-First AI Execution</h4>
            <p>
              By pointing MedBuddy at a local server like <strong className="text-ink">LM Studio</strong> or <strong className="text-ink">Ollama</strong>, all medical document parsing and analysis happens entirely on your GPU/CPU. Zero clinical records are transmitted across the internet.
            </p>
          </div>
        </div>

        {/* Edit or Create Form */}
        {editingId && (
          <form
            onSubmit={handleSave}
            className="p-5 rounded-lg bg-surface border border-hairline space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-hairline">
              <h3 className="text-xs font-semibold uppercase font-mono text-ink">
                {editingId === 'new' ? 'New Provider Profile' : 'Edit Profile'}
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className="text-xs text-mute hover:text-ink"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-mute mb-1">Profile Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink focus:outline-none focus:border-hairline-strong"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-mute mb-1">Execution Mode</label>
                <select
                  value={kind}
                  onChange={(e) => {
                    const k = e.target.value as 'local' | 'cloud';
                    setKind(k);
                    if (k === 'local') setBaseUrl('http://localhost:1234/v1');
                    else setBaseUrl('https://api.openai.com/v1');
                  }}
                  className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink focus:outline-none focus:border-hairline-strong"
                >
                  <option value="local">Local (On-Device)</option>
                  <option value="cloud">Cloud (BYOK API Key)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-mute mb-1">Provider Type</label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink focus:outline-none focus:border-hairline-strong"
                >
                  <option value="lm-studio">LM Studio (Local)</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai-compatible">OpenAI-Compatible Endpoint</option>
                  <option value="openai">OpenAI Official</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-mute mb-1">Model Name</label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama-3.2-3b-instruct or mistral"
                  className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink focus:outline-none focus:border-hairline-strong"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-mute mb-1">Base URL</label>
                <input
                  type="text"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:1234/v1 or http://localhost:11434"
                  className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink font-mono focus:outline-none focus:border-hairline-strong"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-medium text-mute mb-1">
                  Request Timeout (seconds)
                </label>
                <input
                  type="number"
                  min={60}
                  max={3600}
                  step={60}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value) || 900)}
                  className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink font-mono focus:outline-none focus:border-hairline-strong"
                />
                <span className="text-[10px] text-stone mt-1 block">
                  Default: 900s (15 minutes). Local 14B–32B models processing large document sets require several minutes.
                </span>
              </div>

              {kind === 'cloud' && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-mute mb-1">API Key (Encrypted at rest)</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink font-mono focus:outline-none focus:border-hairline-strong"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-hairline bg-surface-elevated text-primary focus:ring-0"
              />
              <label htmlFor="isDefault" className="text-xs text-mute cursor-pointer">
                Set as default provider for new analyses
              </label>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={() =>
                  handleTest(
                    { base_url: baseUrl, provider_type: providerType, api_key: apiKey },
                    'editing'
                  )
                }
                disabled={testingId === 'editing'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-body bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingId === 'editing' ? 'animate-spin' : ''}`} />
                Test Connection
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-3 py-1.5 text-xs text-mute hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-text rounded-md hover:bg-primary-pressed transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

            {testResults['editing'] && (
              <div
                className={`p-3 rounded-md text-xs mt-2 border ${testResults['editing'].success ? 'bg-surface-card text-accent-green border-accent-green/30' : 'bg-surface-card text-accent-red border-accent-red/30'}`}
              >
                {testResults['editing'].message}
              </div>
            )}
          </form>
        )}

        {/* Existing Providers List */}
        <div className="space-y-3">
          {providers.map((p) => {
            const isLocal = p.kind === 'local';
            const testRes = testResults[p.id];
            const isTesting = testingId === p.id;

            return (
              <div
                key={p.id}
                className="p-4 rounded-lg bg-surface border border-hairline hover:border-hairline-strong transition-all flex flex-col gap-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-md flex items-center justify-center ${isLocal ? 'bg-accent-green-soft text-accent-green' : 'bg-accent-yellow-soft text-accent-yellow'}`}
                    >
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-semibold text-ink">{p.name}</h4>
                        {p.is_default === 1 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-xs bg-primary text-primary-text font-bold">
                            DEFAULT
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs border ${isLocal ? 'bg-surface-elevated text-accent-green border-accent-green/20' : 'bg-surface-elevated text-accent-yellow border-accent-yellow/20'}`}
                        >
                          {isLocal ? 'LOCAL ON-DEVICE' : 'CLOUD BYOK'}
                        </span>
                      </div>
                      <p className="text-[11px] text-mute font-mono mt-0.5">
                        {p.base_url} • Model: <span className="text-ink">{p.model}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(p, p.id)}
                      disabled={isTesting}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-body bg-surface-elevated hover:bg-surface-card border border-hairline rounded-md transition-colors"
                      title="Test connection to server"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                      Test
                    </button>
                    <button
                      onClick={() => handleEdit(p)}
                      className="px-3 py-1.5 text-xs text-mute hover:text-ink bg-surface-elevated border border-hairline rounded-md transition-colors"
                    >
                      Edit
                    </button>
                    {providers.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete provider "${p.name}"?`)) {
                            onDeleteProvider(p.id);
                          }
                        }}
                        className="p-1.5 text-stone hover:text-accent-red transition-colors"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Test Result Feedback */}
                {testRes && (
                  <div
                    className={`p-2.5 rounded-md text-xs border flex items-center justify-between ${testRes.success ? 'bg-accent-green-soft text-accent-green border-accent-green/20' : 'bg-accent-red-soft text-accent-red border-accent-red/20'}`}
                  >
                    <span>{testRes.message}</span>
                    {testRes.latencyMs && (
                      <span className="font-mono text-[10px]">{testRes.latencyMs}ms</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
