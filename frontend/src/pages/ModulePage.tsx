import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Rocket, CircleCheck, CircleAlert } from 'lucide-react';
import ProgressBar from '../components/ProgressBar.js';
import EmptyState from '../components/EmptyState.js';
import ResourceCard from '../components/ResourceCard.js';
import LockedNotice from '../components/LockedNotice.js';
import { api } from '../api.js';
import { useLearner } from '../context/LearnerContext.js';
import { useEnsureRoadmap } from '../hooks/useEnsureData.js';
import type { AssessmentQuestion, ModuleProgressRecord, SubmitAnswerResponseExtended } from '../types.js';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'text-success bg-success-bg',
  medium: 'text-warning bg-warning-bg',
  hard: 'text-error bg-error-bg',
};

/**
 * Dedicated module learning page, reached only by clicking a milestone in
 * the Roadmap or Projects pages (not a sidebar destination) — navigating
 * here never itself mutates learning state; every phase transition below is
 * a deliberate learner action (button click) hitting a real backend route.
 */
export default function ModulePage() {
  const { moduleId } = useParams<{ moduleId: string }>();
  const navigate = useNavigate();
  const { profile } = useLearner();
  const { roadmap, loading: roadmapLoading, needsAnalysis } = useEnsureRoadmap();

  const milestone = roadmap?.milestones.find((m) => m.id === moduleId);
  const [progress, setProgress] = useState<ModuleProgressRecord | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [quiz, setQuiz] = useState<QuizState | null>(null);

  useEffect(() => {
    if (!milestone) return;
    let cancelled = false;
    setLoadingProgress(true);
    api
      .getModuleState(milestone.id, milestone.skill)
      .then((p) => {
        if (!cancelled) setProgress(p);
      })
      .finally(() => {
        if (!cancelled) setLoadingProgress(false);
      });
    return () => {
      cancelled = true;
    };
  }, [milestone?.id, milestone?.skill]);

  if (roadmapLoading || loadingProgress) return <p className="text-ink-secondary">Loading module...</p>;

  if (needsAnalysis) {
    return (
      <EmptyState icon={BookOpen} title="No roadmap yet" body="Complete the diagnostic assessment first." ctaLabel="Take the Assessment" ctaTo="/assessment" />
    );
  }

  if (!milestone || !roadmap || !profile) {
    return (
      <EmptyState icon={BookOpen} title="Module not found" body="This module isn't part of your current roadmap." ctaLabel="View Roadmap" ctaTo="/roadmap" />
    );
  }

  if (milestone.status === 'locked') {
    return (
      <div>
        <h1 className="text-2xl font-bold text-ink mb-1">{milestone.skill}</h1>
        <p className="text-ink-secondary mb-6">This module is locked.</p>
        <LockedNotice unsatisfiedPrerequisites={milestone.unsatisfiedPrerequisites} linkTo="/roadmap" linkLabel="View Roadmap" />
      </div>
    );
  }

  async function refreshProgress() {
    const p = await api.getModuleState(milestone!.id, milestone!.skill);
    setProgress(p);
  }

  async function handleStartLearning() {
    const p = await api.startModuleLearning(milestone!.id, milestone!.skill);
    setProgress(p);
  }

  async function handleReadyForAssessment() {
    const p = await api.markReadyForAssessment(milestone!.id, milestone!.skill);
    setProgress(p);
  }

  async function handleStartAssessment() {
    if (!profile!.roleId) return;
    const res = await api.startModuleAssessment(milestone!.id, milestone!.skill, profile!.roleId);
    setQuiz({
      sessionId: res.sessionId,
      type: res.type,
      totalQuestions: res.totalQuestions,
      questionNumber: 1,
      question: res.next?.question ?? null,
      selected: null,
      feedback: null,
      completion: null,
    });
  }

  if (quiz) {
    return (
      <ModuleQuiz
        quiz={quiz}
        skill={milestone.skill}
        onQuizChange={setQuiz}
        onDone={async () => {
          setQuiz(null);
          await refreshProgress();
        }}
      />
    );
  }

  const phase = progress?.phase ?? 'not_started';

  return (
    <div>
      <div className="mb-6">
        <Link to="/roadmap" className="text-ink-muted hover:text-ink-secondary text-xs transition-colors">
          ← Back to Roadmap
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-ink mb-1">{milestone.skill}</h1>
      <p className="text-ink-secondary mb-6">Milestone {milestone.order + 1} of {roadmap.milestones.length} toward {roadmap.roleTitle}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
          <p className="text-ink-muted text-xs mb-1">Your Mastery</p>
          <p className="text-ink text-2xl font-bold mb-2">{milestone.currentMastery}%</p>
          <ProgressBar value={milestone.currentMastery} colorClass="bg-brand-500" />
        </div>
        <div className="p-4 rounded-xl bg-white border border-line shadow-sm">
          <p className="text-ink-muted text-xs mb-1">Target</p>
          <p className="text-ink text-2xl font-bold mb-2">{milestone.targetMastery}%</p>
          <ProgressBar value={milestone.targetMastery} colorClass="bg-line" />
        </div>
      </div>

      <div className="p-4 rounded-xl bg-brand-50 border border-brand-200 mb-6">
        <p className="text-brand-600 text-[11px] font-semibold mb-1 tracking-wide">WHY THIS MODULE</p>
        <p className="text-ink-secondary text-sm leading-relaxed">{milestone.whyRecommended}</p>
      </div>

      {phase === 'remedial' && progress && (
        <div className="p-4 rounded-xl bg-warning-bg border border-warning mb-6">
          <p className="text-warning text-sm font-semibold mb-1 flex items-center gap-1.5">
            <CircleAlert size={14} strokeWidth={1.75} aria-hidden="true" /> Needs Improvement
          </p>
          <p className="text-ink-secondary text-sm mb-2">
            Your last attempt scored {progress.lastScore}% (required: {progress.passingThreshold}%).
          </p>
          {progress.weakTopics.length > 0 && (
            <p className="text-ink-secondary text-xs">Weak topics: {progress.weakTopics.join(', ')}</p>
          )}
        </div>
      )}

      {phase === 'passed' && (
        <div className="p-4 rounded-xl bg-success-bg border border-success mb-6">
          <p className="text-success text-sm font-semibold flex items-center gap-1.5">
            <CircleCheck size={16} strokeWidth={1.75} aria-hidden="true" /> Module Passed
          </p>
          <p className="text-ink-secondary text-xs mt-1">Score: {progress?.lastScore}%</p>
        </div>
      )}

      {milestone.resources.length > 0 && (
        <div className="mb-6">
          <p className="text-ink-secondary text-sm font-medium mb-2">Learning Resources</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {milestone.resources.map((sr) => (
              <ResourceCard key={sr.resource.id} scored={sr} skill={milestone.skill} sessionId={null} profile={profile} />
            ))}
          </div>
        </div>
      )}

      {phase === 'remedial' && progress && progress.remedialResourceIds.length > 0 && (
        <div className="mb-6">
          <p className="text-ink-secondary text-sm font-medium mb-2">Recommended Review</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {milestone.resources
              .filter((sr) => progress.remedialResourceIds.includes(sr.resource.id))
              .map((sr) => (
                <ResourceCard key={sr.resource.id} scored={sr} skill={milestone.skill} sessionId={null} profile={profile} />
              ))}
          </div>
        </div>
      )}

      {milestone.project && (
        <div className="mb-6 p-4 rounded-lg bg-white border border-line shadow-sm">
          <p className="text-ink-secondary text-sm font-medium mb-1 flex items-center gap-1.5">
            <Rocket size={14} strokeWidth={1.75} aria-hidden="true" /> Suggested Project
          </p>
          <p className="text-ink font-semibold text-sm">{milestone.project.title}</p>
          <p className="text-ink-secondary text-xs mt-1">{milestone.project.description}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {(phase === 'not_started' || phase === 'learning') && (
          <button
            onClick={handleStartLearning}
            className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            {phase === 'not_started' ? 'Start Learning' : 'Continue Learning'}
          </button>
        )}
        {phase === 'learning' && (
          <button
            onClick={handleReadyForAssessment}
            className="px-5 py-2.5 rounded-lg border border-brand-500 text-brand-500 hover:bg-brand-50 text-sm font-semibold transition-colors"
          >
            I'm Ready — Take Assessment
          </button>
        )}
        {(phase === 'assessment_ready' || phase === 'remedial') && (
          <button
            onClick={handleStartAssessment}
            className="px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold transition-colors"
          >
            {phase === 'remedial' ? 'Retake Assessment' : 'Take Module Assessment'}
          </button>
        )}
        {phase === 'passed' && (
          <button
            onClick={() => navigate('/roadmap')}
            className="px-5 py-2.5 rounded-lg border border-brand-500 text-brand-500 hover:bg-brand-50 text-sm font-semibold transition-colors"
          >
            Back to Roadmap
          </button>
        )}
      </div>
    </div>
  );
}

interface QuizState {
  sessionId: string;
  type: string;
  totalQuestions: number;
  questionNumber: number;
  question: AssessmentQuestion | null;
  selected: number | null;
  feedback: SubmitAnswerResponseExtended | null;
  completion: SubmitAnswerResponseExtended['assessmentComplete'] | null;
}

function ModuleQuiz({
  quiz,
  skill,
  onQuizChange,
  onDone,
}: {
  quiz: QuizState;
  skill: string;
  onQuizChange: (q: QuizState | null) => void;
  onDone: () => void;
}) {
  async function handleSelect(optionIndex: number) {
    if (!quiz.question || quiz.feedback) return;
    onQuizChange({ ...quiz, selected: optionIndex });
    const result = await api.submitAnswer(quiz.sessionId, quiz.question.id, optionIndex);
    onQuizChange({ ...quiz, selected: optionIndex, feedback: result, completion: result.assessmentComplete ?? null });
  }

  async function handleNext() {
    if (quiz.completion) return;
    const next = await api.nextQuestion(quiz.sessionId);
    if (next.done || !next.question) return;
    onQuizChange({
      ...quiz,
      questionNumber: quiz.questionNumber + 1,
      question: next.question,
      selected: null,
      feedback: null,
    });
  }

  if (quiz.completion) {
    const { passed, weakTopics, masteryUpdate } = quiz.completion;
    return (
      <div className="text-center py-10">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5 ${passed ? 'bg-success-bg' : 'bg-warning-bg'}`}>
          {passed ? (
            <CircleCheck size={32} strokeWidth={1.75} className="text-success" aria-hidden="true" />
          ) : (
            <CircleAlert size={32} strokeWidth={1.75} className="text-warning" aria-hidden="true" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">{passed ? 'Assessment Passed' : 'Needs Improvement'}</h1>
        <p className="text-ink-secondary mb-6">
          Score: <span className="text-ink font-semibold">{masteryUpdate?.current ?? '—'}%</span>
        </p>
        {!passed && weakTopics.length > 0 && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-warning-bg border border-warning text-left">
            <p className="text-warning text-xs font-semibold mb-2 tracking-wide">WEAK TOPICS</p>
            <ul className="text-ink-secondary text-sm list-disc list-inside">
              {weakTopics.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={onDone}
          className="px-8 py-3 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
        >
          {passed ? 'Continue' : 'Start Remedial Review'}
        </button>
      </div>
    );
  }

  if (!quiz.question) return <p className="text-ink-secondary">Loading question...</p>;

  const question = quiz.question;
  const feedback = quiz.feedback;

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-ink-secondary mb-2">
          <span>{skill} Assessment</span>
          <span>
            Question {quiz.questionNumber} / {quiz.totalQuestions}
          </span>
        </div>
        <ProgressBar value={(quiz.questionNumber / Math.max(1, quiz.totalQuestions)) * 100} />
      </div>

      <div className="p-6 rounded-2xl bg-white border border-line shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2.5 py-1 rounded-md bg-brand-50 text-brand-600 text-xs font-medium">{question.skill}</span>
          <span className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {question.difficulty}
          </span>
        </div>

        <h2 className="text-lg font-semibold text-ink mb-5">{question.question}</h2>

        <div className="flex flex-col gap-3">
          {question.options.map((opt, idx) => {
            const isSelected = quiz.selected === idx;
            const isCorrectOption = feedback && idx === feedback.correctAnswer;
            const isWrongSelected = feedback && isSelected && !feedback.correct;

            let cls = 'border-line bg-white hover:border-brand-300 text-ink';
            if (feedback) {
              if (isCorrectOption) cls = 'border-success bg-success-bg text-ink';
              else if (isWrongSelected) cls = 'border-error bg-error-bg text-ink';
              else cls = 'border-line bg-white text-ink-muted';
            } else if (isSelected) {
              cls = 'border-brand-500 bg-brand-50 text-ink';
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={!!feedback}
                className={`text-left px-4 py-3 rounded-lg border transition-colors ${cls}`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {feedback && (
          <div className="mt-5 p-4 rounded-lg bg-surface-secondary border border-line">
            <p className={`font-semibold text-sm mb-1 ${feedback.correct ? 'text-success' : 'text-error'}`}>
              {feedback.correct ? 'Correct' : 'Incorrect'}
            </p>
            <p className="text-ink-secondary text-sm">{feedback.explanation}</p>
          </div>
        )}

        {feedback && (
          <button
            onClick={handleNext}
            className="mt-5 px-6 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-semibold transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
