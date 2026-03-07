/**
 * Health Check Proxy — /api/health
 *
 * URL node diambil dari KV (paling fresh) → env var → localhost.
 */

import { getActiveRpcUrl } from "@/lib/tunnel-url";

export async function GET() {
  try {
    const rpcUrl    = await getActiveRpcUrl();
    const url       = new URL(rpcUrl);
    const healthUrl = `${url.protocol}//${url.host}/ext/health`;

    const response = await fetch(healthUrl, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        "cf-skip-browser-warning": "true",
      },
      signal: AbortSignal.timeout(3000),
    });

    const data = await response.json();

    return Response.json(data, {
      headers: { "Access-Control-Allow-Origin": "*" },
    });
  } catch (err: any) {
    return Response.json(
      { healthy: false, error: err.message },
      { status: 502, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
}