/**
 * RPC Proxy — /api/rpc
 *
 * Browser tidak bisa langsung call blockchain node karena CORS.
 * Semua request JSON-RPC dari frontend dikirim ke /api/rpc (same-origin),
 * lalu di sini di-forward ke node (server-to-server = bebas CORS).
 *
 * URL target diambil dari KV (paling fresh) → env var → localhost.
 * Update URL: POST /api/update-tunnel (tanpa redeploy Vercel).
 */

import { getActiveRpcUrl } from "@/lib/tunnel-url";

export async function POST(request: Request) {
  const TARGET_RPC = await getActiveRpcUrl(); // ← baca dari KV, selalu fresh

  try {
    const body = await request.text();

    const response = await fetch(TARGET_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
        "cf-skip-browser-warning": "true",
      },
      body,
    });

    const data = await response.text();

    return new Response(data, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err: any) {
    console.error("[RPC Proxy] Error →", TARGET_RPC, err.message);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32603, message: `RPC proxy error: ${err.message}` },
        id: null,
      }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}