/**
 * Health Check Proxy — /api/health
 *
 * Browser tidak bisa langsung hit node karena CORS.
 * Proxy ini forward ke /ext/health di blockchain node (server-to-server).
 */

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ||
  "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc";

export async function GET() {
  try {
    // Ekstrak base URL dari RPC URL
    const url = new URL(RPC_URL);
    const healthUrl = `${url.protocol}//${url.host}/ext/health`;

    const response = await fetch(healthUrl, {
      headers: { "ngrok-skip-browser-warning": "true" },
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