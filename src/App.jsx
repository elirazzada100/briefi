import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Page imports
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import NewProject from './pages/NewProject.jsx';
import CreativeDNA from './pages/CreativeDNA';
import CategoryPicker from './pages/CategoryPicker';
import HookPicker from './pages/HookPicker';
import BodyPicker from './pages/BodyPicker';
import CTAPicker from './pages/CTAPicker';
import FinalBrief from './pages/FinalBrief';
import BriefPack from './pages/BriefPack';
import PDFExport from './pages/PDFExport';
import ConceptPicker from './pages/ConceptPicker';
import UserProfile from './pages/UserProfile';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLearning from './pages/admin/Learning';
import GenerationDebug from './pages/admin/GenerationDebug';
import Settings from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import About from './pages/About';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm font-medium">Briefi טוען...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />

      {/* Protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/new-project" element={<ProtectedRoute><NewProject /></ProtectedRoute>} />
      <Route path="/project/:projectId/creative-dna" element={<ProtectedRoute><CreativeDNA /></ProtectedRoute>} />
      <Route path="/project/:projectId/category" element={<ProtectedRoute><CategoryPicker /></ProtectedRoute>} />
      <Route path="/project/:projectId/concepts" element={<ProtectedRoute><ConceptPicker /></ProtectedRoute>} />
      <Route path="/project/:projectId/hooks" element={<ProtectedRoute><HookPicker /></ProtectedRoute>} />
      <Route path="/project/:projectId/body" element={<ProtectedRoute><BodyPicker /></ProtectedRoute>} />
      <Route path="/project/:projectId/cta" element={<ProtectedRoute><CTAPicker /></ProtectedRoute>} />
      <Route path="/project/:projectId/final-brief" element={<ProtectedRoute><FinalBrief /></ProtectedRoute>} />
      <Route path="/project/:projectId/brief-pack" element={<ProtectedRoute><BriefPack /></ProtectedRoute>} />
      <Route path="/project/:projectId/export" element={<ProtectedRoute><PDFExport /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
      <Route path="/admin/learning" element={<ProtectedRoute><AdminLearning /></ProtectedRoute>} />
      <Route path="/admin/generation-debug/:generationRunId" element={<ProtectedRoute><GenerationDebug /></ProtectedRoute>} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/settings/privacy" element={<PrivacyPolicy />} />
      <Route path="/settings/terms" element={<TermsOfService />} />
      <Route path="/settings/about" element={<About />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App