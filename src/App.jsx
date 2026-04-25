import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

// Page imports
import Dashboard from './pages/Dashboard';
import NewProject from './pages/NewProject';
import CreativeDNA from './pages/CreativeDNA';
import CategoryPicker from './pages/CategoryPicker';
import HookPicker from './pages/HookPicker';
import BodyPicker from './pages/BodyPicker';
import CTAPicker from './pages/CTAPicker';
import FinalBrief from './pages/FinalBrief';
import BriefPack from './pages/BriefPack';
import PDFExport from './pages/PDFExport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-briefi-bg">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-briefi-muted text-sm font-medium">Briefi טוען...</p>
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
      <Route path="/" element={<Dashboard />} />
      <Route path="/new-project" element={<NewProject />} />
      <Route path="/project/:projectId/creative-dna" element={<CreativeDNA />} />
      <Route path="/project/:projectId/category" element={<CategoryPicker />} />
      <Route path="/project/:projectId/hooks" element={<HookPicker />} />
      <Route path="/project/:projectId/body" element={<BodyPicker />} />
      <Route path="/project/:projectId/cta" element={<CTAPicker />} />
      <Route path="/project/:projectId/final-brief" element={<FinalBrief />} />
      <Route path="/project/:projectId/brief-pack" element={<BriefPack />} />
      <Route path="/project/:projectId/export" element={<PDFExport />} />
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