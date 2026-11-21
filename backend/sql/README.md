# SQL

开发现在直连云上 MySQL 的 16th_birthday，测试固定本机 127.0.0.1:3306/birthday16_test。云上新库已执行完整 schema/00_birthday_schema.sql，12表、120字段、6外键；无需重复执行01迁移。应用启动使用已有表结构，不自动建库建表。

DB_* 配置云库运行账号，TEST_DB_USER/TEST_DB_PASSWORD保存本机测试账号；真实凭据只在忽略的.env中。DDL由管理账号执行，应用仅授予目标库SELECT/INSERT/UPDATE/DELETE，并强制TLS。原本机开发库保留，未迁移或删除其中数据。
