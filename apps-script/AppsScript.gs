function doPost(e) {
  try {
    console.log("doPost raw postData:", e && e.postData ? e.postData.contents : "no postData");
    const payload = e && e.postData && e.postData.contents
      ? JSON.parse(e.postData.contents)
      : {};

    console.log("doPost parsed payload:", JSON.stringify(payload));

    if (payload.action === "logSupportTicket") {
      return logSupportTicket(payload);
    }

    GmailApp.sendEmail(payload.to, payload.subject || "", payload.body || "", {
      name: "Dahan Group Consulting",
      replyTo: "eric@dahangroup.io",
      htmlBody: payload.html || "",
    });

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error("doPost error:", err && err.stack ? err.stack : err);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message, stack: err.stack }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function logSupportTicket(payload) {
  try {
    console.log("logSupportTicket payload:", JSON.stringify(payload));

    const ss = SpreadsheetApp.openById(getConfig("SPREADSHEET_ID"));

    let sheet = ss.getSheetByName(getConfig("SUPPORT_SHEET_NAME"));
    if (!sheet) {
      sheet = ss.insertSheet("Support Tickets");
      sheet.getRange(1, 1, 1, 10).setValues([[
        "Ticket ID", "Date Created", "Last Updated", "Category", "Urgency",
        "Issue Summary", "Client Name", "Client Email", "Needs Human", "Status",
      ]]);
      const headerRange = sheet.getRange(1, 1, 1, 10);
      headerRange.setBackground("#142d5a");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      sheet.setFrozenRows(1);
      [160, 160, 160, 120, 100, 280, 140, 200, 120, 100].forEach((w, i) => {
        sheet.setColumnWidth(i + 1, w);
      });
    }

    const ticketId = payload.ticketId || payload.ticket_id || (
      "DGC-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") +
      "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
    );
    const now = new Date().toISOString();
    const category = (payload.category || payload.cat || "SUPPORT").toString();
    const urgency = (payload.urgency || payload.urg || "medium").toString().toUpperCase();
    const issueSummary = payload.issueSummary || payload.issue_summary || payload.issue || "";
    const clientName = payload.clientName || payload.client_name || payload.client || "";
    const clientEmail = payload.clientEmail || payload.client_email || payload.email || "";
    const needsHuman = payload.needsHuman || payload.needs_human || "YES";
    const dateCreated = payload.date || now;

    const data = sheet.getDataRange().getValues();
    let existingRow = -1;
    for (let i = 1; i < data.length; i++) {
      if ("" + data[i][0] === "" + ticketId) {
        existingRow = i + 1;
        break;
      }
    }

    if (existingRow > 0) {
      sheet.getRange(existingRow, 3).setValue(now);
      sheet.getRange(existingRow, 6).setValue(issueSummary);
      sheet.getRange(existingRow, 9).setValue(needsHuman);
    } else {
      const newRow = [
        ticketId,
        dateCreated,
        now,
        category,
        urgency,
        issueSummary,
        clientName,
        clientEmail,
        needsHuman,
        "OPEN",
      ];
      sheet.appendRow(newRow);

      const lastRow = sheet.getLastRow();
      const rowRange = sheet.getRange(lastRow, 1, 1, 10);
      const u = urgency.toLowerCase();
      if (u === "high") rowRange.setBackground("#fce8e6");
      else if (u === "medium") rowRange.setBackground("#fef9e7");
      else rowRange.setBackground("#e8f5e9");
    }

    return ContentService.createTextOutput(JSON.stringify({ success: true, ticketId }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    console.error("logSupportTicket error:", err && err.stack ? err.stack : err);
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: err.message, stack: err.stack }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
