import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { LearnerProvider } from './context/LearnerContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import AppShell from './components/AppShell.js';
import Login from './pages/Login.js';
import Signup from './pages/Signup.js';
import Home from './pages/Home.js';
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

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/*" element={<AuthenticatedApp />} />
      </Routes>
    </AuthProvider>
  );
}
