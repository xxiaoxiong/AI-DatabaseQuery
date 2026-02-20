from typing import Optional
from app.services.llm_client import chat_completion
import json
import logging

logger = logging.getLogger(__name__)

ANALYSIS_SYSTEM_PROMPT = """你是专业数据分析师，请对以下查询结果进行简洁的数据解读。
要求：
1. 用中文回答，简洁清晰（200字以内）
2. 指出关键数字、趋势或异常
3. 给出1-2条业务洞察
"""


async def analyze_data(
    question: str,
    sql: str,
    columns: list[str],
    rows: list[dict],
    llm_base_url: Optional[str] = None,
    llm_api_key: Optional[str] = None,
) -> str:
    if not rows:
        return "查询结果为空，无数据可分析。"

    sample_rows = rows[:20]
    data_preview = json.dumps(sample_rows, ensure_ascii=False, default=str)

    user_content = f"""用户问题：{question}
执行的SQL：{sql}
查询结果（共 {len(rows)} 行，展示前 {len(sample_rows)} 行）：
{data_preview}

请对以上数据进行解读分析。"""

    messages = [
        {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]

    try:
        result = await chat_completion(
            messages=messages,
            temperature=0.3,
            base_url=llm_base_url,
            api_key=llm_api_key,
        )
        return result
    except Exception as e:
        logger.error(f"AI analysis failed: {e}")
        return f"AI 分析暂时不可用：{str(e)}"


def recommend_chart_type(columns: list[str], rows: list[dict]) -> str:
    if not rows or not columns:
        return "table"

    row_count = len(rows)
    col_count = len(columns)

    if col_count < 2:
        return "table"

    numeric_cols = []
    time_cols = []
    text_cols = []

    for col in columns:
        col_lower = col.lower()
        if any(kw in col_lower for kw in ["date", "time", "year", "month", "day", "日期", "时间", "年", "月"]):
            time_cols.append(col)
        elif rows:
            sample_val = rows[0].get(col)
            if isinstance(sample_val, (int, float)):
                numeric_cols.append(col)
            else:
                text_cols.append(col)

    if time_cols and len(numeric_cols) >= 1:
        if len(numeric_cols) >= 2:
            return "line"
        return "line"

    if len(text_cols) == 1 and len(numeric_cols) == 1:
        if row_count <= 10:
            return "pie"
        return "bar"

    if len(numeric_cols) == 2 and len(text_cols) == 0:
        return "scatter"

    if len(text_cols) == 2 and len(numeric_cols) == 1:
        return "heatmap"

    if len(numeric_cols) >= 1 and len(text_cols) >= 1:
        return "bar"

    return "table"
