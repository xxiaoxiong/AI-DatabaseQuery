import re
import sqlparse
from sqlparse.sql import Statement
from sqlparse.tokens import Keyword, DDL, DML


ALLOWED_STATEMENTS = {"SELECT"}

FORBIDDEN_FUNCTIONS = {
    "sleep", "benchmark", "load_file", "outfile", "dumpfile",
    "sys_exec", "sys_eval", "pg_sleep", "pg_read_file",
}

FORBIDDEN_KEYWORDS = {
    "INSERT", "UPDATE", "DELETE", "DROP", "CREATE", "ALTER",
    "TRUNCATE", "REPLACE", "MERGE", "EXEC", "EXECUTE",
    "GRANT", "REVOKE", "CALL", "PROCEDURE",
}


def validate_sql(sql: str) -> dict:
    if not sql or not sql.strip():
        return {"valid": False, "reason": "SQL 为空"}

    sql_clean = sql.strip().rstrip(";")

    parsed = sqlparse.parse(sql_clean)
    if not parsed:
        return {"valid": False, "reason": "无法解析 SQL"}

    stmt = parsed[0]

    stmt_type = stmt.get_type()
    if stmt_type != "SELECT":
        return {"valid": False, "reason": f"只允许 SELECT 语句，检测到: {stmt_type or '未知'}"}

    sql_upper = sql_clean.upper()

    for kw in FORBIDDEN_KEYWORDS:
        pattern = r'\b' + kw + r'\b'
        if re.search(pattern, sql_upper):
            return {"valid": False, "reason": f"包含禁止关键字: {kw}"}

    sql_lower = sql_clean.lower()
    for func in FORBIDDEN_FUNCTIONS:
        pattern = r'\b' + func + r'\s*\('
        if re.search(pattern, sql_lower):
            return {"valid": False, "reason": f"包含禁止函数: {func}()"}

    if "--" in sql_clean or "/*" in sql_clean:
        pass

    return {"valid": True, "reason": None}


def format_sql(sql: str) -> str:
    return sqlparse.format(
        sql,
        reindent=True,
        keyword_case="upper",
        identifier_case="lower",
        strip_comments=False,
    )
