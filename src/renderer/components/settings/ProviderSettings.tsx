import React, { useState } from 'react';
import {
  Plus,
  RefreshCw,
  Trash2,
  Shield,
  Edit2,
  Check,
  Clock,
  Server,
  Cloud,
  Key,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Zap,
  Globe,
} from 'lucide-react';
import type { ProviderProfile, ConnectionTestResult, FamilyMember, ProviderType } from '../../../shared/types';
import { ProvenancePill } from '../common/ProvenancePill';
import { Button } from '../common/Button';

interface Props {
  providers: ProviderProfile[];
  selectedMember?: FamilyMember | null;
  onSaveProvider: (profile: Omit<ProviderProfile, 'id' | 'created_at'> & { id?: string }) => Promise<void>;
  onDeleteProvider: (id: string) => Promise<void>;
  onTestConnection: (profile: Partial<ProviderProfile>) => Promise<ConnectionTestResult>;
  onOpenChronicle?: () => void;
}

interface LocalEnginePreset {
  id: ProviderType;
  name: string;
  label: string;
  defaultUrl: string;
  defaultModel: string;
  description: string;
  recommendedModels: string[];
}

interface CloudProviderPreset {
  id: ProviderType;
  name: string;
  label: string;
  badge: string;
  defaultUrl: string;
  defaultModel: string;
  description: string;
  recommendedModels: string[];
  keyPrefixes: string[];
  keyPlaceholder: string;
  helpUrl?: string;
  helpLabel?: string;
}

const LOCAL_ENGINES: LocalEnginePreset[] = [
  {
    id: 'lm-studio',
    name: 'LM Studio (Local)',
    label: 'LM Studio',
    defaultUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    description: 'LM Studio local server (default port 1234)',
    recommendedModels: ['local-model', 'llama-3.3-70b-instruct', 'deepseek-r1', 'qwen3.8-27b', 'llama-3.2-3b-instruct'],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    label: 'Ollama',
    defaultUrl: 'http://localhost:11434/v1',
    defaultModel: 'llama3.3:70b',
    description: 'Ollama local engine (default port 11434)',
    recommendedModels: ['llama3.3:70b', 'deepseek-r1', 'qwen3.8-27b', 'gemma4:12b', 'llama3.2', 'llama3.1', 'qwen2.5'],
  },
  {
    id: 'vllm',
    name: 'vLLM (Local)',
    label: 'vLLM',
    defaultUrl: 'http://localhost:8000/v1',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct',
    description: 'vLLM high-throughput inference server (default port 8000)',
    recommendedModels: ['meta-llama/Llama-3.3-70B-Instruct', 'deepseek-ai/DeepSeek-R1', 'Qwen/Qwen3.8-27B-Instruct', 'meta-llama/Llama-3.2-3B-Instruct'],
  },
  {
    id: 'openai-compatible',
    name: 'Custom Local Engine',
    label: 'Custom / Other',
    defaultUrl: 'http://localhost:8080/v1',
    defaultModel: 'local-model',
    description: 'LocalAI, llama.cpp, text-generation-webui, or other local API',
    recommendedModels: ['local-model', 'deepseek-r1', 'qwen3.8-27b'],
  },
];

const CLOUD_PROVIDERS: CloudProviderPreset[] = [
  {
    id: 'gemini',
    name: 'Google Gemini',
    label: 'Google Gemini',
    badge: 'Gemini',
    defaultUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-3.8-flash',
    description: 'High-speed multimodal clinical reasoning with generous free tier via Google AI Studio',
    recommendedModels: [
      'gemini-3.8-flash',
      'gemini-3.5-flash',
      'gemini-3.1-pro-preview',
      'gemini-3.1-flash-lite',
      'gemini-2.5-pro',
      'gemini-2.5-flash',
    ],
    keyPrefixes: ['AIza'],
    keyPlaceholder: 'AIzaSy... (Paste Google Gemini API Key)',
    helpUrl: 'https://aistudio.google.com/app/apikey',
    helpLabel: 'Get Gemini API Key',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    label: 'OpenAI',
    badge: 'OpenAI',
    defaultUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-6.1-sol',
    description: 'Frontier OpenAI models (GPT-6 series, o3-mini reasoning, and GPT-4o)',
    recommendedModels: [
      'gpt-6.1-sol',
      'gpt-6-luna',
      'gpt-6-astra',
      'o3-mini',
      'o1',
      'gpt-4o-mini',
      'gpt-4o',
    ],
    keyPrefixes: ['sk-proj-', 'sk-'],
    keyPlaceholder: 'sk-proj-... (Paste OpenAI API Key)',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpLabel: 'Get OpenAI API Key',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    label: 'OpenRouter',
    badge: 'OpenRouter',
    defaultUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'deepseek/deepseek-v4.1-flash',
    description: 'Unified gateway to latest models (DeepSeek V4.1, GPT-6, Claude 3.7, Gemini 3.8)',
    recommendedModels: [
      'deepseek/deepseek-v4.1-flash',
      'openai/gpt-6.1-sol',
      'anthropic/claude-3.7-sonnet',
      'google/gemini-3.8-flash',
      'meta-llama/llama-3.3-70b-instruct',
      'qwen/qwen3.8-27b',
    ],
    keyPrefixes: ['sk-or-'],
    keyPlaceholder: 'sk-or-v1-... (Paste OpenRouter API Key)',
    helpUrl: 'https://openrouter.ai/keys',
    helpLabel: 'Get OpenRouter API Key',
  },
  {
    id: 'groq',
    name: 'Groq Cloud',
    label: 'Groq',
    badge: 'Groq',
    defaultUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'qwen/qwen3.8-27b',
    description: 'Ultra-low-latency LPU inference for open reasoning and vision models',
    recommendedModels: [
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'groq/compound',
      'llama-3.3-70b-versatile',
      'llama-3.1-8b-instant',
    ],
    keyPrefixes: ['gsk_'],
    keyPlaceholder: 'gsk_... (Paste Groq API Key)',
    helpUrl: 'https://console.groq.com/keys',
    helpLabel: 'Get Groq API Key',
  },
  {
    id: 'custom-cloud',
    name: 'Custom Cloud Provider',
    label: 'Custom Cloud',
    badge: 'Custom',
    defaultUrl: 'https://api.together.xyz/v1',
    defaultModel: 'deepseek-ai/DeepSeek-V4.1',
    description: 'Any OpenAI-compatible cloud endpoint (DeepSeek, Together AI, Mistral, Perplexity, etc.)',
    recommendedModels: [
      'deepseek-ai/DeepSeek-V4.1',
      'deepseek-ai/DeepSeek-R1',
      'meta-llama/Llama-3.3-70B-Instruct',
      'Qwen/Qwen3.8-27B-Instruct',
    ],
    keyPrefixes: [],
    keyPlaceholder: 'Enter your API key or Bearer token...',
    helpLabel: 'Custom OpenAI-compatible cloud endpoint',
  },
];

const getCloudPreset = (type?: string): CloudProviderPreset => {
  return CLOUD_PROVIDERS.find((p) => p.id === type) || CLOUD_PROVIDERS[0];
};

const detectCloudPresetFromKey = (key: string): CloudProviderPreset | null => {
  const trimmed = key.trim();
  if (!trimmed) return null;
  for (const preset of CLOUD_PROVIDERS) {
    if (preset.keyPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
      return preset;
    }
  }
  return null;
};

/** Mask secret per §9.2: sk-••••••••1a2b */
const maskApiKey = (key?: string) => {
  if (!key || key.trim().length === 0) return 'None';
  if (key.length <= 8) return '••••••••';
  const prefix = key.slice(0, 3);
  const suffix = key.slice(-4);
  return `${prefix}••••••••${suffix}`;
};

export const ProviderSettings: React.FC<Props> = ({
  providers,
  selectedMember,
  onSaveProvider,
  onDeleteProvider,
  onTestConnection,
  onOpenChronicle,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'local' | 'cloud'>('local');
  const [providerType, setProviderType] = useState<ProviderProfile['provider_type']>('lm-studio');
  const [baseUrl, setBaseUrl] = useState('http://localhost:1234/v1');
  const [model, setModel] = useState('local-model');
  const [apiKey, setApiKey] = useState('');
  const [useApiKeyForLocal, setUseApiKeyForLocal] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [timeoutSeconds, setTimeoutSeconds] = useState(900);
  const [isDefault, setIsDefault] = useState(false);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, ConnectionTestResult>>({});
  const [saving, setSaving] = useState(false);

  const currentLocalPreset = LOCAL_ENGINES.find((e) => e.id === providerType) || LOCAL_ENGINES[0];
  const currentCloudPreset = getCloudPreset(providerType);

  const handleEdit = (p: ProviderProfile) => {
    setEditingId(p.id);
    setName(p.name);
    setKind(p.kind);
    setProviderType(p.provider_type);
    setBaseUrl(p.base_url);
    setModel(p.model);
    setApiKey(p.api_key || '');
    setUseApiKeyForLocal(p.kind === 'local' && Boolean(p.api_key && p.api_key.trim().length > 0));
    setShowApiKey(false);
    setShowAdvanced(false);
    setTimeoutSeconds(p.timeout_seconds || (p.kind === 'local' ? 900 : 120));
    setIsDefault(p.is_default === 1);
  };

  const handleNew = () => {
    setEditingId('new');
    setKind('local');
    setProviderType('lm-studio');
    setName('LM Studio (Local)');
    setBaseUrl('http://localhost:1234/v1');
    setModel('local-model');
    setApiKey('');
    setUseApiKeyForLocal(false);
    setShowApiKey(false);
    setShowAdvanced(false);
    setTimeoutSeconds(900);
    setIsDefault(false);
  };

  const handleKindSwitch = (newKind: 'local' | 'cloud') => {
    setKind(newKind);
    if (newKind === 'cloud') {
      const detected = detectCloudPresetFromKey(apiKey);
      const targetPreset = detected || CLOUD_PROVIDERS[0]; // Google Gemini default
      setProviderType(targetPreset.id);
      setName(targetPreset.name);
      setBaseUrl(targetPreset.defaultUrl);
      setModel(targetPreset.defaultModel);
      setTimeoutSeconds(120);
      setShowAdvanced(false);
    } else {
      const defaultLocal = LOCAL_ENGINES[0];
      setProviderType(defaultLocal.id);
      setName(defaultLocal.name);
      setBaseUrl(defaultLocal.defaultUrl);
      setModel(defaultLocal.defaultModel);
      setUseApiKeyForLocal(false);
      setTimeoutSeconds(900);
      setShowAdvanced(false);
    }
  };

  const handleCloudPresetChange = (presetId: ProviderType) => {
    setProviderType(presetId);
    const preset = CLOUD_PROVIDERS.find((p) => p.id === presetId);
    if (preset) {
      setBaseUrl(preset.defaultUrl);
      setModel(preset.defaultModel);
      if (editingId === 'new' || CLOUD_PROVIDERS.some((p) => p.name === name)) {
        setName(preset.name);
      }
    }
  };

  const handleCloudApiKeyChange = (val: string) => {
    setApiKey(val);
    const detected = detectCloudPresetFromKey(val);
    if (detected && detected.id !== providerType) {
      setProviderType(detected.id);
      setBaseUrl(detected.defaultUrl);
      setModel(detected.defaultModel);
      if (editingId === 'new' || CLOUD_PROVIDERS.some((p) => p.name === name)) {
        setName(detected.name);
      }
    }
  };

  const handleLocalEngineChange = (type: ProviderProfile['provider_type']) => {
    setProviderType(type);
    const preset = LOCAL_ENGINES.find((e) => e.id === type);
    if (preset) {
      setBaseUrl(preset.defaultUrl);
      setModel(preset.defaultModel);
      if (editingId === 'new' || LOCAL_ENGINES.some((e) => e.name === name)) {
        setName(preset.name);
      }
    }
  };

  const handleResetUrl = () => {
    if (kind === 'local') {
      setBaseUrl(currentLocalPreset.defaultUrl);
    } else {
      setBaseUrl(currentCloudPreset.defaultUrl);
    }
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
      const finalApiKey =
        kind === 'cloud'
          ? apiKey.trim() || undefined
          : useApiKeyForLocal && apiKey.trim().length > 0
          ? apiKey.trim()
          : undefined;

      const fallbackName = kind === 'cloud' ? currentCloudPreset.name : currentLocalPreset.name;
      const fallbackModel = kind === 'cloud' ? currentCloudPreset.defaultModel : currentLocalPreset.defaultModel;

      await onSaveProvider({
        id: editingId === 'new' ? undefined : editingId || undefined,
        name: name.trim() || fallbackName,
        kind,
        provider_type: providerType,
        base_url: baseUrl.trim(),
        model: model.trim() || fallbackModel,
        api_key: finalApiKey,
        timeout_seconds: Number(timeoutSeconds) || (kind === 'local' ? 900 : 120),
        is_default: isDefault ? 1 : 0,
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (p: ProviderProfile) => {
    await onSaveProvider({
      ...p,
      is_default: 1,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto select-none font-sans">
      <header className="h-14 px-6 border-b border-border flex items-center justify-between shrink-0 bg-surface sticky top-0 z-10">
        <div>
          <h2 className="text-body-medium font-semibold text-primary">AI Provider Profiles</h2>
          <p className="text-caption text-tertiary">
            Local on-device models (LM Studio, Ollama, vLLM) and Cloud API providers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedMember && onOpenChronicle && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onOpenChronicle}
              icon={<Clock className="w-3.5 h-3.5 text-vault-600 dark:text-vault-400" strokeWidth={2} />}
              title={`View ${selectedMember.name}'s Health Chronicle`}
            >
              Health Chronicle
            </Button>
          )}
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
            <h4 className="font-semibold text-primary mb-0.5">Dual-Mode AI Architecture</h4>
            <p>
              MedBuddy supports both 100% private on-device local engines (LM Studio, Ollama, vLLM) and cloud API endpoints.
              The provenance badge on each profile explicitly signals whether medical text stays on this computer or is routed to a third-party model.
            </p>
          </div>
        </div>

        {/* Edit or Create Profile Form */}
        {editingId && (
          <form
            onSubmit={handleSave}
            className="p-5 rounded-md bg-surface border border-border-strong shadow-xs space-y-5 animate-fade-in"
          >
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h3 className="text-h3 font-semibold text-primary">
                  {editingId === 'new' ? 'New AI Provider Profile' : `Edit Profile: ${name}`}
                </h3>
                <p className="text-caption text-tertiary mt-0.5">
                  {kind === 'cloud'
                    ? 'Cloud provider setup: Simply enter your API key to connect.'
                    : 'Local model setup: Connect to LM Studio, Ollama, vLLM, or any local AI engine.'}
                </p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
            </div>

            {/* Mode Selector Tabs: Local vs Cloud */}
            <div>
              <label className="block text-small font-medium text-secondary mb-1.5">
                Execution Mode
              </label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-surface-recessed rounded-md border border-border">
                <button
                  type="button"
                  onClick={() => handleKindSwitch('local')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-small font-medium transition-all ${
                    kind === 'local'
                      ? 'bg-surface text-primary shadow-xs border border-border-strong'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  <Server className="w-4 h-4 text-sage-600 dark:text-sage-400" />
                  <span>Local LLM (Private & On-Device)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleKindSwitch('cloud')}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded text-small font-medium transition-all ${
                    kind === 'cloud'
                      ? 'bg-surface text-primary shadow-xs border border-border-strong'
                      : 'text-tertiary hover:text-secondary'
                  }`}
                >
                  <Cloud className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Cloud Provider (API Key)</span>
                </button>
              </div>
            </div>

            {/* CLOUD PROVIDER CONFIGURATION */}
            {kind === 'cloud' && (
              <div className="space-y-4">
                {/* Cloud Provider Preset Selector */}
                <div>
                  <label className="block text-small font-medium text-secondary mb-1.5">
                    Cloud AI Provider Preset
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {CLOUD_PROVIDERS.map((preset) => {
                      const isSelected = providerType === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleCloudPresetChange(preset.id)}
                          className={`p-2.5 rounded border text-left transition-all ${
                            isSelected
                              ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-500 text-primary ring-1 ring-amber-500/40 shadow-2xs'
                              : 'bg-surface border-border hover:border-border-strong text-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            {preset.id === 'gemini' && <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                            {preset.id === 'openai' && <Cloud className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                            {preset.id === 'openrouter' && <Globe className="w-3.5 h-3.5 text-indigo-500 shrink-0" />}
                            {preset.id === 'groq' && <Zap className="w-3.5 h-3.5 text-orange-500 shrink-0" />}
                            {preset.id === 'custom-cloud' && <Server className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                            <span className="font-semibold text-small truncate">{preset.label}</span>
                          </div>
                          <div className="text-[11px] text-tertiary truncate mt-1">
                            {preset.badge}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-caption text-tertiary mt-1.5">
                    {currentCloudPreset.description}
                  </p>
                </div>

                {/* API Key Input */}
                <div className="space-y-2 p-4 rounded-md bg-surface-recessed border border-border">
                  <div className="flex items-center justify-between">
                    <label className="block text-small font-semibold text-primary">
                      API Key <span className="text-clay-500">*</span>
                    </label>
                    {currentCloudPreset.helpUrl && (
                      <a
                        href={currentCloudPreset.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-caption text-vault-600 dark:text-vault-400 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        {currentCloudPreset.helpLabel || 'Get API Key'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      required
                      value={apiKey}
                      onChange={(e) => handleCloudApiKeyChange(e.target.value)}
                      placeholder={currentCloudPreset.keyPlaceholder}
                      className="w-full h-10 pl-3 pr-10 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                      autoFocus={editingId === 'new'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors"
                      title={showApiKey ? 'Hide secret' : 'Show secret'}
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-caption text-tertiary">
                    {providerType === 'gemini'
                      ? 'MedBuddy connects directly to Google Gemini via Google\'s official OpenAI-compatible endpoint. No extra proxy needed.'
                      : providerType === 'openai'
                      ? 'Connects directly to OpenAI Platform API with your API key.'
                      : providerType === 'openrouter'
                      ? 'Routes requests through OpenRouter to Claude, Llama 3, DeepSeek, Gemini, etc.'
                      : providerType === 'groq'
                      ? 'Ultra-low latency inference via Groq Cloud.'
                      : 'Connects to any standard OpenAI-compatible cloud endpoint.'}
                  </p>
                </div>

                {/* Model Identifier & Profile Name Grid */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-small font-medium text-secondary mb-1">
                        Model Identifier <span className="text-clay-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        placeholder={currentCloudPreset.defaultModel}
                        className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-small font-medium text-secondary mb-1">
                        Profile Name <span className="text-clay-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={currentCloudPreset.name}
                        className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                      />
                    </div>
                  </div>

                  {/* Recommended Models Chips */}
                  {currentCloudPreset.recommendedModels.length > 0 && (
                    <div>
                      <label className="block text-caption font-medium text-secondary mb-1">
                        Popular Models for {currentCloudPreset.label} (click to select):
                      </label>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {currentCloudPreset.recommendedModels.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setModel(m)}
                            className={`px-2 py-0.5 text-caption font-mono rounded-sm border transition-all ${
                              model === m
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-400 dark:border-amber-600 font-semibold shadow-2xs'
                                : 'bg-surface hover:bg-surface-hover text-secondary border-border'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Custom Base URL: Show prominently for Custom Cloud */}
                {providerType === 'custom-cloud' && (
                  <div className="p-3.5 bg-surface-recessed rounded-md border border-border space-y-2 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <label className="block text-small font-medium text-secondary">
                        Base URL <span className="text-clay-500">*</span>
                      </label>
                      {baseUrl !== currentCloudPreset.defaultUrl && (
                        <button
                          type="button"
                          onClick={handleResetUrl}
                          className="text-[11px] text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1"
                        >
                          <RotateCcw className="w-2.5 h-2.5" /> Reset to default
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://api.together.xyz/v1"
                      className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                    />
                    <p className="text-caption text-tertiary">
                      Endpoint must support OpenAI-compatible <code className="font-mono">/chat/completions</code>.
                    </p>
                  </div>
                )}

                {/* Advanced Settings Accordion for Cloud */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 text-caption font-medium text-secondary hover:text-primary transition-colors py-1"
                  >
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showAdvanced ? 'Hide Advanced Settings' : 'Advanced Options (Custom Base URL, Timeout)'}</span>
                  </button>

                  {showAdvanced && (
                    <div className="space-y-3 mt-2.5 p-3.5 bg-surface-recessed rounded-md border border-border animate-fade-in">
                      {providerType !== 'custom-cloud' && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-caption font-medium text-secondary">
                              Base URL
                            </label>
                            {baseUrl !== currentCloudPreset.defaultUrl && (
                              <button
                                type="button"
                                onClick={handleResetUrl}
                                className="text-[11px] text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1 font-medium"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Reset to default ({currentCloudPreset.defaultUrl})
                              </button>
                            )}
                          </div>
                          <input
                            type="text"
                            value={baseUrl}
                            onChange={(e) => setBaseUrl(e.target.value)}
                            className="w-full h-[32px] px-3 text-small bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 transition-colors"
                          />
                          <p className="text-[11px] text-tertiary mt-1">
                            Pre-configured for {currentCloudPreset.label}. Only modify if using a custom reverse proxy or enterprise mirror.
                          </p>
                        </div>
                      )}

                      <div>
                        <label className="block text-caption font-medium text-secondary mb-1">
                          Request Timeout (seconds)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={600}
                          step={10}
                          value={timeoutSeconds}
                          onChange={(e) => setTimeoutSeconds(Number(e.target.value) || 120)}
                          className="w-full h-[32px] px-3 text-small bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 transition-colors"
                        />
                        <p className="text-[11px] text-tertiary mt-1">
                          Default is 120s for cloud inference.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* LOCAL LLM CONFIGURATION */}
            {kind === 'local' && (
              <div className="space-y-4">
                {/* Local Engine Presets (LM Studio, Ollama, vLLM, Custom) */}
                <div>
                  <label className="block text-small font-medium text-secondary mb-1.5">
                    Local Engine / Server
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LOCAL_ENGINES.map((eng) => (
                      <button
                        key={eng.id}
                        type="button"
                        onClick={() => handleLocalEngineChange(eng.id)}
                        className={`p-2.5 rounded border text-left transition-all ${
                          providerType === eng.id
                            ? 'bg-sage-50/50 dark:bg-sage-950/20 border-sage-500 text-primary ring-1 ring-sage-500/30'
                            : 'bg-surface border-border hover:border-border-strong text-secondary'
                        }`}
                      >
                        <div className="font-semibold text-small">{eng.label}</div>
                        <div className="text-[11px] text-tertiary truncate mt-0.5">{eng.defaultUrl}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-caption text-tertiary mt-1.5">
                    {currentLocalPreset.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Base URL (Default auto-populated with reset button) */}
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-small font-medium text-secondary">
                        Base URL
                      </label>
                      {baseUrl !== currentLocalPreset.defaultUrl && (
                        <button
                          type="button"
                          onClick={handleResetUrl}
                          className="text-caption text-vault-600 dark:text-vault-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          <RotateCcw className="w-3 h-3" /> Reset to default ({currentLocalPreset.defaultUrl})
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder={currentLocalPreset.defaultUrl}
                      className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                    />
                  </div>

                  {/* Model Identifier */}
                  <div>
                    <label className="block text-small font-medium text-secondary mb-1">
                      Model Identifier
                    </label>
                    <input
                      type="text"
                      required
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      placeholder={currentLocalPreset.defaultModel}
                      className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                    />
                  </div>

                  {/* Profile Name */}
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
                </div>

                {/* Recommended Local Models */}
                <div>
                  <label className="block text-caption font-medium text-secondary mb-1">
                    Common Model Identifiers
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {currentLocalPreset.recommendedModels.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={`px-2 py-0.5 text-caption font-mono rounded-sm border transition-all ${
                          model === m
                            ? 'bg-sage-100 dark:bg-sage-950/60 text-sage-800 dark:text-sage-200 border-sage-400 dark:border-sage-600 font-semibold shadow-2xs'
                            : 'bg-surface hover:bg-surface-hover text-secondary border-border'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key Option for Local LLM (Switchable) */}
                <div className="p-3.5 rounded-md bg-surface-recessed border border-border space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={useApiKeyForLocal}
                        onChange={(e) => {
                          setUseApiKeyForLocal(e.target.checked);
                          if (!e.target.checked) {
                            setApiKey('');
                          }
                        }}
                        className="rounded-sm border-border-strong text-vault-600 focus:ring-vault-500/35"
                      />
                      <span className="text-small font-medium text-primary">
                        Use API Key / Authentication for Local Engine
                      </span>
                    </label>
                    <span className="text-caption text-tertiary">
                      Optional: for vLLM (<code className="font-mono">--api-key</code>), LiteLLM, or reverse proxies
                    </span>
                  </div>

                  {useApiKeyForLocal && (
                    <div className="pt-1 space-y-1 animate-fade-in">
                      <div className="relative">
                        <input
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="e.g. your-bearer-token or api-key"
                          className="w-full h-[34px] pl-3 pr-10 text-body bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-primary transition-colors"
                        >
                          {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <span className="text-caption text-tertiary">
                        This token will be sent in the <code className="font-mono">Authorization: Bearer</code> header.
                      </span>
                    </div>
                  )}
                </div>

                {/* Advanced Settings Accordion for Local */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-1.5 text-caption font-medium text-secondary hover:text-primary transition-colors py-1"
                  >
                    {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{showAdvanced ? 'Hide Advanced Options' : 'Show Advanced Options (Timeout window)'}</span>
                  </button>

                  {showAdvanced && (
                    <div className="mt-2.5 p-3.5 bg-surface-recessed rounded-md border border-border animate-fade-in space-y-1.5">
                      <label className="block text-caption font-medium text-secondary">
                        Request Timeout (seconds)
                      </label>
                      <input
                        type="number"
                        min={60}
                        max={3600}
                        step={60}
                        value={timeoutSeconds}
                        onChange={(e) => setTimeoutSeconds(Number(e.target.value) || 900)}
                        className="w-full h-[32px] px-3 text-small bg-surface border border-border-strong rounded-sm text-primary font-mono focus:outline-none focus:border-vault-500 transition-colors"
                      />
                      <span className="text-caption text-tertiary block">
                        Default: 900s (15 min). Local models evaluating multi-document records need extended inference windows.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Set as Default Checkbox */}
            <div className="flex items-center gap-2 pt-1 border-t border-border">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded-sm border-border-strong text-vault-600 focus:ring-vault-500/35"
              />
              <label htmlFor="isDefault" className="text-small text-secondary cursor-pointer select-none">
                Set as default provider for new document syntheses and chat
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  handleTest(
                    {
                      base_url: baseUrl,
                      provider_type: providerType,
                      api_key: kind === 'cloud' ? apiKey : useApiKeyForLocal ? apiKey : undefined,
                    },
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

            {/* Test Connection Results & Detected Models */}
            {testResults['editing'] && (
              <div
                className={`p-3 rounded-md text-caption border mt-2 space-y-2 ${
                  testResults['editing'].success
                    ? 'bg-sage-50 dark:bg-sage-950/30 text-sage-700 dark:text-sage-300 border-sage-300 dark:border-sage-800'
                    : 'bg-clay-50 dark:bg-clay-950/30 text-clay-700 dark:text-clay-300 border-clay-300 dark:border-clay-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{testResults['editing'].message}</span>
                  {testResults['editing'].latencyMs && (
                    <span className="font-mono tabular-nums">{testResults['editing'].latencyMs}ms</span>
                  )}
                </div>

                {/* If loaded models were returned, show clickable chips to select */}
                {testResults['editing'].availableModels && testResults['editing'].availableModels.length > 0 && (
                  <div className="pt-2 border-t border-sage-200 dark:border-sage-800/60">
                    <span className="block text-secondary mb-1 font-medium">
                      Loaded model(s) detected on server (click to select):
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                      {testResults['editing'].availableModels.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setModel(m)}
                          className={`px-2 py-0.5 text-caption font-mono rounded-sm border transition-all ${
                            model === m
                              ? 'bg-sage-600 text-white border-sage-700 font-semibold shadow-2xs'
                              : 'bg-surface hover:bg-surface-hover text-primary border-sage-300 dark:border-sage-700'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </form>
        )}

        {/* Existing Provider Profiles List */}
        <div className="space-y-3">
          {providers.map((p) => {
            const isLocal = p.kind === 'local';
            const testRes = testResults[p.id];
            const isTesting = testingId === p.id;
            const hasApiKey = Boolean(p.api_key && p.api_key.trim().length > 0);

            // Determine badge label for engine
            const engineLabel =
              p.provider_type === 'gemini'
                ? 'Google Gemini'
                : p.provider_type === 'openai'
                ? 'OpenAI'
                : p.provider_type === 'openrouter'
                ? 'OpenRouter'
                : p.provider_type === 'groq'
                ? 'Groq'
                : p.provider_type === 'custom-cloud'
                ? 'Custom Cloud'
                : p.provider_type === 'lm-studio'
                ? 'LM Studio'
                : p.provider_type === 'ollama'
                ? 'Ollama'
                : p.provider_type === 'vllm'
                ? 'vLLM'
                : 'Custom / Other';

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
                      <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-surface-recessed text-secondary border border-border">
                        {engineLabel}
                      </span>
                      {p.is_default === 1 && (
                        <span className="text-caption font-medium px-2 py-0.5 rounded-full bg-vault-50 dark:bg-vault-950/50 text-vault-600 dark:text-vault-400 border border-vault-200 dark:border-vault-800">
                          Default
                        </span>
                      )}
                    </div>

                    <div className="text-small text-tertiary font-mono space-y-0.5">
                      <p>
                        Model: <strong className="text-primary font-medium">{p.model}</strong>
                      </p>
                      <p>
                        Endpoint: <span className="text-secondary">{p.base_url}</span>
                      </p>
                      <p>
                        Auth:{' '}
                        {hasApiKey ? (
                          <span className="text-secondary">
                            Key ({maskApiKey(p.api_key)})
                          </span>
                        ) : isLocal ? (
                          <span className="text-tertiary">None (Direct local)</span>
                        ) : (
                          <span className="text-clay-500">Missing Key</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {p.is_default !== 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(p)}
                        title="Set as default provider"
                      >
                        Set Default
                      </Button>
                    )}
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
                        ? 'bg-sage-100 text-sage-600 border-sage-300 dark:bg-sage-950/40 dark:text-sage-400 dark:border-sage-800'
                        : 'bg-clay-100 text-clay-600 border-clay-300 dark:bg-clay-950/40 dark:text-clay-400 dark:border-clay-800'
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
