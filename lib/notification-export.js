import { getNotificationPresentation } from "./notification-copy.js";

function csvCell(value) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildNotificationCsv(notifications, locale = "tr") {
  const language = locale === "en" ? "en" : "tr";
  const headers = language === "tr"
    ? ["Tarih (UTC)", "Bildirim türü", "Başlık", "Ayrıntı", "İlgili kayıt", "Durum"]
    : ["Date (UTC)", "Notification type", "Title", "Details", "Related item", "Status"];
  const status = language === "tr"
    ? { read: "Okundu", unread: "Okunmadı" }
    : { read: "Read", unread: "Unread" };

  const rows = notifications.flatMap((notification) => {
    const presentation = getNotificationPresentation(notification, language);
    if (!presentation) return [];
    return [[
      new Date(notification.created_at).toISOString(),
      notification.type,
      presentation.title,
      presentation.body,
      notification.source_name || "",
      notification.read_at ? status.read : status.unread,
    ]];
  });

  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}\r\n`;
}
