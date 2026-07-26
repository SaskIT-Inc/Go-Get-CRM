"""
LLM adapter over the GroqCloud API (OpenAI-compatible), replacing Base44's
Core.InvokeLLM. Used by the public marketing-site chatbot (routers/public.py)
and the AI-assist functions in routers/functions.py (filing-delay
recommendations, task suggestions, filing summaries).
"""

import json

from openai import AsyncOpenAI

from ..config import settings

_client: AsyncOpenAI | None = None


def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=settings.groq_api_key, base_url=settings.groq_base_url)
    return _client


async def invoke_chat(messages: list[dict], *, json_mode: bool = False) -> str:
    """Multi-turn variant: caller supplies the full messages list (system
    prompt + conversation history + latest user turn). json_mode requests the
    model constrain its output to a single JSON object (still returned as a
    plain string here — parse it at the call site)."""
    if not settings.groq_api_key:
        raise RuntimeError("GROQ_API_KEY is not configured")

    response = await _get_client().chat.completions.create(
        model=settings.groq_model,
        messages=messages,
        response_format={"type": "json_object"} if json_mode else None,
    )
    return response.choices[0].message.content or ""


async def invoke_llm(prompt: str, system: str | None = None) -> str:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    return await invoke_chat(messages)


async def invoke_llm_json(prompt: str, system: str) -> dict:
    """Ask the model for a single JSON object matching the shape described in
    `system`, and parse it. Raises ValueError with the raw text on a
    malformed response so callers can decide how to degrade."""
    raw = await invoke_chat(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True,
    )
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Model did not return valid JSON: {raw[:200]}") from exc
