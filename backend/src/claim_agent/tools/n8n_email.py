"""Tool for retrieving recent emails via n8n workflow."""

from datetime import datetime, timezone

import httpx
from strands import tool

from claim_agent.config import N8N_EMAIL_WEBHOOK_URL

_TIMEOUT = 30.0


def _format_email(email: dict) -> str:
    """Format a single email dict into a readable string."""
    subject = email.get("Subject", "(no subject)")
    sender = email.get("From", "unknown")
    to = email.get("To", "unknown")
    snippet = email.get("snippet", "")
    internal_date_ms = email.get("internalDate")

    date_str = ""
    if internal_date_ms:
        dt = datetime.fromtimestamp(int(internal_date_ms) / 1000, tz=timezone.utc)
        date_str = dt.strftime("%Y-%m-%d %H:%M UTC")

    labels = [lbl.get("name", "") for lbl in email.get("labels", [])]
    label_str = ", ".join(labels) if labels else ""

    lines = [
        f"Subject: {subject}",
        f"From: {sender}",
        f"To: {to}",
    ]
    if date_str:
        lines.append(f"Date: {date_str}")
    if label_str:
        lines.append(f"Labels: {label_str}")
    if snippet:
        lines.append(f"Preview: {snippet}")

    return "\n".join(lines)


@tool
def fetch_recent_emails() -> str:
    """Fetch recent emails that may be relevant to insurance claims.

    Triggers an n8n workflow that retrieves recent emails from Gmail and
    filters them for claim-related content (credit card statements, repair
    appointments, insurance correspondence, etc.).

    Use this tool when:
    - The user asks you to check their email for claim-related documents
    - You need to find correspondence with insurers or service providers
    - You want to look for receipts, statements, or repair confirmations
    """
    try:
        resp = httpx.get(
            N8N_EMAIL_WEBHOOK_URL,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError as exc:
        return f"Email retrieval error: {exc}"

    if not data:
        return "No relevant emails found."

    if isinstance(data, dict):
        data = [data]

    formatted = [_format_email(email) for email in data]
    header = f"Found {len(formatted)} relevant email(s):\n"
    return header + "\n---\n".join(formatted)
