"""FastAPI app — exposes the claim analyzer as an SSE streaming endpoint."""

import json
import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from claim_agent.agents.analyzer import stream_analyzer
from claim_agent.ingest import from_data_url

logger = logging.getLogger("claim_agent.api")

app = FastAPI(title="Claim Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)


def _sse(data: dict) -> str:
    return f"data: {json.dumps(data)}\n\n"


def _extract_content_blocks(messages: list[dict]) -> list[dict]:
    """Extract text and file content blocks from AI SDK UI messages."""
    blocks: list[dict] = []

    for msg in messages:
        if msg.get("role") != "user":
            continue

        parts = msg.get("parts", [])
        for part in parts:
            if part["type"] == "text" and part.get("text", "").strip():
                blocks.append({"text": part["text"]})

            elif part["type"] == "file":
                url = part.get("url", "")
                filename = part.get("filename", "upload")
                if url.startswith("data:"):
                    block = from_data_url(url, filename)
                    blocks.append({"text": f"--- File: {filename} ---"})
                    blocks.append(block)

    return blocks


@app.post("/api/chat")
async def chat(request: Request):
    """SSE streaming endpoint implementing AI SDK UI Message Stream Protocol."""
    body = await request.json()
    messages = body.get("messages", [])

    content_blocks = _extract_content_blocks(messages)
    if not content_blocks:
        content_blocks = [{"text": "Hello, I need help with an insurance claim."}]

    message_id = str(uuid.uuid4())
    text_part_id = str(uuid.uuid4())

    async def generate():
        yield _sse({"type": "start", "messageId": message_id})
        yield _sse({"type": "text-start", "id": text_part_id})

        try:
            async for event in stream_analyzer(content_blocks):
                if "data" in event:
                    text = event["data"]
                    if text:
                        yield _sse({
                            "type": "text-delta",
                            "id": text_part_id,
                            "delta": str(text),
                        })
        except Exception as e:
            logger.exception("Agent streaming error")
            yield _sse({
                "type": "text-delta",
                "id": text_part_id,
                "delta": f"\n\n**Error**: {e}",
            })

        yield _sse({"type": "text-end", "id": text_part_id})
        yield _sse({"type": "finish"})
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "x-vercel-ai-ui-message-stream": "v1",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
