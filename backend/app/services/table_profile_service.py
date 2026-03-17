import json
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.table_profile import TableProfile
from app.models.datasource import DataSource
from app.services.ai_analysis_service import call_llm
from typing import Optional


async def get_or_create_table_profile(
    db: AsyncSession,
    datasource_id: int,
    table_name: str,
    schema_info: dict,
) -> TableProfile:
    """获取或创建表解读"""
    result = await db.execute(
        select(TableProfile).where(
            (TableProfile.datasource_id == datasource_id) &
            (TableProfile.table_name == table_name)
        )
    )
    profile = result.scalar_one_or_none()

    if profile:
        return profile

    # 创建新的表解读
    profile = TableProfile(
        datasource_id=datasource_id,
        table_name=table_name,
    )

    # 使用 AI 分析表结构
    try:
        analysis = await analyze_table_structure(table_name, schema_info)
        profile.table_description = analysis.get("description")
        profile.business_meaning = analysis.get("business_meaning")
        profile.field_descriptions = json.dumps(analysis.get("fields", {}), ensure_ascii=False)
        profile.related_tables = json.dumps(analysis.get("related_tables", []), ensure_ascii=False)
    except Exception as e:
        print(f"AI 分析表结构失败: {e}")
        # 即使 AI 分析失败，也创建基本的 profile
        profile.table_description = f"表 {table_name}"
        profile.field_descriptions = json.dumps({}, ensure_ascii=False)
        profile.related_tables = json.dumps([], ensure_ascii=False)

    db.add(profile)
    await db.commit()
    await db.refresh(profile)
    return profile


async def analyze_table_structure(table_name: str, schema_info: dict) -> dict:
    """使用 AI 分析表结构"""
    from app.config import settings
    
    columns = schema_info.get("columns", [])
    fields_info = "\n".join([
        f"- {col['name']} ({col['type']}): {col.get('comment', '')}"
        for col in columns
    ])

    prompt = f"""分析以下数据库表的结构，并用中文提供业务解释。

表名: {table_name}
表注释: {schema_info.get('comment', '')}
字段信息:
{fields_info}

请返回 JSON 格式的分析结果，包含以下字段：
{{
  "description": "表的简短描述（一句话）",
  "business_meaning": "表的业务含义和用途（详细说明）",
  "fields": {{
    "字段名": "字段的业务含义和取值说明"
  }},
  "related_tables": ["可能关联的表名1", "可能关联的表名2"]
}}

只返回 JSON，不要其他内容。"""

    try:
        from app.services.ai_analysis_service import call_llm
        response = await call_llm(
            prompt,
            llm_base_url=settings.LLM_BASE_URL,
            llm_api_key=settings.LLM_API_KEY,
        )
        # 尝试解析 JSON
        import re
        json_match = re.search(r'\{.*\}', response, re.DOTALL)
        if json_match:
            return json.loads(json_match.group())
    except Exception as e:
        print(f"解析 AI 响应失败: {e}")

    return {
        "description": f"表 {table_name}",
        "business_meaning": "",
        "fields": {},
        "related_tables": [],
    }


async def update_table_profile(
    db: AsyncSession,
    profile_id: int,
    user_notes: Optional[str] = None,
) -> Optional[TableProfile]:
    """更新表解读（用户标注）"""
    result = await db.execute(
        select(TableProfile).where(TableProfile.id == profile_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        return None

    if user_notes is not None:
        profile.user_notes = user_notes

    await db.commit()
    await db.refresh(profile)
    return profile


async def get_table_profile(
    db: AsyncSession,
    datasource_id: int,
    table_name: str,
) -> Optional[TableProfile]:
    """获取表解读"""
    result = await db.execute(
        select(TableProfile).where(
            (TableProfile.datasource_id == datasource_id) &
            (TableProfile.table_name == table_name)
        )
    )
    return result.scalar_one_or_none()

