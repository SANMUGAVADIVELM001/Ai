import { Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LearnerProvider } from './context/LearnerContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import AppShell from './components/AppShell.js';
import Login from './pages/Login.js';
import Signup from './pages/Signup.js';
import Landing from './pages/Landing.js';
import Home from './pages/Home.js';
import MyGoals from './pages/MyGoals.js';
import Assessment from './pages/Assessment.js';
import SkillAnalysis from './pages/SkillAnalysis.js';
import Roadmap from './pages/Roadmap.js';
import ModulePage from './pages/ModulePage.js';
import Resources from './pages/Resources.js';
import Projects from './pages/Projects.js';
import Assessments from './pages/Assessments.js';
import AICoach from './pages/AICoach.js';
import Dashboard from './pages/Dashboard.js';
import Profile from './pages/Profile.js';
import Settings from './pages/Settings.js';

function AuthenticatedApp() {
  return (
    <ProtectedRoute>
      <LearnerProvider>
        <AppShell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/goals" element={<MyGoals />} />
            <Route path="/assessment" element={<Assessment />} />
            <Route path="/skills" element={<SkillAnalysis />} />
            <Route path="/roadmap" element={<Roadmap />} />
            <Route path="/roadmap/:moduleId" element={<ModulePage />} />
            <Route path="/resources" element={<Resources />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/assessments" element={<Assessments />} />
            <Route path="/coach" element={<AICoach />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </AppShell>
      </LearnerProvider>
    </ProtectedRoute>
  );
}

/**
 * The root path branches on auth state instead of being folded into
 * AuthenticatedApp's route table: an anonymous visitor sees the public
 * marketing page, an authenticated learner sees exactly what "/" has always
 * rendered (Home, inside the normal app shell). Every other authenticated
 * route (/goals, /assessment, /roadmap, ...) is untouched by this.
 */
function RootRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-ink-muted text-sm">Loading...</p>
      </div>
    );
  }

  if (!user) return <Landing />;

  return (
    <LearnerProvider>
      <AppShell>
        <Home />
      </AppShell>
    </LearnerProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </AuthProvider>
  );
}
