import React, { useState } from 'react';
import { X, FolderPlus } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-hairline rounded-lg w-full max-w-sm p-5 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-hairline mb-4">
          <div className="flex items-center gap-2">
            <FolderPlus className="w-4 h-4 text-ink" />
            <h3 className="text-sm font-semibold text-ink">New Medical Folder</h3>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-mute mb-4">
          Creating a new folder under <span className="text-ink font-medium">{memberName}</span>.
        </p>

        {error && (
          <div className="mb-3 p-2 rounded bg-accent-red-soft border border-hairline text-accent-red text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-mute mb-1">Folder Name</label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bloodwork, Cardiology, Prescriptions"
              className="w-full px-3 py-2 text-xs bg-surface-elevated border border-hairline rounded-md text-ink placeholder:text-stone focus:outline-none focus:border-hairline-strong transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-hairline">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-mute hover:text-ink transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3.5 py-1.5 text-xs font-medium bg-primary text-primary-text rounded-md hover:bg-primary-pressed transition-colors disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
