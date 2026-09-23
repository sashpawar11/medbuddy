import React, { useState } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import type { FamilyMember } from '../../../shared/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Omit<FamilyMember, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  editingMember?: FamilyMember | null;
}

const AVATAR_COLORS = [
  '#57c1ff', // Blue
  '#59d499', // Green
  '#ffc533', // Yellow
  '#ff6161', // Red
  '#c084fc', // Purple
  '#fb923c', // Orange
  '#2dd4bf', // Teal
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
  const [avatarColor, setAvatarColor] = useState(editingMember?.avatar_color || AVATAR_COLORS[0]);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/80 backdrop-blur-sm p-4">
      <div className="bg-surface border border-hairline rounded-xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-hairline mb-5">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-ink" />
            <h3 className="text-base font-semibold text-ink">
              {editingMember ? 'Edit Family Member' : 'Add Family Member'}
            </h3>
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-accent-red-soft border border-hairline text-accent-red text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-mute mb-1.5">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eleanor Vance, Mom, Leo"
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-hairline rounded-md text-ink placeholder:text-stone focus:outline-none focus:border-hairline-strong transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-mute mb-1.5">Relationship</label>
            <select
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-hairline rounded-md text-ink focus:outline-none focus:border-hairline-strong transition-colors"
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
            <label className="block text-xs font-medium text-mute mb-1.5">Date of Birth (Optional)</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-elevated border border-hairline rounded-md text-ink focus:outline-none focus:border-hairline-strong transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-mute mb-2">Avatar Color</label>
            <div className="flex items-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${avatarColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-surface' : 'opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-hairline mt-6">
            {editingMember && onDelete ? (
              <button
                type="button"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete ${editingMember.name} and all their files?`)) {
                    await onDelete(editingMember.id);
                    onClose();
                  }
                }}
                className="flex items-center gap-1.5 text-xs text-accent-red hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Member
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs text-mute hover:text-ink transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-1.5 text-xs font-medium bg-primary text-primary-text rounded-md hover:bg-primary-pressed transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving...' : editingMember ? 'Save Changes' : 'Create Member'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
