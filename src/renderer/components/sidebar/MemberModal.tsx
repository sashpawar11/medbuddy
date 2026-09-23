import React, { useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import type { FamilyMember } from '../../../shared/types';
import { Button } from '../common/Button';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  editingMember?: FamilyMember | null;
}

/**
 * 6-color rotation within Ink/Vault families per §9.5:
 * Deterministic, composed, and muted — never bright neon/random colors.
 */
export const MEMBER_AVATAR_COLORS = [
  '#2C5CA8', // vault-600
  '#3873C9', // vault-500
  '#525B72', // ink-600
  '#3A4257', // ink-700
  '#5991DB', // vault-400
  '#6F7891', // ink-500
];

export const MemberModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editingMember,
}) => {
  const [name, setName] = useState(editingMember?.name || '');
  const [relationship, setRelationship] = useState(editingMember?.relationship || 'Self');
  const [dob, setDob] = useState(editingMember?.dob || '');
  const [avatarColor, setAvatarColor] = useState(editingMember?.avatar_color || MEMBER_AVATAR_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSave({
        name: name.trim(),
        relationship,
        dob: dob || undefined,
        avatar_color: avatarColor,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save family member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-180">
      <div className="bg-surface border border-border rounded-lg w-full max-w-[480px] p-6 shadow-md">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-vault-50 text-vault-600 flex items-center justify-center">
              <UserPlus className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="text-h2 font-semibold text-primary">
                {editingMember ? 'Edit Profile' : 'Add Family Member'}
              </h3>
              <p className="text-small text-secondary">
                Private medical profile stored locally in your vault
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
              Full Name
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eleanor Vance, Mom, Leo"
              className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary placeholder:text-tertiary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
            />
          </div>

          <div>
            <label className="block text-small font-medium text-secondary mb-1">
              Relationship
            </label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
            >
              <option value="Self">Self</option>
              <option value="Spouse / Partner">Spouse / Partner</option>
              <option value="Child">Child</option>
              <option value="Parent">Parent</option>
              <option value="Sibling">Sibling</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-small font-medium text-secondary mb-1">
              Date of Birth <span className="text-tertiary font-normal">(Optional)</span>
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-[34px] px-3 text-body bg-surface border border-border-strong rounded-sm text-primary focus:outline-none focus:border-vault-500 focus:ring-2 focus:ring-vault-500/35 transition-colors"
            />
          </div>

          <div>
            <label className="block text-small font-medium text-secondary mb-2">
              Avatar Tint <span className="text-caption text-tertiary">(Ink/Vault Palette)</span>
            </label>
            <div className="flex items-center gap-2.5">
              {MEMBER_AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                    avatarColor === c
                      ? 'ring-2 ring-vault-500 ring-offset-2 ring-offset-surface'
                      : 'opacity-85 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                >
                  <span className="text-[10px] text-white font-bold select-none">
                    {name ? name.slice(0, 1).toUpperCase() : 'M'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-border mt-6">
            {editingMember && onDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (confirm(`Delete ${editingMember.name} and all associated medical records?`)) {
                    await onDelete(editingMember.id);
                    onClose();
                  }
                }}
                icon={<Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
              >
                Delete Member
              </Button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="md" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="md" loading={loading}>
                {editingMember ? 'Save Changes' : 'Create Profile'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
