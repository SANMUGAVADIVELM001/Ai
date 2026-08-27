import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

interface Props {
  unsatisfiedPrerequisites: string[];
  linkTo?: string;
  linkLabel?: string;
}

export default function LockedNotice({ unsatisfiedPrerequisites, linkTo, linkLabel = 'View blocking skill' }: Props) {
  return (
    <div className="p-4 rounded-lg bg-surface-secondary border border-line">
      <p className="text-ink-muted text-xs flex items-center gap-1.5">
        <Lock size={12} strokeWidth={1.75} className="text-locked" aria-hidden="true" />
        Unlocks after: <span className="text-ink-secondary">{unsatisfiedPrerequisites.join(', ') || 'prerequisites are met'}</span>
      </p>
      {linkTo && (
        <Link to={linkTo} className="inline-block mt-2 text-brand-500 hover:text-brand-600 text-xs font-medium transition-colors">
          {linkLabel} →
        </Link>
      )}
    </div>
  );
}
