package com.sipc115.birthday.common.api;

public enum ErrorCode {
    BAD_REQUEST(400, "JSON 无法解析、路径或查询格式非法、重复查询参数"),
    VALIDATION_ERROR(400, "缺失必填、类型或枚举错误、长度、未知字段、跨字段校验、空 PATCH"),
    MEMORY_CONTENT_REQUIRED(400, "正文和图片都为空，姓名或标题不能代替正文"),
    IMAGE_COUNT_INVALID(400, "回忆图片超过 9 张，或荣誉图片不在 1～9 张"),
    IMAGE_DUPLICATED(400, "imageIds 包含重复编号"),
    IMAGE_EMPTY(400, "上传空文件"),
    IMAGE_DIMENSIONS_EXCEEDED(400, "原图超过 2500 万像素或解码边界限制"),
    UNAUTHORIZED(401, "管理令牌缺失、过期、签名或 issuer/audience 不合法"),
    IMAGE_ACCESS_DENIED(403, "调用方无权关联该图片"),
    ENDPOINT_NOT_FOUND(404, "本项目路径不存在"),
    INVITATION_NOT_FOUND(404, "目标回执不存在"),
    MEMORY_NOT_FOUND(404, "目标投稿不存在"),
    HONOR_NOT_FOUND(404, "荣誉不存在或已软删除"),
    IMAGE_NOT_FOUND(404, "图片编号不存在"),
    METHOD_NOT_ALLOWED(405, "路径存在但方法不支持"),
    VERSION_CONFLICT(409, "expectedVersion 与当前版本不符"),
    IDEMPOTENCY_CONFLICT(409, "同一操作编号对应不同规范化请求"),
    IMAGE_ALREADY_USED(409, "回忆图片已由另一投稿认领"),
    EMAIL_PREVIEW_CHANGED(409, "同一回执版本的邮件预览摘要已改变"),
    IMAGE_FILE_TOO_LARGE(413, "单张图片超过 10485760 字节"),
    UNSUPPORTED_MEDIA_TYPE(415, "请求 Content-Type 不符合接口约定"),
    IMAGE_TYPE_UNSUPPORTED(415, "文件实际格式为允许范围外类型"),
    TOO_MANY_REQUESTS(429, "公开请求超出配置限流"),
    IMAGE_SERVICE_ERROR(502, "图片中台错误、拒绝凭证或返回异常结果"),
    SERVICE_UNAVAILABLE(503, "本项目依赖或初始化状态导致暂不可用"),
    SERVICE_BUSY(503, "事务冲突重试耗尽或并发命令繁忙"),
    IMAGE_SERVICE_UNAVAILABLE(503, "图片服务连接不可用"),
    IMAGE_SERVICE_TIMEOUT(504, "等待图片上游响应超时"),
    INTERNAL_ERROR(500, "本项目未预期内部错误"),
    EMAIL_SEND_IN_PROGRESS(409, "同版本已有活动任务，且其确认内容与本次预览不同"),
    IMAGE_INVALID(400, "图片已损坏、内容不完整或无法安全解析"),
    NOT_ACCEPTABLE(406, "Accept 仅允许接口无法提供的响应类型"),
    REQUEST_TOO_LARGE(413, "JSON 请求体超过 1 MiB，或 multipart 总体超过 11 MiB");
    private final int status;
    private final String message;

    ErrorCode(int status, String message) {
        this.status = status;
        this.message = message;
    }

    public int status() { return status; }
    public String message() { return message; }
}
