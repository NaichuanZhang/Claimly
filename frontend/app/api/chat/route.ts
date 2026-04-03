const BACKEND_URL =
  process.env.BACKEND_URL ?? "http://localhost:8000";

export async function POST(req: Request) {
  const body = await req.json();

  const response = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: "Backend error", status: response.status }),
      { status: response.status, headers: { "Content-Type": "application/json" } }
    );
  }

  // Pass through the SSE stream from the Python backend
  return new Response(response.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}
