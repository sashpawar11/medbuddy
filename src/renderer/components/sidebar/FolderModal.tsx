import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';
import { Button } from '../common/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
  memberName: string;
}

export const FolderModal: React.FC<Props> = ({ isOpen, onClose, onSave, memberName }) => {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a folder name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave(name.trim());
      setName('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-180">
      <div className="bg-surface border border-border rounded-lg w-full max-w-[420px] p-6 shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-h2 font-semibold text-primary">New Medical Folder</h3>
              <p className="text-caption text-secondary">
                Under profile: <span className="font-semibold text-primary">{memberName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-primary p-1 rounded-sm hover:bg-surface-hover transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-sm bg-clay-100 border border-clay-300 text-clay-600 text-caption">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-small font-medium text-secondary mb-1">
              Folder Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bloodwork, Cardiology, Prescriptions"
              className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-border mt-5">
            <Button type="button" variant="ghost" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" loading={loading}>
              Create Folder
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
