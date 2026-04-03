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
logging.getLogger("opentelemetry").setLevel(logging.ERROR)

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

    async def generate():
        yield _sse({"type": "start", "messageId": message_id})

        text_part_id: str | None = None
        text_part_open = False
        active_tool_id: str | None = None
        active_tool_input: dict = {}

        def _open_text():
            nonlocal text_part_id, text_part_open
            text_part_id = str(uuid.uuid4())
            text_part_open = True
            return _sse({"type": "text-start", "id": text_part_id})

        def _close_text():
            nonlocal text_part_open
            text_part_open = False
            return _sse({"type": "text-end", "id": text_part_id})

        try:
            async for event in stream_analyzer(content_blocks):
                if not isinstance(event, dict):
                    continue

                # --- tool use events ---
                if "current_tool_use" in event:
                    tool_use = event["current_tool_use"]
                    tool_id = tool_use.get("toolUseId")
                    tool_name = tool_use.get("name")

                    if tool_name and tool_id and tool_id != active_tool_id:
                        # close open text part before tool card
                        if text_part_open:
                            yield _close_text()

                        # finalize previous tool if still open
                        if active_tool_id:
                            yield _sse({"type": "tool-output-available", "toolCallId": active_tool_id, "output": "Done"})

                        active_tool_id = tool_id
                        active_tool_input = tool_use.get("input") or {}
                        yield _sse({"type": "tool-input-start", "toolCallId": tool_id, "toolName": tool_name})
                        yield _sse({
                            "type": "tool-input-delta",
                            "toolCallId": tool_id,
                            "inputTextDelta": json.dumps(active_tool_input),
                        })

                    elif tool_id == active_tool_id and isinstance(tool_use.get("input"), dict):
                        active_tool_input = {**active_tool_input, **tool_use["input"]}

                # --- text delta events ---
                elif "data" in event:
                    text = event["data"]
                    if not text:
                        continue

                    # finalize tool call before resuming text
                    if active_tool_id:
                        yield _sse({"type": "tool-output-available", "toolCallId": active_tool_id, "output": "Done"})
                        active_tool_id = None

                    if not text_part_open:
                        yield _open_text()

                    yield _sse({"type": "text-delta", "id": text_part_id, "delta": str(text)})

        except Exception as e:
            logger.exception("Agent streaming error")
            if not text_part_open:
                yield _open_text()
            yield _sse({"type": "text-delta", "id": text_part_id, "delta": f"\n\n**Error**: {e}"})

        # clean up open parts
        if active_tool_id:
            yield _sse({"type": "tool-output-available", "toolCallId": active_tool_id, "output": "Done"})
        if text_part_open:
            yield _close_text()

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
