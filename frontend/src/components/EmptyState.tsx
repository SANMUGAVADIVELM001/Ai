import { Link } from 'react-router-dom';
import { Sparkles, type LucideIcon } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaTo?: string;
}

export default function EmptyState({ icon: Icon = Sparkles, title, body, ctaLabel, ctaTo }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-2xl bg-white border border-line">
      <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center mb-4">
        <Icon size={24} strokeWidth={1.75} className="text-brand-500" aria-hidden="true" />
      </div>
      <h2 className="text-ink font-semibold text-lg mb-2">{title}</h2>
      <p className="text-ink-secondary text-sm max-w-md mb-6">{body}</p>
      {ctaLabel && ctaTo && (
        <Link
          to={ctaTo}
          className="px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm transition-colors"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
