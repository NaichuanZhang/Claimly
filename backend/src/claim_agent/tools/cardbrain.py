"""Tools for querying the CardBrain credit card benefits API."""

import httpx
from strands import tool

from claim_agent.config import CARDBRAIN_BASE_URL

_TIMEOUT = 30.0


@tool
def ask_cardbrain(question: str, card: str = "") -> str:
    """Ask a question about credit card benefits and protections.

    Use this tool to look up what benefits, protections, or coverages
    a credit card provides — for example purchase protection, cell phone
    insurance, travel insurance, rental car coverage, and more.

    Args:
        question: The question about credit card benefits to look up.
        card: Optional specific card name to filter by (e.g. "Chase Sapphire Reserve").
    """
    payload: dict[str, str] = {"question": question}
    if card:
        payload["card"] = card

    try:
        resp = httpx.post(
            f"{CARDBRAIN_BASE_URL}/api/ask",
            json=payload,
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError as exc:
        return f"CardBrain API error: {exc}"

    answer = data.get("answer", "No answer returned.")
    sources = data.get("sources", [])
    if sources:
        citations = "\n".join(
            f"- {s['card_name']} (p.{s.get('page', '?')}, similarity {s.get('similarity', '?')})"
            for s in sources
        )
        return f"{answer}\n\nSources:\n{citations}"
    return answer


@tool
def list_cards() -> str:
    """List all credit cards available in the CardBrain knowledge base.

    Use this tool to find out which credit cards can be queried for
    benefits information. Call this before ask_cardbrain if the user
    wants to know which cards are supported.
    """
    try:
        resp = httpx.get(
            f"{CARDBRAIN_BASE_URL}/api/cards",
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
    except httpx.HTTPError as exc:
        return f"CardBrain API error: {exc}"

    cards = data.get("cards", [])
    if not cards:
        return "No cards found."
    return "Available cards:\n" + "\n".join(f"- {c}" for c in cards)
