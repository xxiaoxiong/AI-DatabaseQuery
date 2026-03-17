from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc
from app.models.query_favorite import QueryFavorite
from typing import Optional


async def create_favorite(
    db: AsyncSession,
    datasource_id: int,
    natural_language: str,
    generated_sql: Optional[str] = None,
    tags: Optional[str] = None,
    description: Optional[str] = None,
) -> QueryFavorite:
    """创建收藏"""
    favorite = QueryFavorite(
        datasource_id=datasource_id,
        natural_language=natural_language,
        generated_sql=generated_sql,
        tags=tags,
        description=description,
    )
    db.add(favorite)
    await db.commit()
    await db.refresh(favorite)
    return favorite


async def get_favorite(db: AsyncSession, favorite_id: int) -> Optional[QueryFavorite]:
    """获取单个收藏"""
    result = await db.execute(
        select(QueryFavorite).where(QueryFavorite.id == favorite_id)
    )
    return result.scalar_one_or_none()


async def update_favorite(
    db: AsyncSession,
    favorite_id: int,
    tags: Optional[str] = None,
    description: Optional[str] = None,
    natural_language: Optional[str] = None,
    generated_sql: Optional[str] = None,
) -> Optional[QueryFavorite]:
    """更新收藏"""
    favorite = await get_favorite(db, favorite_id)
    if not favorite:
        return None
    if tags is not None:
        favorite.tags = tags
    if description is not None:
        favorite.description = description
    if natural_language is not None:
        favorite.natural_language = natural_language
    if generated_sql is not None:
        favorite.generated_sql = generated_sql
    await db.commit()
    await db.refresh(favorite)
    return favorite


async def delete_favorite(db: AsyncSession, favorite_id: int) -> bool:
    """删除收藏"""
    favorite = await get_favorite(db, favorite_id)
    if not favorite:
        return False
    await db.delete(favorite)
    await db.commit()
    return True


async def search_favorites(
    db: AsyncSession,
    keyword: Optional[str] = None,
    tags: Optional[list[str]] = None,
    datasource_id: Optional[int] = None,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[QueryFavorite], int]:
    """搜索收藏"""
    query = select(QueryFavorite)
    conditions = []

    if keyword:
        conditions.append(
            or_(
                QueryFavorite.natural_language.ilike(f"%{keyword}%"),
                QueryFavorite.description.ilike(f"%{keyword}%"),
            )
        )

    if datasource_id:
        conditions.append(QueryFavorite.datasource_id == datasource_id)

    if tags:
        # 任意标签匹配
        tag_conditions = []
        for tag in tags:
            tag_conditions.append(QueryFavorite.tags.ilike(f"%{tag}%"))
        if tag_conditions:
            conditions.append(or_(*tag_conditions))

    if conditions:
        query = query.where(and_(*conditions))

    # 获取总数
    count_result = await db.execute(select(QueryFavorite).where(and_(*conditions) if conditions else True))
    total = len(count_result.scalars().all())

    # 获取分页结果
    result = await db.execute(
        query.order_by(desc(QueryFavorite.last_executed_at), desc(QueryFavorite.created_at))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all(), total


async def increment_execute_count(
    db: AsyncSession,
    favorite_id: int,
) -> Optional[QueryFavorite]:
    """增加执行次数"""
    from datetime import datetime
    favorite = await get_favorite(db, favorite_id)
    if not favorite:
        return None
    favorite.execute_count += 1
    favorite.last_executed_at = datetime.now()
    await db.commit()
    await db.refresh(favorite)
    return favorite

