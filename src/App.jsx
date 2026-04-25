import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import NewProject from '@/pages/NewProject';
import Projects from '@/pages/Projects';
import CreativeDNA from '@/pages/CreativeDNA';
import CategoryPicker from '@/pages/CategoryPicker';
import HookPicker from '@/pages/HookPicker';
import BodyPicker from '@/pages/BodyPicker';
import CTAPicker from '@/pages/CTAPicker';
import FinalBrief from '@/pages/FinalBrief';
import BriefPack from '@/pages/BriefPack';
import PDFExport from '@/pages/PDFExport';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
          <span className="text-sm text-muted-foreground font-heebo">טוען...</span>
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
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/new-project" element={<NewProject />} />
        <Route path="/project/:projectId/creative-dna" element={<CreativeDNA />} />
        <Route path="/project/:projectId/category" element={<CategoryPicker />} />
        <Route path="/project/:projectId/brief/:briefId/hooks" element={<HookPicker />} />
        <Route path="/project/:projectId/brief/:briefId/body" element={<BodyPicker />} />
        <Route path="/project/:projectId/brief/:briefId/cta" element={<CTAPicker />} />
        <Route path="/project/:projectId/brief/:briefId/final" element={<FinalBrief />} />
        <Route path="/project/:projectId/briefs" element={<BriefPack />} />
        <Route path="/project/:projectId/export" element={<PDFExport />} />
      </Route>
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