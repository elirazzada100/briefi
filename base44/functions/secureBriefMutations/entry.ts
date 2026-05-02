import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";
import { runSecureBriefMutation, toErrorResponse } from "./secureBriefMutations.js";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await runSecureBriefMutation(base44, user.id, body);
    return Response.json(result);
  } catch (error) {
    const knownErrorResponse = toErrorResponse(error);
    if (knownErrorResponse) {
      return knownErrorResponse;
    }

    console.error("secureBriefMutations failed:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
});
