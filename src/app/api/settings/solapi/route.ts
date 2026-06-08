import { NextResponse } from "next/server";
import { type ApiContext, withLogging } from "@/shared/lib/api/withLogging";

const handleGet = async ({ supabase, session }: ApiContext) => {
  const { data: workspace, error } = await supabase
    .from("Workspaces")
    .select("solapi_api_key, solapi_api_secret")
    .eq("id", session.workspace)
    .single();

  if (error) throw error;

  const apiKey = workspace?.solapi_api_key || null;
  const apiSecret = workspace?.solapi_api_secret || null;

  return NextResponse.json({
    data: {
      apiKey: apiKey ? `${apiKey.slice(0, 4)}${"*".repeat(Math.max(0, apiKey.length - 4))}` : null,
      apiSecret: apiSecret ? `${"*".repeat(Math.max(0, apiSecret.length - 4))}${apiSecret.slice(-4)}` : null,
      isConfigured: !!(apiKey && apiSecret),
    },
  });
};

const handlePatch = async ({ request, supabase, session }: ApiContext) => {
  const { apiKey, apiSecret } = await request.json();

  if (apiKey !== null && apiKey !== undefined && typeof apiKey !== "string") {
    return NextResponse.json({ error: "API 키는 문자열이어야 합니다." }, { status: 400 });
  }

  if (apiSecret !== null && apiSecret !== undefined && typeof apiSecret !== "string") {
    return NextResponse.json({ error: "API 시크릿은 문자열이어야 합니다." }, { status: 400 });
  }

  const updateData: Record<string, string | null> = {};

  if (apiKey !== undefined) {
    updateData.solapi_api_key = apiKey?.trim() || null;
  }

  if (apiSecret !== undefined) {
    updateData.solapi_api_secret = apiSecret?.trim() || null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "변경할 내용이 없습니다." }, { status: 400 });
  }

  const { error } = await supabase.from("Workspaces").update(updateData).eq("id", session.workspace);

  if (error) throw error;

  return NextResponse.json({
    data: {
      apiKey: updateData.solapi_api_key
        ? `${updateData.solapi_api_key.slice(0, 4)}${"*".repeat(Math.max(0, updateData.solapi_api_key.length - 4))}`
        : null,
      apiSecret: updateData.solapi_api_secret
        ? `${"*".repeat(Math.max(0, updateData.solapi_api_secret.length - 4))}${updateData.solapi_api_secret.slice(-4)}`
        : null,
      isConfigured: !!(updateData.solapi_api_key && updateData.solapi_api_secret),
    },
  });
};

export const GET = withLogging(handleGet, {
  resource: "solapi-settings",
  action: "read",
  allowedRoles: ["owner", "admin"],
});

export const PATCH = withLogging(handlePatch, {
  resource: "solapi-settings",
  action: "update",
  allowedRoles: ["owner"],
});
