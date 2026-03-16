/*
 Navicat Premium Dump SQL

 Source Server         : localhost-3306
 Source Server Type    : MySQL
 Source Server Version : 80031 (8.0.31)
 Source Host           : localhost:3306
 Source Schema         : ai_dbquery

 Target Server Type    : MySQL
 Target Server Version : 80031 (8.0.31)
 File Encoding         : 65001

 Date: 16/03/2026 20:53:54
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for datasources
-- ----------------------------
DROP TABLE IF EXISTS `datasources`;
CREATE TABLE `datasources`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `db_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `host` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `port` int NULL DEFAULT NULL,
  `username` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `password_encrypted` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `database_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `is_active` tinyint(1) NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ix_datasources_id`(`id` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of datasources
-- ----------------------------
INSERT INTO `datasources` VALUES (1, 'test1', 'mysql', 'localhost', 3306, 'root', 'gAAAAABpmGC8K9gME3o8GXUXe3spN7qp0Ls2qdRc07FRtHNM40ZrkVxVSOTryL5lgJaOweXEnjDQ3n_B6j11hJpLvIbYpwV0hg==', 'ai_dbquery', '', 1, '2026-02-20 21:17:53', '2026-02-20 21:41:20');
INSERT INTO `datasources` VALUES (2, 'test2', 'mysql', 'localhost', 3306, 'root', 'gAAAAABpmGSlMFHWxbbjAFBFDb0MRmEJIjtfpfIQBUiw1FpKqnoPS2nfkOIfxziyUOBMbfEdO1tww6TRDxG-o59ta4qypxE2qw==', 'ai_chat', '', 1, '2026-02-20 21:41:57', NULL);

-- ----------------------------
-- Table structure for query_history
-- ----------------------------
DROP TABLE IF EXISTS `query_history`;
CREATE TABLE `query_history`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `datasource_id` int NULL DEFAULT NULL,
  `natural_language` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `generated_sql` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `executed_sql` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `row_count` int NULL DEFAULT NULL,
  `execution_time_ms` int NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `error_message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `ai_summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `chart_type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL DEFAULT NULL,
  `is_favorite` int NULL DEFAULT NULL,
  `created_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `datasource_id`(`datasource_id` ASC) USING BTREE,
  INDEX `ix_query_history_id`(`id` ASC) USING BTREE,
  CONSTRAINT `query_history_ibfk_1` FOREIGN KEY (`datasource_id`) REFERENCES `datasources` (`id`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 14 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of query_history
-- ----------------------------
INSERT INTO `query_history` VALUES (1, 1, '数据源表的属性', 'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = \'datasources\' ORDER BY ORDINAL_POSITION', 'SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = \'datasources\' ORDER BY ORDINAL_POSITION', 12, 9, 'success', NULL, '该表为数据源配置表，共12个字段。关键字段包括：必填项`id`、`name`、`db_type`、`database_name`；安全字段`password_encrypted`为加密文本；状态字段`is_active`用于控制可用性；时间戳`created_at`默认当前时间。\n\n**业务洞察：**\n1. **安全设计到位**：密码单独加密存储（`text`类型），符合安全规范。\n2. **配置灵活性高**：连接信息（如`host`、`port`）允许为空，可能支持多种数据库类型或本地连接。\n\n建议补充字段注释以提升可维护性。', 'table', 0, '2026-02-20 21:30:33');
INSERT INTO `query_history` VALUES (2, 1, '几个表的关联关系是怎样的', 'SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, COLUMN_NAME', 'SELECT TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME, COLUMN_NAME', 1, 9, 'success', NULL, '查询结果显示当前数据库仅存在1个外键关联关系：  \n**query_history表的datasource_id字段关联到datasources表的id字段**。  \n\n**关键信息**：  \n1. 关联关系数量极少（仅1条），可能表明数据库设计未广泛使用外键约束，或采用其他关联方式（如应用层逻辑）。  \n2. 该关联揭示了业务逻辑：查询历史（query_history）依赖数据源（datasources），说明系统可能记录每次查询对应的数据源信息。  \n\n**业务洞察**：  \n- 可基于此关联分析不同数据源的查询频率，优化资源分配。  \n- 若需扩展数据分析维度（如关联用户表），需检查是否存在未定义外键的隐式关联字段。', 'table', 0, '2026-02-20 21:32:14');
INSERT INTO `query_history` VALUES (3, 2, '用户表和知识库数据的关系', 'SELECT u.id AS user_id, u.username, u.nickname, u.email, COUNT(DISTINCT kb.id) AS knowledge_base_count, COUNT(DISTINCT km.knowledge_base_id) AS member_knowledge_base_count, COUNT(DISTINCT kbd.document_id) AS document_count FROM users u LEFT JOIN knowledge_bases kb ON u.id = kb.owner_id LEFT JOIN knowledge_base_members km ON u.id = km.user_id LEFT JOIN knowledge_base_document kbd ON kb.id = kbd.knowledge_base_id GROUP BY u.id, u.username, u.nickname, u.email ORDER BY u.id', 'SELECT u.id AS user_id, u.username, u.nickname, u.email, COUNT(DISTINCT kb.id) AS knowledge_base_count, COUNT(DISTINCT km.knowledge_base_id) AS member_knowledge_base_count, COUNT(DISTINCT kbd.document_id) AS document_count FROM users u LEFT JOIN knowledge_bases kb ON u.id = kb.owner_id LEFT JOIN knowledge_base_members km ON u.id = km.user_id LEFT JOIN knowledge_base_document kbd ON kb.id = kbd.knowledge_base_id GROUP BY u.id, u.username, u.nickname, u.email ORDER BY u.id', 0, 25, 'success', NULL, NULL, 'table', 0, '2026-02-20 21:42:24');
INSERT INTO `query_history` VALUES (4, 2, '我要看看文章表中的数据', 'SELECT id, title, content, user_id, created_at, updated_at, deleted_at, views FROM articles ORDER BY id', 'SELECT id, title, content, user_id, created_at, updated_at, deleted_at, views FROM articles ORDER BY id', 0, 20, 'success', NULL, NULL, 'table', 0, '2026-02-20 21:42:59');
INSERT INTO `query_history` VALUES (5, 2, '我要看看聊天消息中的数据', 'SELECT id, message_id, session_id, user_id, role, content, metadata, token_count, created_at FROM chat_messages ORDER BY id', 'SELECT id, message_id, session_id, user_id, role, content, metadata, token_count, created_at FROM chat_messages ORDER BY id', 32, 5, 'success', NULL, '数据共32条消息，涉及10个会话。关键发现：用户1是唯一活跃用户，发送了所有用户消息（16条）；助手回复16条，形成完整对话。异常在于：前4条消息（会话1）为有意义的AI技术咨询，但后续会话（3-10）用户消息均为“测试”，内容质量显著下降。\n\n业务洞察：1）用户可能在进行功能测试，而非真实使用，需关注用户留存与真实需求转化。2）token_count和metadata字段全为空，数据记录不完整，影响后续分析和成本核算。', 'table', 0, '2026-02-20 21:43:42');
INSERT INTO `query_history` VALUES (6, 2, '我要看看聊天消息中的数据，帮我把其中内容为测试数据的筛选出来', 'SELECT id, message_id, session_id, user_id, role, content, metadata, token_count, created_at FROM chat_messages WHERE content LIKE \'%测试数据%\' ORDER BY id', 'SELECT id, message_id, session_id, user_id, role, content, metadata, token_count, created_at FROM chat_messages WHERE content LIKE \'%测试数据%\' ORDER BY id', 0, 20, 'success', NULL, NULL, 'table', 0, '2026-02-20 21:44:11');
INSERT INTO `query_history` VALUES (7, 2, '我要看看聊天消息中的数据，帮我把其中内容为测试的筛选出来', 'SELECT id, message_id, session_id, user_id, role, content, metadata, token_count, created_at FROM chat_messages WHERE content LIKE \'%测试%\' ORDER BY id', 'SELECT id, message_id, session_id, user_id, role, content, metadata, token_count, created_at FROM chat_messages WHERE content LIKE \'%测试%\' ORDER BY id', 21, 5, 'success', NULL, '共筛选出21条含“测试”的聊天消息。关键发现：用户消息（role: user）内容均为“测试”，共11条；助手回复（role: assistant）内容均包含“测试”关键词，共10条，且回复内容多样，展示了不同功能引导。所有记录均来自user_id=1的用户，时间集中在2025-06-08下午，涉及15个独立会话。\n\n业务洞察：\n1. 用户可能在进行系统测试或初次体验，导致大量简短测试消息。\n2. 助手回复内容不重复，展示了良好的响应多样性，但token_count字段全为空，需检查数据采集完整性。', 'table', 0, '2026-02-20 21:44:30');
INSERT INTO `query_history` VALUES (8, 2, '帮我看看聊天消息的表', 'SELECT * FROM chat_messages LIMIT 10', 'SELECT * FROM chat_messages LIMIT 10', 10, 6, 'success', NULL, '本次查询展示了聊天消息表的前10条记录。关键发现：1）存在3个会话（session_id 1, 3, 4, 5），其中会话1为有效对话（4条消息），其余会话多为测试内容（用户输入“测试”）。2）所有assistant消息的user_id均为空，符合预期。3）metadata和token_count字段全为空，可能影响后续分析。\n\n业务洞察：1）测试对话占比高（3/4个会话），需关注用户真实使用情况。2）建议补充token_count数据以监控成本，并完善metadata记录会话来源等信息。', 'table', 0, '2026-02-20 22:16:18');
INSERT INTO `query_history` VALUES (9, 2, '我想要看看聊天消息中的数据', 'SELECT * FROM chat_messages', 'SELECT * FROM chat_messages', 32, 5, 'success', NULL, '共32条聊天记录，涉及10个会话（session_id 1-10）。关键发现：用户1在6月8日进行了大量“测试”查询（内容为“测试”或简单提问），占样本多数。助手回复多为标准欢迎语或功能列表，但会话6中用户提问“请介绍一下人工智能”后，助手回复为通用结束语，存在答非所问的异常。\n\n业务洞察：1. 当前测试行为占比高，需区分真实用户需求与测试流量；2. 助手在部分会话中未能有效识别并回应用户具体问题，需优化意图识别与回答相关性。', 'table', 0, '2026-02-20 22:25:08');
INSERT INTO `query_history` VALUES (10, 2, '我想要看看聊天消息中的数据，然后帮我把角色为user的筛选出来', 'SELECT * FROM chat_messages WHERE role = \'user\'', 'SELECT * FROM chat_messages WHERE role = \'user\'', 16, 8, 'success', NULL, '本次查询筛选出16条用户消息。关键发现：所有消息均来自同一用户（user_id: 1），且内容高度重复，其中12条为“测试”，仅2条为有效AI技术咨询。时间集中在6月8日，呈现密集的测试行为。\n\n业务洞察：\n1. 用户1可能在进行系统测试或熟悉功能，导致大量无效会话，需关注其真实需求或引导有效使用。\n2. 有效咨询占比低（12.5%），建议优化新用户体验，减少无意义测试，提升内容质量。', 'table', 0, '2026-02-20 22:25:29');
INSERT INTO `query_history` VALUES (11, 2, '我想要看看聊天消息中的数据，然后帮我把角色为user的筛选出来，然后将content有测试的数据筛选出来', 'SELECT * FROM chat_messages WHERE role = \'user\' AND content LIKE \'%测试%\'', 'SELECT * FROM chat_messages WHERE role = \'user\' AND content LIKE \'%测试%\'', 13, 12, 'success', NULL, '共筛选出13条用户消息，内容均为“测试”。所有消息均来自同一用户（user_id: 1），时间集中在2025-06-08下午，涉及15个独立会话（session_id 3-15）。\n\n**关键发现**：\n1.  **测试行为集中**：单一用户在短时间内进行了大量重复测试，内容单一。\n2.  **会话模式**：多数会话仅包含一条“测试”消息，可能为快速功能验证或连接测试。\n\n**业务洞察**：\n1.  该用户（ID:1）可能是内部测试员或新用户进行初步探索，建议关注其后续真实使用情况。\n2.  大量“测试”消息可能拉低平均对话质量指标，分析活跃用户或内容价值时可考虑过滤此类会话。', 'table', 0, '2026-02-20 22:25:54');
INSERT INTO `query_history` VALUES (12, 2, '我想要看看聊天消息中的数据，然后帮我把角色为user的筛选出来，然后将content有测试的数据筛选出来，然后统计下有多少条数据', 'SELECT COUNT(*) AS message_count FROM chat_messages WHERE role = \'user\' AND content LIKE \'%测试%\'', 'SELECT COUNT(*) AS message_count FROM chat_messages WHERE role = \'user\' AND content LIKE \'%测试%\'', 1, 12, 'success', NULL, '查询结果显示：用户发送的聊天消息中，包含“测试”关键词的共有 **13 条**。\n\n**关键点**：\n- 用户主动发送的测试类消息数量明确，占比需结合总消息量评估。\n\n**业务洞察**：\n1. 测试相关消息占一定比例，可能反映用户对新功能或稳定性的验证需求较高。\n2. 建议监控此类消息趋势，若持续增长，可考虑优化产品引导或测试流程。', 'table', 0, '2026-02-20 22:26:14');
INSERT INTO `query_history` VALUES (13, 2, '我想看看知识库表的数据，有没有 ', 'SELECT * FROM knowledge_bases', 'SELECT * FROM knowledge_bases', 5, 18, 'success', NULL, '当前知识库共有5个，均为活跃状态。关键发现：所有知识库的文档数和分块数均为0，说明尚未上传任何内容。其中3个为公开，2个为私有，均由同一用户（owner_id=1）创建。\n\n**业务洞察**：\n1. **内容空白风险**：所有知识库均为“空壳”，需立即推动文档上传，否则功能价值无法体现。\n2. **数据质量待提升**：第5条记录名称“11”、描述“111”明显为测试数据，需清理并建立创建规范。', 'table', 0, '2026-02-20 22:26:43');

-- ----------------------------
-- Table structure for system_settings
-- ----------------------------
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings`  (
  `id` int NOT NULL AUTO_INCREMENT,
  `key` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL,
  `value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NULL,
  `updated_at` datetime NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `key`(`key` ASC) USING BTREE,
  INDEX `ix_system_settings_id`(`id` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of system_settings
-- ----------------------------

SET FOREIGN_KEY_CHECKS = 1;
