package com.sipc115.birthday.common.api;

public enum BusinessCode {
    OK(200, "读取成功或健康检查成功"),
    INVITATION_CREATED(201, "首次保存报名回执"),
    INVITATION_UPDATED(200, "同手机号更新或管理员更正成功"),
    IMAGE_UPLOADED(201, "单张图片上传并登记成功"),
    MEMORY_CREATED(201, "投稿已保存并公开"),
    HONOR_CREATED(201, "荣誉创建成功"),
    HONOR_UPDATED(200, "荣誉编辑成功，包括内容未变化的保存"),
    HONOR_DELETED(200, "荣誉软删除成功"),
    EMAIL_SEND_CONFIRMED(202, "管理员确认已持久化并进入处理"),
    EMAIL_SEND_REUSED(200, "同版本已有活动任务，返回该任务"),
    EMAIL_SEND_DISABLED(200, "已记录确认，本环境禁用实际发送");
    private final int status;
    private final String message;

    BusinessCode(int status, String message) {
        this.status = status;
        this.message = message;
    }

    public int status() { return status; }
    public String message() { return message; }
}
