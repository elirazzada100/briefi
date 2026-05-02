import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

const DEPRECATED_RESPONSE = {
  error: "LEGACY_OPENAI_FLOW_DEPRECATED",
  message: "המסלול הישן הזה יצא משימוש. חזרו לעמוד הלקוח והמשיכו מהפלואו החדש.",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    return Response.json(DEPRECATED_RESPONSE, { status: 410 });
  } catch (_error) {
    return Response.json(DEPRECATED_RESPONSE, { status: 410 });
  }
});
