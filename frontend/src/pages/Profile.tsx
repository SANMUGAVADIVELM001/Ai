import { useEffect, useState } from 'react';
import { UserRound } from 'lucide-react';
import EmptyState from '../components/EmptyState.js';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';

export default function Profile() {
  const { profile } = useLearner();
  const [roleTitle, setRoleTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.roleId) return;
    api.getRoles().then(({ roles }) => {
      setRoleTitle(roles.find((r) => r.id === profile.roleId)?.title ?? null);
    });
  }, [profile?.roleId]);

  if (!profile) {
    return (
      <EmptyState
        icon={UserRound}
        title="No profile yet"
        body="Enter your learning goal to create your learner profile."
        ctaLabel="Get Started"
        ctaTo="/assessment"
      />
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink mb-1">Learner Profile</h1>
      <p className="text-ink-secondary mb-8">Your current goal and preferences, as understood from your onboarding.</p>

      <div className="flex flex-col gap-4">
        <Field label="Goal" value={profile.goal} />
        <Field label="Target Role" value={roleTitle ?? profile.roleId ?? '—'} />
        <Field label="Target Duration" value={profile.targetDuration ?? 'Not specified'} />
        <Field label="Study Time" value={profile.studyTimePerDay ? `${profile.studyTimePerDay} hours/day` : 'Not specified'} />
        <Field label="Known Skills (self-reported)" value={profile.currentSkills.join(', ') || 'None mentioned'} />
        <Field label="Learning Preferences" value={profile.learningPreferences.join(', ') || 'None set'} />
        <Field label="Experience Level" value="Determined by diagnostic assessment, not self-reported" />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
      <p className="text-ink-muted text-xs mb-1">{label}</p>
      <p className="text-ink text-sm">{value}</p>
    </div>
  );
}
