import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";

/**
 * Reusable hook: loads a project and verifies the current user owns it.
 * Redirects to /dashboard if access is denied.
 * Returns { project, user, loading, accessDenied }
 */
export function useProjectGuard(projectId) {
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    const check = async () => {
      try {
        const me = await base44.auth.me();
        if (!me) {
          base44.auth.redirectToLogin();
          return;
        }
        setUser(me);
        const projects = await base44.entities.Project.filter({ id: projectId, owner_id: me.id });
        const p = projects[0];
        if (!p || !p.owner_id) {
          setAccessDenied(true);
          navigate("/dashboard");
          return;
        }
        setProject(p);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [projectId, navigate]);

  return { project, user, loading, accessDenied };
}
