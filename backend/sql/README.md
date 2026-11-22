# SQL

开发现在直连云上 MySQL 的 16th_birthday，测试固定本机 127.0.0.1:3306/birthday16_test。云上新库已执行完整 schema/00_birthday_schema.sql，12表（包含回忆管理字段、媒体缩略图及上传幂等扩展）、6外键；无需重复执行01迁移。应用启动使用已有表结构，不自动建库建表。

DB_* 配置云库运行账号，TEST_DB_USER/TEST_DB_PASSWORD保存本机测试账号；真实凭据只在忽略的.env中。DDL由管理账号执行，应用仅授予目标库SELECT/INSERT/UPDATE/DELETE，并强制TLS。原本机开发库保留，未迁移或删除其中数据。

回忆管理02迁移已在云上16th_birthday和本机birthday16_test执行，旧投稿保留；旧库只执行一次sql/migrations/02_memory_management.sql，新库执行完整schema后不要再执行02。原本机birthday16_dev未改动。详见上级数据库设计和API v3。

2026-11-23：媒体03迁移新增thumbnail_url、upload_request_id、upload_hash及两个归属范围唯一索引，已在云上16th_birthday和本机birthday16_test执行；原27条云媒体的原字段指纹不变。新库完整schema已同步；不自动为历史图片推导缩略图。
