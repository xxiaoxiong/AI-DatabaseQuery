from typing import Optional
from app.services.llm_client import chat_completion_json
from app.config import settings
import logging

logger = logging.getLogger(__name__)

NL2SQL_SYSTEM_PROMPT = """你是专业数据库查询助手，只生成 SELECT 语句，返回 JSON 格式。
数据库方言：{dialect}
Schema：
{schema_context}
历史对话：
{conversation_history}

输出格式（严格 JSON，不要有任何额外文字）：
{{
  "sql": "SELECT ...",
  "explanation": "查询含义说明",
  "clarification": null,
  "chart_suggestion": "bar",
  "confidence": 0.95
}}

chart_suggestion 可选值：bar, line, pie, scatter, heatmap, table
如果问题模糊无法生成 SQL，请在 clarification 中填写追问内容，sql 填 null。
"""


def _build_schema_context(schema: dict, max_tables: int = 30) -> str:
    lines = []
    for table_name, info in list(schema.items())[:max_tables]:
        comment = info.get("comment", "")
        header = f"表 {table_name}" + (f"（{comment}）" if comment else "")
        lines.append(header)
        for col in info.get("columns", []):
            col_comment = f" -- {col['comment']}" if col.get("comment") else ""
            lines.append(f"  - {col['name']} {col['type']}{col_comment}")
    return "\n".join(lines)


def _build_history_context(history: list[dict]) -> str:
    if not history:
        return "无"
    lines = []
    for item in history[-5:]:
        lines.append(f"用户: {item.get('nl', '')}")
        if item.get("sql"):
            lines.append(f"SQL: {item.get('sql', '')}")
    return "\n".join(lines)


async def nl2sql(
    question: str,
    schema: dict,
    dialect: str = "mysql",
    conversation_history: Optional[list[dict]] = None,
    llm_base_url: Optional[str] = None,
    llm_api_key: Optional[str] = None,
) -> dict:
    schema_context = _build_schema_context(schema)
    history_context = _build_history_context(conversation_history or [])

    system_prompt = NL2SQL_SYSTEM_PROMPT.format(
        dialect=dialect,
        schema_context=schema_context,
        conversation_history=history_context,
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]

    result = await chat_completion_json(
        messages=messages,
        temperature=0.1,
        base_url=llm_base_url,
        api_key=llm_api_key,
    )

    return {
        "sql": result.get("sql"),
        "explanation": result.get("explanation", ""),
        "clarification": result.get("clarification"),
        "chart_suggestion": result.get("chart_suggestion", "table"),
        "confidence": result.get("confidence", 0.0),
    }
