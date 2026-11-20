package com.sipc115.birthday.invitation.export;

import com.sipc115.birthday.invitation.response.InvitationResponse;
import java.io.IOException;
import java.io.Writer;

public final class InvitationCsvWriter {
    private InvitationCsvWriter() {}

    public static void header(Writer writer) throws IOException {
        writer.write('\uFEFF');
        writer.write("报名编号,姓名,手机号,邮箱,是否到场,礼物领取方式,邮寄地址,邮件状态,最近发送时间,创建时间,更新时间\r\n");
    }

    public static void row(Writer writer, InvitationResponse row) throws IOException {
        String attendance = "ATTENDING".equals(row.attendance()) ? "到场" : "不到场";
        String gift = switch (row.giftChoice()) {
            case "PICKUP" -> "现场领取";
            case "MAIL" -> "邮寄";
            default -> "不需要";
        };
        String status = switch (row.emailNotifyStatus()) {
            case "PENDING" -> "处理中";
            case "SUCCESS" -> "已发送";
            case "FAILED" -> "失败";
            case "DISABLED" -> "已禁用";
            default -> "未发送";
        };
        String[] cells = {"'" + row.id(), row.name(), "'" + row.phone(), row.email(), attendance,
                gift, row.mailingAddress(), status, row.emailNotifiedAt(), row.createdAt(), row.updatedAt()};
        for (int i = 0; i < cells.length; i++) {
            if (i > 0) { writer.write(','); }
            String value = cells[i] == null ? "" : cells[i];
            String trimmed = value.stripLeading();
            if (!trimmed.isEmpty() && "=+-@".indexOf(trimmed.charAt(0)) >= 0) { value = "'" + value; }
            writer.write('"' + value.replace("\"", "\"\"") + '"');
        }
        writer.write("\r\n");
    }
}
