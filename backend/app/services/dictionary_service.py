import json
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.dictionary_task import DictionaryTask
from app.models.datasource import DataSource
from app.models.query_history import QueryHistory
from app.services import datasource_service, table_profile_service
from typing import Optional


async def create_dictionary_task(
    db: AsyncSession,
    datasource_id: int,
    task_name: str,
    format: str = "markdown",
    include_examples: bool = True,
    include_relations: bool = True,
) -> DictionaryTask:
    """创建数据字典生成任务"""
    task = DictionaryTask(
        datasource_id=datasource_id,
        task_name=task_name,
        format=format,
        include_examples=1 if include_examples else 0,
        include_relations=1 if include_relations else 0,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def get_task(db: AsyncSession, task_id: int) -> Optional[DictionaryTask]:
    """获取任务"""
    result = await db.execute(
        select(DictionaryTask).where(DictionaryTask.id == task_id)
    )
    return result.scalar_one_or_none()


async def update_task_status(
    db: AsyncSession,
    task_id: int,
    status: str,
    file_path: Optional[str] = None,
    error_message: Optional[str] = None,
) -> Optional[DictionaryTask]:
    """更新任务状态"""
    task = await get_task(db, task_id)
    if not task:
        return None

    task.status = status
    if file_path:
        task.file_path = file_path
    if error_message:
        task.error_message = error_message
    if status == "completed":
        task.completed_at = datetime.now()

    await db.commit()
    await db.refresh(task)
    return task


async def generate_markdown_dictionary(
    db: AsyncSession,
    datasource: DataSource,
    include_examples: bool = True,
    include_relations: bool = True,
) -> str:
    """生成 Markdown 格式的数据字典"""
    schema = await datasource_service.get_schema(datasource)

    md = f"# {datasource.name} 数据字典\n\n"
    md += f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    md += f"**数据库类型**: {datasource.db_type}\n\n"
    
    # schema 是字典，需要转换为列表
    if isinstance(schema, dict):
        tables = [{"name": name, "info": info} for name, info in schema.items()]
    else:
        tables = schema
    
    md += f"**表数量**: {len(tables)}\n\n"

    md += "## 目录\n\n"
    for table in tables:
        table_name = table.get('name') or list(table.keys())[0] if isinstance(table, dict) else table['name']
        md += f"- [{table_name}](#{table_name})\n"

    md += "\n---\n\n"

    # 生成每个表的详细信息
    for table in tables:
        if isinstance(table, dict) and 'name' in table:
            table_name = table['name']
            table_info = table.get('info', {})
        else:
            # schema 是字典格式
            table_name = table if isinstance(table, str) else list(table.keys())[0]
            table_info = schema.get(table_name, {})
        
        md += f"## {table_name}\n\n"

        # 获取表的 AI 解读
        profile = await table_profile_service.get_table_profile(db, datasource.id, table_name)
        if profile:
            if profile.table_description:
                md += f"**描述**: {profile.table_description}\n\n"
            if profile.business_meaning:
                md += f"**业务含义**: {profile.business_meaning}\n\n"

        # 字段列表
        md += "### 字段\n\n"
        md += "| 字段名 | 类型 | 可空 | 说明 |\n"
        md += "|--------|------|------|------|\n"

        field_descriptions = {}
        if profile and profile.field_descriptions:
            try:
                field_descriptions = json.loads(profile.field_descriptions)
            except:
                pass

        # 获取字段信息
        columns = table_info.get('columns', []) if isinstance(table_info, dict) else []
        for col in columns:
            col_name = col.get('name', '')
            col_type = col.get('type', '')
            nullable = "是" if col.get('nullable', True) else "否"
            desc = field_descriptions.get(col_name, col.get('comment', ''))
            md += f"| {col_name} | {col_type} | {nullable} | {desc} |\n"

        md += "\n"

        # 相关表
        if profile and profile.related_tables:
            try:
                related = json.loads(profile.related_tables)
                if related:
                    md += f"**相关表**: {', '.join(related)}\n\n"
            except:
                pass

        # 用户备注
        if profile and profile.user_notes:
            md += f"**备注**: {profile.user_notes}\n\n"

        md += "---\n\n"

    # 常用查询示例
    if include_examples:
        md += "## 常用查询示例\n\n"
        result = await db.execute(
            select(QueryHistory)
            .where(QueryHistory.datasource_id == datasource.id)
            .where(QueryHistory.status == "success")
            .order_by(QueryHistory.created_at.desc())
            .limit(10)
        )
        histories = result.scalars().all()

        if histories:
            for hist in histories:
                md += f"### {hist.natural_language}\n\n"
                if hist.generated_sql:
                    md += f"```sql\n{hist.generated_sql}\n```\n\n"
                if hist.ai_summary:
                    md += f"**结果说明**: {hist.ai_summary}\n\n"
        else:
            md += "暂无查询示例\n\n"

    return md


async def generate_html_dictionary(
    db: AsyncSession,
    datasource: DataSource,
    include_examples: bool = True,
    include_relations: bool = True,
) -> str:
    """生成 HTML 格式的数据字典"""
    markdown_content = await generate_markdown_dictionary(
        db, datasource, include_examples, include_relations
    )

    # 简单的 Markdown 转 HTML（实际项目可用 markdown 库）
    html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>{datasource.name} 数据字典</title>
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #1f2937; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }}
        h2 {{ color: #374151; margin-top: 30px; }}
        h3 {{ color: #6b7280; }}
        table {{ border-collapse: collapse; width: 100%; margin: 15px 0; }}
        th, td {{ border: 1px solid #d1d5db; padding: 12px; text-align: left; }}
        th {{ background-color: #f3f4f6; font-weight: 600; }}
        tr:nth-child(even) {{ background-color: #f9fafb; }}
        code {{ background-color: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: 'Monaco', 'Courier New', monospace; }}
        pre {{ background-color: #1f2937; color: #10b981; padding: 15px; border-radius: 5px; overflow-x: auto; }}
        .meta {{ color: #6b7280; font-size: 14px; margin: 10px 0; }}
    </style>
</head>
<body>
    <h1>{datasource.name} 数据字典</h1>
    <div class="meta">
        <p>生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        <p>数据库类型: {datasource.db_type}</p>
    </div>
    <pre>{markdown_content}</pre>
</body>
</html>"""
    return html

