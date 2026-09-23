import React, { useState } from 'react';
import {
  Plus,
  RefreshCw,
  Trash2,
  Shield,
  Edit2,
  Check,
} from 'lucide-react';
import type { ProviderProfile, ConnectionTestResult } from '../../../shared/types';
import { ProvenancePill } from '../common/ProvenancePill';
import { Button } from '../common/Button';

interface Props {
  providers: ProviderProfile[];
  onSaveProvider: (profile: Omit<ProviderProfile, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onDeleteProvider: (id: string) => Promise<void>;
  onTestConnection: (profile: Partial<ProviderProfile>) => Promise<ConnectionTestResult>;
}

/** Mask secret per §9.2: sk-••••••••1a2b */
const maskApiKey = (key?: string) => {
  if (!key) return 'None';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
};

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
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto select-none font-sans">
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface sticky top-0 z-10">
        <div>
          <h2 className="text-body-medium font-semibold text-primary">AI Provider Profiles</h2>
          <p className="text-caption text-tertiary">
            Local on-device engines (LM Studio, Ollama) and BYOK cloud endpoints
          </p>
        </div>
        <div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleNew}
            icon={<Plus className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Add Profile
          </Button>
        </div>
      </header>

      <div className="max-w-[840px] mx-auto px-6 py-8 w-full space-y-6">
        {/* Informational banner */}
        <div className="p-4 rounded-md bg-surface border border-border flex items-start gap-3">
          <Shield className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="text-small text-secondary leading-relaxed">
            <h4 className="font-semibold text-primary mb-0.5">Dual-Mode Execution Architecture</h4>
            <p>
              MedBuddy treats on-device models and BYOK cloud endpoints as equally first-class choices.
              The provenance badge on each profile explicitly signals whether medical text stays on this computer or is routed to a third-party model.
            </p>
          </div>
        </div>

        {/* Edit or Create Profile Form (§9.2) */}
        {editingId && (
          <form
            onSubmit={handleSave}
            className="p-5 rounded-md bg-surface border border-border space-y-4 animate-in fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-h3 font-semibold text-primary">
                {editingId === 'new' ? 'New AI Provider Profile' : 'Edit Profile'}
              </h3>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-small font-medium text-secondary mb-1">
                  Profile Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                />
              </div>

              <div>
                <label className="block text-small font-medium text-secondary mb-1">
                  Execution Mode
                </label>
                <select
                  value={kind}
                  onChange={(e) => {
                    const k = e.target.value as 'local' | 'cloud';
                    setKind(k);
                    if (k === 'local') setBaseUrl('http://localhost:1234/v1');
                    else setBaseUrl('https://api.openai.com/v1');
                  }}
                  className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                >
                  <option value="local">Local (Stays on this device)</option>
                  <option value="cloud">Cloud (Leaves this device via API)</option>
                </select>
              </div>

              <div>
                <label className="block text-small font-medium text-secondary mb-1">
                  Provider Engine
                </label>
                <select
                  value={providerType}
                  onChange={(e) => setProviderType(e.target.value as any)}
                  className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                >
                  <option value="lm-studio">LM Studio (Local)</option>
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai-compatible">OpenAI-Compatible Endpoint</option>
                  <option value="openai">OpenAI Official</option>
                </select>
              </div>

              <div>
                <label className="block text-small font-medium text-secondary mb-1">
                  Model Identifier
                </label>
                <input
                  type="text"
                  required
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="e.g. llama-3.2-3b-instruct"
                  className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-small font-medium text-secondary mb-1">
                  Base URL
                </label>
                <input
                  type="text"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://localhost:1234/v1"
                  className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-small font-medium text-secondary mb-1">
                  Request Timeout (seconds)
                </label>
                <input
                  type="number"
                  min={60}
                  max={3600}
                  step={60}
                  value={timeoutSeconds}
                  onChange={(e) => setTimeoutSeconds(Number(e.target.value) || 900)}
                  className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                />
                <span className="text-caption text-tertiary mt-1 block">
                  Default: 900s (15 min). Local models processing multi-document records need extended inference windows.
                </span>
              </div>

              {kind === 'cloud' && (
                <div className="col-span-2">
                  <label className="block text-small font-medium text-secondary mb-1">
                    API Key (Encrypted in local vault)
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
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
                className="rounded-sm border-border-strong text-vault-600 focus:ring-vault-500/35"
              />
              <label htmlFor="isDefault" className="text-small text-secondary cursor-pointer select-none">
                Set as default provider for new syntheses
              </label>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  handleTest(
                    { base_url: baseUrl, provider_type: providerType, api_key: apiKey },
                    'editing'
                  )
                }
                loading={testingId === 'editing'}
                icon={<RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />}
              >
                Test Connection
              </Button>

              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="md" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" loading={saving}>
                  Save Profile
                </Button>
              </div>
            </div>

            {testResults['editing'] && (
              <div
                className={`p-3 rounded-sm text-caption border mt-2 ${
                  testResults['editing'].success
                    ? 'bg-sage-100 text-sage-600 border-sage-300'
                    : 'bg-clay-100 text-clay-600 border-clay-300'
                }`}
              >
                {testResults['editing'].message}
              </div>
            )}
          </form>
        )}

        {/* Existing Provider Cards (§11.4: Card per profile, radius-md, identical shell) */}
        <div className="space-y-3">
          {providers.map((p) => {
            const isLocal = p.kind === 'local';
            const testRes = testResults[p.id];
            const isTesting = testingId === p.id;

            return (
              <div
                key={p.id}
                className="p-5 rounded-md bg-surface border border-border hover:border-border-strong transition-colors flex flex-col gap-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="text-body font-semibold text-primary">{p.name}</h4>
                      <ProvenancePill kind={p.kind} />
                      {p.is_default === 1 && (
                        <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-vault-50 text-vault-600 border border-vault-200">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="text-small text-tertiary font-mono space-y-0.5">
                      <p>Model: <strong className="text-primary font-medium">{p.model}</strong></p>
                      {isLocal ? (
                        <p>Endpoint: <span className="text-secondary">{p.base_url}</span></p>
                      ) : (
                        <p>Key: <span className="text-secondary">{maskApiKey(p.api_key)}</span></p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTest(p, p.id)}
                      loading={isTesting}
                      icon={<RefreshCw className="w-3 h-3" strokeWidth={1.75} />}
                    >
                      Test
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleEdit(p)}
                      icon={<Edit2 className="w-3 h-3" strokeWidth={1.75} />}
                    >
                      Edit
                    </Button>
                    {providers.length > 1 && (
                      <button
                        onClick={() => {
                          if (confirm(`Remove provider profile "${p.name}"?`)) {
                            onDeleteProvider(p.id);
                          }
                        }}
                        className="p-1.5 text-tertiary hover:text-clay-600 transition-colors rounded-sm hover:bg-surface-hover"
                        title="Delete Profile"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Test Feedback */}
                {testRes && (
                  <div
                    className={`p-2.5 rounded-sm text-caption border flex items-center justify-between ${
                      testRes.success
                        ? 'bg-sage-100 text-sage-600 border-sage-300'
                        : 'bg-clay-100 text-clay-600 border-clay-300'
                    }`}
                  >
                    <span>{testRes.message}</span>
                    {testRes.latencyMs && (
                      <span className="font-mono tabular-nums">{testRes.latencyMs}ms</span>
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
