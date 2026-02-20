"# # AI-DatabaseQuery

基于 DeepSeek 的自然语言数据库查询可视化平台（单用户本地版 MVP）

## 功能特性

- **自然语言查询**：用中文描述需求，AI 自动生成 SQL
- **多数据库支持**：MySQL、PostgreSQL、SQLite
- **可视化展示**：柱状图、折线图、饼图、散点图，自动推荐图表类型
- **AI 数据解读**：每次查询自动生成数据摘要分析
- **SQL 安全校验**：只允许 SELECT，三层防护
- **查询历史**：记录所有查询，支持收藏
- **灵活切换模型**：DeepSeek API / 内网自部署模型，修改配置即可

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + TypeScript + Vite + TailwindCSS + ECharts |
| 后端 | Python FastAPI + SQLAlchemy 2.0 (异步) |
| AI | OpenAI SDK（兼容 DeepSeek / Ollama / vLLM）|
| 系统数据库 | MySQL |

## 快速开始

### 前置条件

- Python 3.10+
- Node.js 18+
- MySQL 8.0+（用于存储系统数据，即数据源配置、查询历史等）

### 1. 配置后端

```powershell
cd backend

# 创建虚拟环境
python -m venv venv
.\venv\Scripts\Activate.ps1

# 安装依赖
pip install -r requirements.txt

# 生成加密密钥
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

编辑 `backend/.env`：

```env
SYSTEM_DB_URL=mysql+aiomysql://root:123456@localhost:3306/ai_dbquery
LLM_BASE_URL=https://api.deepseek.com
LLM_API_KEY=sk-931f58aff9d4402d8eae4ff0fca72b47
LLM_MODEL=deepseek-chat
ENCRYPTION_KEY=<上面生成的密钥>
```

在 MySQL 中创建数据库：

```sql
CREATE DATABASE ai_dbquery CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

启动后端：

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. 启动前端

```powershell
cd frontend
npm install
npm run dev
```

访问 http://localhost:5173

### 3. 使用流程

1. 进入**数据源管理**，添加你的业务数据库连接
2. 进入**系统设置**，配置 DeepSeek API Key
3. 进入**查询工作台**，选择数据源，输入自然语言问题
4. 按 `Ctrl+Enter` 提交，AI 自动生成 SQL 并展示结果

## 项目结构

```
AI-DatabaseQuery/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口
│   │   ├── config.py            # 配置管理
│   │   ├── database.py          # 数据库连接
│   │   ├── models/              # SQLAlchemy 模型
│   │   ├── schemas/             # Pydantic 模型
│   │   ├── routers/             # API 路由
│   │   ├── services/            # 业务逻辑
│   │   │   ├── llm_client.py    # LLM 接入层（统一 OpenAI 协议）
│   │   │   ├── nl2sql_service.py # NL→SQL 转换
│   │   │   ├── sql_security.py  # SQL 安全校验
│   │   │   ├── query_service.py # 查询执行引擎
│   │   │   ├── datasource_service.py # 数据源管理
│   │   │   └── ai_analysis_service.py # AI 分析引擎
│   │   └── utils/
│   │       └── encryption.py    # 密码 AES-256 加密
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/                 # API 客户端
│   │   ├── components/          # 通用组件
│   │   ├── pages/               # 页面组件
│   │   └── store/               # Zustand 状态管理
│   └── package.json
└── 需求与设计文档.md
```

## 切换内网自部署模型

在**系统设置**页面修改：
- **API Base URL**：改为内网模型地址（如 `http://192.168.1.100:11434/v1`）
- **模型名称**：改为对应模型名（如 `qwen2.5-coder:7b`）

代码无需任何改动。

## API 文档

启动后端后访问：http://localhost:8000/docs
" 
