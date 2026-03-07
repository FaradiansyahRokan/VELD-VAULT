/**
 * IPFS Proxy — /api/ipfs/[...path]
 *
 * Browser tidak bisa langsung call IPFS Kubo (port 5001) karena CORS.
 * Semua request dari kubo-rpc-client dikirim ke /api/ipfs/... (same-origin),
 * lalu di sini di-forward ke node IPFS (server-to-server = bebas CORS).
 *
 * URL target diambil dari NEXT_PUBLIC_IPFS_URL di .env.local
 */

const IPFS_NODE = process.env.NEXT_PUBLIC_IPFS_URL || "http://127.0.0.1:5001";

// Vercel Serverless Function limit override
export const maxDuration = 60; // 60 seconds (max for Hobby)

export const dynamic = "force-dynamic";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyToIpfs(request, await params, "POST");
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ path: string[] }> }
) {
    return proxyToIpfs(request, await params, "GET");
}

export async function OPTIONS() {
    return new Response(null, {
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, X-Stream-Output, X-Chunked-Output, X-Stream-Error",
        },
    });
}

async function proxyToIpfs(
    request: Request,
    params: { path: string[] },
    method: string
) {
    try {
        const pathSegments = params.path ?? [];
        const requestUrl = new URL(request.url);

        const targetPath = "/api/v0/" + pathSegments.join("/");
        const targetUrl = `${IPFS_NODE}${targetPath}${requestUrl.search}`;

        const body = method === "POST" ? await request.arrayBuffer() : undefined;

        const headers: Record<string, string> = {
            "ngrok-skip-browser-warning": "true",
        };
        const contentType = request.headers.get("content-type");
        if (contentType) headers["content-type"] = contentType;

        const response = await fetch(targetUrl, { method, headers, body });

        const responseHeaders = new Headers();
        responseHeaders.set("Access-Control-Allow-Origin", "*");

        const forwardHeaders = [
            "content-type",
            "x-stream-output",
            "x-chunked-output",
            "trailer",
            "transfer-encoding",
        ];
        for (const h of forwardHeaders) {
            const v = response.headers.get(h);
            if (v) responseHeaders.set(h, v);
        }

        return new Response(response.body, {
            status: response.status,
            headers: responseHeaders,
        });
    } catch (err: any) {
        return new Response(
            JSON.stringify({ error: err.message }),
            { status: 502, headers: { "Content-Type": "application/json" } }
        );
    }
}