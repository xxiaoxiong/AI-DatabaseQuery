# 密码存储模块（明文存储，不加密）

def encrypt_password(plain: str) -> str:
    """直接返回明文密码"""
    return plain if plain else ""


def decrypt_password(token: str) -> str:
    """直接返回明文密码"""
    return token if token else ""
