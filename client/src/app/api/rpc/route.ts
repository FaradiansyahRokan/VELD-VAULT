/**
 * RPC Proxy — /api/rpc
 *
 * Browser tidak bisa langsung call blockchain node karena CORS.
 * Semua request JSON-RPC dari frontend dikirim ke /api/rpc (same-origin),
 * lalu di sini di-forward ke node (server-to-server = bebas CORS).
 *
 * URL target diambil dari NEXT_PUBLIC_RPC_URL di .env.local
 */

const TARGET_RPC = process.env.NEXT_PUBLIC_RPC_URL ||
  "http://127.0.0.1:9654/ext/bc/w4DDDiThpt7dv6A1T2UqkAUxZkC1JVceqg3QMpZ8nL4KPQcHs/rpc";

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const response = await fetch(TARGET_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
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
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: err.message }, id: null }),
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