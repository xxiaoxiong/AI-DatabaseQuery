from openai import AsyncOpenAI
from app.config import settings
from typing import Optional
import json
import logging

logger = logging.getLogger(__name__)


def get_llm_client(base_url: Optional[str] = None, api_key: Optional[str] = None) -> AsyncOpenAI:
    return AsyncOpenAI(
        base_url=base_url or settings.LLM_BASE_URL,
        api_key=api_key or settings.LLM_API_KEY,
        timeout=settings.LLM_TIMEOUT,
    )


async def chat_completion(
    messages: list[dict],
    model: Optional[str] = None,
    temperature: float = 0.1,
    response_format: Optional[dict] = None,
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> str:
    client = get_llm_client(base_url, api_key)
    kwargs = dict(
        model=model or settings.LLM_MODEL,
        messages=messages,
        temperature=temperature,
    )
    if response_format:
        kwargs["response_format"] = response_format

    response = await client.chat.completions.create(**kwargs)
    return response.choices[0].message.content


async def chat_completion_json(
    messages: list[dict],
    model: Optional[str] = None,
    temperature: float = 0.1,
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
) -> dict:
    content = await chat_completion(
        messages=messages,
        model=model,
        temperature=temperature,
        response_format={"type": "json_object"},
        base_url=base_url,
        api_key=api_key,
    )
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        import re
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise ValueError(f"LLM did not return valid JSON: {content}")
