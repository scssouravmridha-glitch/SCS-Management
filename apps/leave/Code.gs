var APP_CONFIG = {
  EMPLOYEE_SHEET: "Employee List",
  APPLICATION_SHEET: "Leave Applications",
  LEAVE_RECORD_SHEET: "Leave Record",
  CONFIG_SHEET: "App Config",
  NOTIFICATION_SHEET: "Notifications",
  TIMEZONE: "Asia/Dhaka",
  LOGIN_PIN: "2019",
  ADMIN_PIN: "2026",
};

var DEFAULT_GLOBAL_LEAVE_TYPES =
  "Casual Leave, Physical Leave, Family Problem Leave, Weeding Leave, Other";
var DEFAULT_GLOBAL_APPROVERS = "Mr. Ujjal Majumder, Shamiran Halder";

function doGet() {
  initializeSystem_();
  ensureAutoBackup_();
  return HtmlService.createTemplateFromFile("Index")
    .evaluate()
    .setTitle("SCS LEAVE APPLICATION")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getBootstrapData() {
  initializeSystem_();
  return {
    ok: true,
    employees: getEmployees_(),
    applications: getApplications_(),
    globalConfig: getGlobalConfig_(),
    notifications: getNotifications_(),
    serverTime: nowDhaka_(),
    adminPinLen: getAdminPinLen_(),
    logo: getLogo_(),
    notifyEmails: PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAILS") || "",
  };
}

function submitLeaveApplication(payload) {
  try {
    initializeSystem_();
    if (!payload || !payload.employeeId) {
      return { ok: false, error: "Invalid payload" };
    }
    var emp = findEmployeeById_(payload.employeeId);
    if (!emp) {
      return { ok: false, error: "Employee not found" };
    }

    var sheet = getSheet_(APP_CONFIG.APPLICATION_SHEET);
    var appId = generateLeaveId_();
    sheet.appendRow([
      nowDhaka_(),
      appId,
      emp.employeeId,
      emp.name,
      emp.designation,
      emp.mobile,
      payload.fromDate,
      payload.toDate,
      Number(payload.totalDays) || 0,
      payload.leaveType || "",
      Number(emp.acceptableLeaveDays) || 12,
      payload.description || "",
      "Pending",
      "",
    ]);

    addNotification_(emp.name + " applied: " + (Number(payload.totalDays) || 0) + " day(s)");
    sendNotifyMail_(emp.name + " applied for leave", emp.name + " (" + emp.employeeId + ") applied for " + (Number(payload.totalDays) || 0) + " day(s): " + payload.fromDate + " to " + payload.toDate + ". Application ID: " + appId);
    formatApplicationSheet_();
    updateLeaveRecordSheet_();
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function splitNames_(v) {
  return String(v || "").split(",").map(function(x) { return x.trim(); }).filter(Boolean);
}

// একাধিক অ্যাপ্রুভার: কমপক্ষে একজন অ্যাপ্রুভ করলেই স্ট্যাটাস Approved
function approveApplication(applicationId, approverName, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid admin PIN" };
    initializeSystem_();
    var sheet = getSheet_(APP_CONFIG.APPLICATION_SHEET);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(applicationId)) {
        var emp = findEmployeeById_(String(data[i][2]));
        var name = String(approverName || "").trim() ||
          (emp && emp.approvedBy ? splitNames_(emp.approvedBy)[0] : "Admin");
        var cur = splitNames_(data[i][13]);
        if (cur.indexOf(name) < 0) cur.push(name);
        sheet.getRange(i + 1, 13).setValue("Approved");
        sheet.getRange(i + 1, 14).setValue(cur.join(", "));
        addNotification_("Approved by " + name + ": " + (emp ? emp.name : applicationId));
        formatApplicationSheet_();
        updateLeaveRecordSheet_();
        return getBootstrapData();
      }
    }
    return { ok: false, error: "Application not found" };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// approverName দিলে শুধু সেই ব্যক্তির অ্যাপ্রুভ সরবে; কেউ না থাকলে Pending
function unapproveApplication(applicationId, approverName, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid admin PIN" };
    initializeSystem_();
    var sheet = getSheet_(APP_CONFIG.APPLICATION_SHEET);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(applicationId)) {
        var name = String(approverName || "").trim();
        var cur = name ? splitNames_(data[i][13]).filter(function(x) { return x !== name; }) : [];
        sheet.getRange(i + 1, 13).setValue(cur.length ? "Approved" : "Pending");
        sheet.getRange(i + 1, 14).setValue(cur.join(", "));
        addNotification_((name ? "Approval removed (" + name + "): " : "Moved to pending: ") + applicationId);
        formatApplicationSheet_();
        updateLeaveRecordSheet_();
        return getBootstrapData();
      }
    }
    return { ok: false, error: "Application not found" };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// অ্যাডমিন থেকে আবেদন মডিফাই
function updateApplication(applicationId, f, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    initializeSystem_();
    var sheet = getSheet_(APP_CONFIG.APPLICATION_SHEET);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(applicationId)) {
        sheet.getRange(i + 1, 7, 1, 4).setValues([[String(f.fromDate || ""), String(f.toDate || ""), Number(f.totalDays) || 0, String(f.leaveType || "")]]);
        sheet.getRange(i + 1, 12).setValue(String(f.description || ""));
        addNotification_("Application modified: " + applicationId);
        formatApplicationSheet_();
        updateLeaveRecordSheet_();
        return getBootstrapData();
      }
    }
    return { ok: false, error: "Application not found" };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function deleteApplication(applicationId, approvalPin) {
  try {
    if (!verifyAdminPin_(approvalPin)) {
      return { ok: false, error: "Invalid Admin PIN" };
    }
    initializeSystem_();
    var sheet = getSheet_(APP_CONFIG.APPLICATION_SHEET);
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][1]) === String(applicationId)) {
        sheet.deleteRow(i + 1);
        addNotification_("Application deleted: " + applicationId);
        formatApplicationSheet_();
        updateLeaveRecordSheet_();
        return getBootstrapData();
      }
    }
    return { ok: false, error: "Application not found" };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function saveEmployee(employee, approvalPin) {
  try {
    if (!verifyAdminPin_(approvalPin)) {
      return { ok: false, error: "Invalid Admin PIN" };
    }
    initializeSystem_();
    var sheet = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
    var data = sheet.getDataRange().getValues();
    var targetRow = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][4]) === String(employee.employeeId)) {
        targetRow = i + 1;
        break;
      }
    }

    var row = [
      employee.slNo || (data.length || 1),
      employee.name || "",
      employee.designation || "",
      employee.mobile || "",
      employee.employeeId || "",
      employee.photo || "",
      Number(employee.acceptableLeaveDays) || 12,
      employee.typeOfLeave || getGlobalConfig_().leaveTypes,
      employee.approvedBy || getGlobalConfig_().approvers,
    ];

    if (targetRow > 0) {
      sheet.getRange(targetRow, 1, 1, 9).setValues([row]);
      addNotification_("Employee updated: " + employee.employeeId);
    } else {
      sheet.appendRow(row);
      addNotification_("Employee added: " + employee.employeeId);
    }

    formatEmployeeSheet_();
    updateLeaveRecordSheet_();
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function deleteEmployee(employeeId, approvalPin) {
  try {
    if (!verifyAdminPin_(approvalPin)) {
      return { ok: false, error: "Invalid Admin PIN" };
    }
    initializeSystem_();

    var empSheet = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
    var empData = empSheet.getDataRange().getValues();
    for (var i = 1; i < empData.length; i++) {
      if (String(empData[i][4]) === String(employeeId)) {
        empSheet.deleteRow(i + 1);
        break;
      }
    }

    var appSheet = getSheet_(APP_CONFIG.APPLICATION_SHEET);
    var appData = appSheet.getDataRange().getValues();
    for (var j = appData.length - 1; j >= 1; j--) {
      if (String(appData[j][2]) === String(employeeId)) {
        appSheet.deleteRow(j + 1);
      }
    }

    addNotification_("Employee deleted: " + employeeId);
    formatEmployeeSheet_();
    formatApplicationSheet_();
    updateLeaveRecordSheet_();
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function saveGlobalConfig(leaveTypes, approvers, applyAll, approvalPin) {
  try {
    if (!verifyAdminPin_(approvalPin)) {
      return { ok: false, error: "Invalid Admin PIN" };
    }
    initializeSystem_();
    var cfg = getSheet_(APP_CONFIG.CONFIG_SHEET);
    cfg.getRange("B2").setValue(leaveTypes || defaultLeaveTypes_());
    cfg.getRange("B3").setValue(approvers || defaultApprovers_());

    if (applyAll) {
      var emp = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
      var lastRow = emp.getLastRow();
      if (lastRow >= 2) {
        emp.getRange(2, 8, lastRow - 1, 1).setValue(leaveTypes || defaultLeaveTypes_());
        emp.getRange(2, 9, lastRow - 1, 1).setValue(approvers || defaultApprovers_());
      }
      addNotification_("Global config applied to all employees");
    }

    formatEmployeeSheet_();
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function syncNow() {
  initializeSystem_();
  formatEmployeeSheet_();
  formatApplicationSheet_();
  updateLeaveRecordSheet_();
  return getBootstrapData();
}

function verifyLoginPin(pin) {
  return { ok: String(pin || "").trim() === APP_CONFIG.LOGIN_PIN };
}

function verifyAdminPin(pin) {
  return { ok: verifyAdminPin_(pin) };
}

// পুরনো নামের সাথে সামঞ্জস্য রাখার জন্য (Approver -> Admin)
function verifyApproverPin(pin) {
  return verifyAdminPin(pin);
}

function initializeSystem_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var emp = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
  if (emp.getLastRow() === 0) {
    emp.appendRow([
      "SL",
      "Employee Name",
      "Designation",
      "Mobile",
      "Employee ID",
      "Photo",
      "Acceptable Leave Days",
      "Type Of Leave",
      "Approved By",
    ]);
    var samples = [
      [1, "Mr. Samiron Halder", "General Manager", "01711-504432", "201901", "", 12, defaultLeaveTypes_(), "Mr. Ujjal Majumder"],
      [2, "Mr. Ujjal Majumder", "Senior Manager-Technical Service", "01711-928645", "201902", "", 12, defaultLeaveTypes_(), "Mr. Samiron Halder"],
      [3, "Malay Kanti Mallick", "Senior Executive Sales & Marketing", "01728-915049", "201903", "", 12, defaultLeaveTypes_(), defaultApprovers_()],
      [4, "Malay Bepari", "Executive Sales & Marketing", "01725-594588", "201904", "", 12, defaultLeaveTypes_(), defaultApprovers_()],
      [5, "Sabuj Halder Rocky", "Executive Sales & Marketing", "01725-594389", "201906", "", 12, defaultLeaveTypes_(), defaultApprovers_()],
    ];
    emp.getRange(2, 1, samples.length, 9).setValues(samples);
  }

  var app = getSheet_(APP_CONFIG.APPLICATION_SHEET);
  if (app.getLastRow() === 0) {
    app.appendRow([
      "Timestamp",
      "LA ID",
      "Employee ID",
      "Employee Name",
      "Designation",
      "Mobile",
      "From Date",
      "To Date",
      "Total Days",
      "Leave Type",
      "Acceptable Leave Days",
      "Description",
      "Status",
      "Approved By",
    ]);
  }

  var rec = getSheet_(APP_CONFIG.LEAVE_RECORD_SHEET);
  if (rec.getLastRow() === 0) {
    rec.appendRow(["Leave Record Matrix"]);
  }

  var cfg = getSheet_(APP_CONFIG.CONFIG_SHEET);
  if (cfg.getLastRow() === 0) {
    cfg.appendRow(["Key", "Value"]);
    cfg.appendRow(["Global Leave Types", defaultLeaveTypes_()]);
    cfg.appendRow(["Global Approvers", defaultApprovers_()]);
  }

  var notes = getSheet_(APP_CONFIG.NOTIFICATION_SHEET);
  if (notes.getLastRow() === 0) {
    notes.appendRow(["Timestamp", "Message"]);
  }

  // Heavy formatting and matrix rebuild are invoked explicitly by write/sync operations.
}

function getSheet_(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function getEmployees_() {
  var sheet = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][4]) continue;
    var rawPhoto = String(data[i][5] || "");
    out.push({
      slNo: Number(data[i][0]) || i,
      name: String(data[i][1] || ""),
      designation: String(data[i][2] || ""),
      mobile: String(data[i][3] || ""),
      employeeId: String(data[i][4] || ""),
      photo: formatPhotoUrl_(rawPhoto),
      acceptableLeaveDays: Number(data[i][6]) || 12,
      typeOfLeave: String(data[i][7] || defaultLeaveTypes_()),
      approvedBy: String(data[i][8] || defaultApprovers_()),
      _i: i,
    });
  }
  out.sort(function(a, b) { return (a.slNo - b.slNo) || (a._i - b._i); });
  out.forEach(function(e) { delete e._i; });
  return out;
}

function findEmployeeById_(empId) {
  var list = getEmployees_();
  for (var i = 0; i < list.length; i++) {
    if (String(list[i].employeeId) === String(empId)) return list[i];
  }
  return null;
}

function getApplications_() {
  var sheet = getSheet_(APP_CONFIG.APPLICATION_SHEET);
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var i = 1; i < data.length; i++) {
    if (!data[i][1]) continue;
    out.push({
      timestamp: stampStr_(data[i][0]),
      applicationId: String(data[i][1] || ""),
      employeeId: String(data[i][2] || ""),
      employeeName: String(data[i][3] || ""),
      designation: String(data[i][4] || ""),
      mobile: String(data[i][5] || ""),
      fromDate: dayStr_(data[i][6]),
      toDate: dayStr_(data[i][7]),
      totalDays: Number(data[i][8]) || 0,
      leaveType: String(data[i][9] || ""),
      acceptableLeaveDays: Number(data[i][10]) || 12,
      description: String(data[i][11] || ""),
      status: String(data[i][12] || "Pending"),
      approvedBy: String(data[i][13] || ""),
    });
  }
  return out;
}

function getGlobalConfig_() {
  var cfg = getSheet_(APP_CONFIG.CONFIG_SHEET);
  return {
    leaveTypes: String(cfg.getRange("B2").getValue() || defaultLeaveTypes_()),
    approvers: String(cfg.getRange("B3").getValue() || defaultApprovers_()),
  };
}

function getNotifications_() {
  var sheet = getSheet_(APP_CONFIG.NOTIFICATION_SHEET);
  var data = sheet.getDataRange().getValues();
  var out = [];
  for (var i = data.length - 1; i >= 1; i--) {
    out.push({
      id: String(i),
      message: String(data[i][1] || ""),
      time: stampStr_(data[i][0]),
      read: false,
    });
    if (out.length >= 50) break;
  }
  return out;
}

function addNotification_(message) {
  var sh = getSheet_(APP_CONFIG.NOTIFICATION_SHEET);
  sh.appendRow([nowDhaka_(), message]);
}

function generateLeaveId_() {
  var now = new Date();
  var y = now.getFullYear();
  var m = Utilities.formatDate(now, APP_CONFIG.TIMEZONE, "MM");
  var prefix = "SCS" + y + m + "-";
  var apps = getApplications_();
  var count = 0;
  for (var i = 0; i < apps.length; i++) {
    if (apps[i].applicationId.indexOf(prefix) === 0) count += 1;
  }
  return prefix + ("0" + (count + 1)).slice(-2);
}

function formatEmployeeSheet_() {
  var sh = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
  var lr = sh.getLastRow();
  var lc = 9;
  if (lr < 1) return;
  sh.getRange(1, 1, lr, lc)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(1, 1, 1, lc)
    .setBackground("#1e3a8a")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sh.getRange(1, 1, lr, lc).setBorder(true, true, true, true, null, null, "#0f172a", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.autoResizeColumns(1, lc);
}

function formatApplicationSheet_() {
  var sh = getSheet_(APP_CONFIG.APPLICATION_SHEET);
  var lr = sh.getLastRow();
  var lc = 14;
  if (lr < 1) return;
  sh.getRange(1, 1, lr, lc)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(1, 1, 1, lc)
    .setBackground("#1e3a8a")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  if (lr >= 2) {
    var data = sh.getRange(2, 1, lr - 1, lc).getValues();
    for (var i = 0; i < data.length; i++) {
      var row = i + 2;
      var status = String(data[i][12] || "Pending");
      sh.getRange(row, 2).setFontWeight("bold").setFontColor("#4338ca");
      sh.getRange(row, 9).setFontWeight("bold");
      if (status === "Approved") {
        sh.getRange(row, 13).setBackground("#dcfce7").setFontColor("#166534").setFontWeight("bold");
      } else {
        sh.getRange(row, 13).setBackground("#fef3c7").setFontColor("#854d0e").setFontWeight("bold");
      }
    }
  }
  sh.getRange(1, 1, lr, lc).setBorder(true, true, true, true, null, null, "#0f172a", SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.autoResizeColumns(1, lc);
}

function updateLeaveRecordSheet_() {
  var sh = getSheet_(APP_CONFIG.LEAVE_RECORD_SHEET);
  sh.clear();

  var employees = getEmployees_();
  var apps = getApplications_().filter(function(a) {
    return a.status === "Approved";
  });

  if (!employees.length) {
    sh.getRange(1, 1).setValue("No employees");
    return;
  }

  var row = 1;
  var header = ["EMPLOYEE NAME"];
  for (var i = 0; i < employees.length; i++) {
    header.push((i + 1) + ". " + employees[i].name);
  }
  sh.getRange(row, 1, 1, header.length).setValues([header]);
  row += 1;

  var designation = ["Designation"];
  var mobile = ["Mobile Number"];
  var empId = ["Employee ID"];
  for (var j = 0; j < employees.length; j++) {
    designation.push(employees[j].designation);
    mobile.push(employees[j].mobile);
    empId.push(employees[j].employeeId);
  }
  sh.getRange(row, 1, 1, designation.length).setValues([designation]);
  row += 1;
  sh.getRange(row, 1, 1, mobile.length).setValues([mobile]);
  row += 1;
  sh.getRange(row, 1, 1, empId.length).setValues([empId]);
  row += 1;

  var byEmp = {};
  var max = 0;
  for (var k = 0; k < employees.length; k++) {
    var list = apps.filter(function(a) {
      return String(a.employeeId) === String(employees[k].employeeId);
    });
    byEmp[employees[k].employeeId] = list;
    if (list.length > max) max = list.length;
  }

  for (var b = 0; b < max; b++) {
    sh.getRange(row, 1).setValue("APPROVED LEAVE BLOCK #" + (b + 1));
    sh.getRange(row, 1, 1, employees.length + 1).merge();
    row += 1;

    var purpose = ["Purpose of Leave"];
    var from = ["From"];
    var to = ["To"];
    var days = ["Leave of Days"];
    var appr = ["Approve by"];

    for (var c = 0; c < employees.length; c++) {
      var app = byEmp[employees[c].employeeId][b];
      purpose.push(app ? app.leaveType + (app.description ? " - " + app.description : "") : "-");
      from.push(app ? app.fromDate : "-");
      to.push(app ? app.toDate : "-");
      days.push(app ? app.totalDays + " days" : "-");
      appr.push(app ? app.approvedBy : "-");
    }

    sh.getRange(row, 1, 1, purpose.length).setValues([purpose]);
    row += 1;
    sh.getRange(row, 1, 1, from.length).setValues([from]);
    row += 1;
    sh.getRange(row, 1, 1, to.length).setValues([to]);
    row += 1;
    sh.getRange(row, 1, 1, days.length).setValues([days]);
    row += 1;
    sh.getRange(row, 1, 1, appr.length).setValues([appr]);
    row += 1;
  }

  var totalRow = ["Total (Total Approved Days)"];
  var balanceRow = ["Leave Balance (Remaining Days)"];
  for (var d = 0; d < employees.length; d++) {
    var taken = byEmp[employees[d].employeeId].reduce(function(sum, a) {
      return sum + Number(a.totalDays || 0);
    }, 0);
    totalRow.push(taken + " days");
    balanceRow.push(Math.max(0, employees[d].acceptableLeaveDays - taken) + " days");
  }
  sh.getRange(row, 1, 1, totalRow.length).setValues([totalRow]);
  row += 1;
  sh.getRange(row, 1, 1, balanceRow.length).setValues([balanceRow]);

  var lastCol = employees.length + 1;
  var lastRow = sh.getLastRow();
  sh.getRange(1, 1, lastRow, lastCol)
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setBorder(true, true, true, true, true, true, "#94a3b8", SpreadsheetApp.BorderStyle.SOLID);
  sh.getRange(1, 1, 1, lastCol)
    .setBackground("#1d4ed8")
    .setFontColor("#ffffff")
    .setFontWeight("bold");
  sh.autoResizeColumns(1, lastCol);
}

function nowDhaka_() {
  return Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}

function sha256_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, "scs|" + text, Utilities.Charset.UTF_8)
    .map(function(b) { return ("0" + (b & 255).toString(16)).slice(-2); }).join("");
}

function verifyAdminPin_(pin) {
  pin = String(pin || "").trim();
  var props = PropertiesService.getScriptProperties();
  var hash = props.getProperty("ADMIN_PIN_HASH");
  return hash ? sha256_(pin) === hash : pin === APP_CONFIG.ADMIN_PIN;
}

function getAdminPinLen_() {
  return Number(PropertiesService.getScriptProperties().getProperty("ADMIN_PIN_LEN")) || 4;
}

// অ্যাডমিন পিন পরিবর্তন: ৪ থেকে ৮ ডিজিট
function changeAdminPin(oldPin, newPin) {
  try {
    newPin = String(newPin || "").trim();
    if (!verifyAdminPin_(oldPin)) return { ok: false, error: "Current admin PIN is wrong" };
    if (!/^\d{4,8}$/.test(newPin)) return { ok: false, error: "Admin PIN must be 4 to 8 digits" };
    if (newPin.indexOf(APP_CONFIG.LOGIN_PIN) === 0) return { ok: false, error: "Admin PIN cannot start with the user PIN" };
    var props = PropertiesService.getScriptProperties();
    props.setProperty("ADMIN_PIN_HASH", sha256_(newPin));
    props.setProperty("ADMIN_PIN_LEN", String(newPin.length));
    return { ok: true, adminPinLen: newPin.length };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

function defaultLeaveTypes_() {
  return DEFAULT_GLOBAL_LEAVE_TYPES;
}

function defaultApprovers_() {
  return DEFAULT_GLOBAL_APPROVERS;
}

function formatPhotoUrl_(raw) {
  if (!raw) return "";
  var str = String(raw).trim();
  if (!str) return "";

  // Handle formula like =IMAGE("https://...")
  var urlMatch = str.match(/https?:\/\/[^\s"')>]+/);
  if (urlMatch && urlMatch[0]) {
    str = urlMatch[0];
  }

  var fileId = extractDriveFileId_(str);
  if (fileId) {
    return "https://drive.google.com/thumbnail?id=" + fileId + "&sz=w1000";
  }

  if (str.indexOf("dropbox.com") !== -1) {
    return str.replace(/\?dl=0/, "?raw=1").replace(/\?dl=1/, "?raw=1");
  }

  return str;
}

function extractDriveFileId_(url) {
  if (!url) return "";
  var str = String(url).trim();
  if (!str) return "";

  var m = str.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
          str.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
          str.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
          str.match(/drive\.google\.com\/open\?.*id=([a-zA-Z0-9_-]+)/) ||
          str.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
  if (m && m[1]) return m[1];

  if (/^[a-zA-Z0-9_-]{25,60}$/.test(str)) return str;
  return "";
}

// ---------- তারিখ: শুধু yyyy-MM-dd / yyyy-MM-dd HH:mm ----------
function dayStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
  var s = String(v || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, APP_CONFIG.TIMEZONE, "yyyy-MM-dd");
}

function stampStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, APP_CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm");
  var s = String(v || "");
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 16);
  var d = new Date(s);
  return isNaN(d.getTime()) ? s : Utilities.formatDate(d, APP_CONFIG.TIMEZONE, "yyyy-MM-dd HH:mm");
}

// ---------- কোম্পানির লোগো (অ্যাডমিন থেকে সেট) ----------
function getLogo_() {
  var props = PropertiesService.getScriptProperties();
  var n = Number(props.getProperty("LOGO_N")) || 0, out = "";
  for (var i = 0; i < n; i++) out += props.getProperty("LOGO_" + i) || "";
  return out;
}

function setLogo(dataUrl, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    dataUrl = String(dataUrl || "");
    if (dataUrl && (dataUrl.indexOf("data:image/") !== 0 || dataUrl.length > 60000)) return { ok: false, error: "Logo is too large" };
    var props = PropertiesService.getScriptProperties();
    var old = Number(props.getProperty("LOGO_N")) || 0;
    for (var i = 0; i < old; i++) props.deleteProperty("LOGO_" + i);
    var n = 0;
    for (var p = 0; p < dataUrl.length; p += 8000) { props.setProperty("LOGO_" + n, dataUrl.slice(p, p + 8000)); n++; }
    props.setProperty("LOGO_N", String(n));
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}


// ---------- ক্রমিক নম্বর (Serial) ----------
function setEmployeeSerial(employeeId, newSl, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    var sheet = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
    var data = sheet.getDataRange().getValues();
    var list = [];
    for (var i = 1; i < data.length; i++) {
      if (!data[i][4]) continue;
      list.push({ row: i + 1, id: String(data[i][4]), sl: Number(data[i][0]) || i, idx: i });
    }
    list.sort(function(a, b) { return (a.sl - b.sl) || (a.idx - b.idx); });
    var from = -1;
    for (var k = 0; k < list.length; k++) if (list[k].id === String(employeeId)) from = k;
    if (from < 0) return { ok: false, error: "Employee not found" };
    var to = Math.max(0, Math.min(list.length - 1, Number(newSl) - 1));
    var item = list.splice(from, 1)[0];
    list.splice(to, 0, item);
    for (var n = 0; n < list.length; n++) sheet.getRange(list[n].row, 1).setValue(n + 1);
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// ---------- প্রিন্টের জন্য কর্মীর ছবি (base64) ----------
function getPhotosData() {
  var out = {};
  var cache = CacheService.getScriptCache();
  getEmployees_().forEach(function(e) {
    if (!e.photo) return;
    var key = "ph_" + e.employeeId + "_" + e.photo.length;
    var hit = cache.get(key);
    if (hit) { out[e.employeeId] = hit; return; }
    try {
      var blob = null, id = extractDriveFileId_(e.photo);
      if (id) {
        var f = DriveApp.getFileById(id);
        blob = f.getThumbnail() || f.getBlob();
      } else {
        blob = UrlFetchApp.fetch(e.photo, { muteHttpExceptions: true }).getBlob();
      }
      if (blob) {
        var data = "data:" + (blob.getContentType() || "image/jpeg") + ";base64," + Utilities.base64Encode(blob.getBytes());
        if (data.length < 90000) { cache.put(key, data, 21600); out[e.employeeId] = data; }
      }
    } catch (err) {}
  });
  return { ok: true, photos: out };
}

// ---------- নতুন আবেদনের ইমেইল নোটিফিকেশন (ফোনের নোটিফিকেশন বারে আসে) ----------
function sendNotifyMail_(subject, body) {
  try {
    var to = PropertiesService.getScriptProperties().getProperty("NOTIFY_EMAILS") || "";
    if (to) MailApp.sendEmail(to, "SCS Leave: " + subject, body);
  } catch (err) {}
}

function setNotifyEmails(emails, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    PropertiesService.getScriptProperties().setProperty("NOTIFY_EMAILS", String(emails || "").trim());
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// ---------- সিরিয়াল ক্রম একসাথে সেভ ----------
function saveSerialOrder(orderedIds, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    var sheet = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
    var data = sheet.getDataRange().getValues();
    var rowOf = {};
    for (var i = 1; i < data.length; i++) if (data[i][4]) rowOf[String(data[i][4])] = i + 1;
    (orderedIds || []).forEach(function(id, n) {
      if (rowOf[String(id)]) sheet.getRange(rowOf[String(id)], 1).setValue(n + 1);
    });
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}


// ---------- সিগনেচার ও ইনিশিয়াল (কর্মী: emp:ID, অ্যাপ্রুভার: apr:নাম) ----------
function getSignatures() {
  try {
    var sh = getSheet_("Signatures");
    if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, 3).setValues([["Key", "Signature", "Initial"]]);
    var data = sh.getDataRange().getValues(), out = {};
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) out[String(data[i][0])] = { s: String(data[i][1] || ""), i: String(data[i][2] || "") };
    }
    return { ok: true, sigs: out };
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// which: "s" = সিগনেচার, "i" = ইনিশিয়াল; ফাঁকা দিলে মুছে যায়
function setSignature(key, which, dataUrl, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    dataUrl = String(dataUrl || "");
    if (dataUrl && (dataUrl.indexOf("data:image/") !== 0 || dataUrl.length > 46000)) return { ok: false, error: "Image is too large" };
    var sh = getSheet_("Signatures");
    if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, 3).setValues([["Key", "Signature", "Initial"]]);
    var data = sh.getDataRange().getValues(), row = -1;
    for (var i = 1; i < data.length; i++) if (String(data[i][0]) === String(key)) row = i + 1;
    if (row < 0) { row = sh.getLastRow() + 1; sh.getRange(row, 1).setValue(String(key)); }
    sh.getRange(row, which === "i" ? 3 : 2).setValue(dataUrl);
    return getSignatures();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}


// ---------- অ্যাপ্রুভারের নাম এডিট / ক্রম ----------
function csvList_(v) {
  return String(v || "").split(",").map(function(x) { return x.trim(); }).filter(Boolean);
}

function mapColumn_(sheet, col, fn) {
  var last = sheet.getLastRow();
  if (last < 2) return;
  var rng = sheet.getRange(2, col, last - 1, 1);
  rng.setValues(rng.getValues().map(function(r) { return [fn(r[0])]; }));
}

// নাম বদলালে গ্লোবাল তালিকা, সব কর্মী, সব আবেদন ও সিগনেচার একসাথে বদলে যায়
function renameApprover(oldName, newName, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    oldName = String(oldName || "").trim();
    newName = String(newName || "").trim();
    if (!oldName || !newName) return { ok: false, error: "Name is required" };
    initializeSystem_();
    var swap = function(v) { return csvList_(v).map(function(x) { return x === oldName ? newName : x; }).join(", "); };
    var cfg = getSheet_(APP_CONFIG.CONFIG_SHEET);
    cfg.getRange("B3").setValue(swap(cfg.getRange("B3").getValue()));
    mapColumn_(getSheet_(APP_CONFIG.EMPLOYEE_SHEET), 9, swap);
    mapColumn_(getSheet_(APP_CONFIG.APPLICATION_SHEET), 14, swap);
    var sg = getSheet_("Signatures"), d = sg.getDataRange().getValues();
    for (var i = 1; i < d.length; i++) if (String(d[i][0]) === "apr:" + oldName) sg.getRange(i + 1, 1).setValue("apr:" + newName);
    try { formatApplicationSheet_(); updateLeaveRecordSheet_(); } catch (e) {}
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}

// অ্যাপ্রুভারদের ক্রম/নতুন নাম/মুছে ফেলা একসাথে সেভ
function saveApproverOrder(names, removed, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    names = (names || []).map(function(x) { return String(x).trim(); }).filter(Boolean);
    removed = (removed || []).map(function(x) { return String(x).trim(); });
    initializeSystem_();
    var rank = function(n) { var i = names.indexOf(n); return i < 0 ? 999 : i; };
    var sortBy = function(arr) { return arr.sort(function(a, b) { return rank(a) - rank(b); }); };
    getSheet_(APP_CONFIG.CONFIG_SHEET).getRange("B3").setValue(names.join(", "));
    mapColumn_(getSheet_(APP_CONFIG.EMPLOYEE_SHEET), 9, function(v) {
      return sortBy(csvList_(v).filter(function(x) { return removed.indexOf(x) < 0; })).join(", ");
    });
    mapColumn_(getSheet_(APP_CONFIG.APPLICATION_SHEET), 14, function(v) { return sortBy(csvList_(v)).join(", "); });
    return getBootstrapData();
  } catch (err) {
    return { ok: false, error: err.toString() };
  }
}


/* =====================================================================
 *  ব্যাকআপ / রিস্টোর / রিসেট (JSON) — Admin → Backup & Reset
 *  - লাইফটাইম: সব শিটের সব ডাটা + সব সেটিংস (অ্যাডমিন PIN, লোগো, ইমেইল, অটো ব্যাকআপ কনফিগ)
 *  - বছরভিত্তিক / মাসভিত্তিক / নির্দিষ্ট তারিখ: ঐ সময়ের আবেদন ও নোটিফিকেশন + কর্মী তালিকা
 *  - রিসেটের আগে লাইফটাইম ব্যাকআপ বাধ্যতামূলক (সার্ভার টোকেন দিয়ে যাচাই) + অ্যাডমিন PIN
 * ===================================================================== */
var SCS_BK = {
  APP: "SCS Leave Application",
  FORMAT: "scs-leave-backup",
  VERSION: 1,
  SIG_SHEET: "Signatures",
  EMP_COLS: 9,
  APP_COLS: 14,
  NOTE_COLS: 2,
  SIG_COLS: 3,
  RESET_TOKEN_MIN: 30   // লাইফটাইম ব্যাকআপের পর কত মিনিটের মধ্যে রিসেট করা যাবে
};

function bkCell_(v) {
  if (v instanceof Date) {
    var t = Utilities.formatDate(v, APP_CONFIG.TIMEZONE, "HH:mm:ss");
    return Utilities.formatDate(v, APP_CONFIG.TIMEZONE, t === "00:00:00" ? "yyyy-MM-dd" : "yyyy-MM-dd HH:mm:ss");
  }
  return v == null ? "" : v;
}

function bkRows_(name, cols) {
  var sh = getSheet_(name);
  if (sh.getLastRow() < 1) return { headers: [], rows: [] };
  var lc = Math.max(cols, 1);
  var all = sh.getRange(1, 1, sh.getLastRow(), lc).getValues();
  var headers = all[0].map(function(x) { return String(x || ""); });
  var rows = all.slice(1)
    .filter(function(r) { return r.some(function(c) { return c !== "" && c != null; }); })
    .map(function(r) { return r.map(bkCell_); });
  return { headers: headers, rows: rows };
}

function bkEnsureSigSheet_() {
  var sh = getSheet_(SCS_BK.SIG_SHEET);
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, 3).setValues([["Key", "Signature", "Initial"]]);
  return sh;
}

/** স্কোপ → তারিখের সীমা [from, to] (yyyy-MM-dd) */
function bkRange_(scope, opt) {
  opt = opt || {};
  if (scope === "year") {
    var y = String(opt.year || "").trim();
    if (!/^\d{4}$/.test(y)) throw new Error("Year is required");
    return [y + "-01-01", y + "-12-31"];
  }
  if (scope === "month") {
    var m = String(opt.month || "").trim();
    if (!/^\d{4}-\d{2}$/.test(m)) throw new Error("Month is required");
    var last = new Date(Number(m.slice(0, 4)), Number(m.slice(5, 7)), 0).getDate();
    return [m + "-01", m + "-" + ("0" + last).slice(-2)];
  }
  if (scope === "range") {
    var f = String(opt.from || "").slice(0, 10), t = String(opt.to || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || !/^\d{4}-\d{2}-\d{2}$/.test(t)) throw new Error("From and To dates are required");
    if (f > t) { var x = f; f = t; t = x; }
    return [f, t];
  }
  return null;
}

/** সব সেটিংস (Script Properties) — লাইফটাইম ব্যাকআপে যায় */
function bkSettings_() {
  var p = PropertiesService.getScriptProperties();
  var abCfg = p.getProperty(SCS_AB.KEY) || "";
  return {
    ADMIN_PIN_HASH: p.getProperty("ADMIN_PIN_HASH") || "",
    ADMIN_PIN_LEN: p.getProperty("ADMIN_PIN_LEN") || "",
    NOTIFY_EMAILS: p.getProperty("NOTIFY_EMAILS") || "",
    BACKUP_FOLDER_ID: p.getProperty(SCS_AB.FOLDER_KEY) || "",
    AUTO_BACKUP_CONFIG: abCfg,
    LOGO: getLogo_()
  };
}

/** পূর্ণ বা আংশিক ব্যাকআপ অবজেক্ট তৈরি */
function bkBuild_(scope, opt) {
  initializeSystem_();
  scope = (scope === "year" || scope === "month" || scope === "range") ? scope : "all";
  var rg = bkRange_(scope, opt);
  var emp = bkRows_(APP_CONFIG.EMPLOYEE_SHEET, SCS_BK.EMP_COLS);
  var apps = bkRows_(APP_CONFIG.APPLICATION_SHEET, SCS_BK.APP_COLS);
  var notes = bkRows_(APP_CONFIG.NOTIFICATION_SHEET, SCS_BK.NOTE_COLS);
  var out = {
    app: SCS_BK.APP, format: SCS_BK.FORMAT, version: SCS_BK.VERSION, scope: scope,
    exportedAt: new Date().toISOString(),
    exportedAtLocal: nowDhaka_(),
    spreadsheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    data: { employees: emp }
  };
  if (rg) {
    out.from = rg[0]; out.to = rg[1];
    if (scope === "year") out.year = rg[0].slice(0, 4);
    if (scope === "month") out.month = rg[0].slice(0, 7);
    // আবেদনের ছুটির সময়কাল (From–To) এই সীমার সাথে মিললে আসবে; তারিখ না থাকলে আবেদনের সময় দেখা হয়
    apps.rows = apps.rows.filter(function(r) {
      var f = String(r[6] || "").slice(0, 10), t = String(r[7] || "").slice(0, 10), ts = String(r[0] || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) f = ts;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) t = f;
      return f && f <= rg[1] && t >= rg[0];
    });
    notes.rows = notes.rows.filter(function(r) {
      var d = String(r[0] || "").slice(0, 10);
      return d >= rg[0] && d <= rg[1];
    });
  } else {
    out.data.signatures = bkRows_(SCS_BK.SIG_SHEET, SCS_BK.SIG_COLS);
    var cfg = getGlobalConfig_();
    out.data.config = { leaveTypes: cfg.leaveTypes, approvers: cfg.approvers };
    out.settings = bkSettings_();
  }
  out.data.applications = apps;
  out.data.notifications = notes;
  out.counts = {
    employees: emp.rows.length,
    applications: apps.rows.length,
    notifications: notes.rows.length,
    signatures: out.data.signatures ? out.data.signatures.rows.length : 0
  };
  return out;
}

function bkLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try { return fn(); } finally { lock.releaseLock(); }
}

/**
 * ক্লায়েন্ট ডাউনলোডের জন্য ব্যাকআপ (JSON স্ট্রিং)।
 * scope: all | year | month | range ; opt: {year, month, from, to}
 * লাইফটাইম ব্যাকআপ নিলে রিসেটের টোকেন ফেরত আসে (৩০ মিনিট বৈধ)।
 */
function getBackupJson(scope, opt, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    var b = bkBuild_(scope, opt);
    var json = JSON.stringify(b, null, 2);
    var res = { ok: true, json: json, scope: b.scope, counts: b.counts, from: b.from || "", to: b.to || "" };
    if (b.scope === "all") {
      var token = Utilities.getUuid();
      PropertiesService.getScriptProperties().setProperty("RESET_TOKEN", token + "|" + Date.now());
      res.resetToken = token;
    }
    return res;
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/** ফাইল যাচাই */
function bkParse_(json) {
  var o = typeof json === "string" ? JSON.parse(json) : json;
  if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("JSON object expected");
  if (o.app && o.app !== SCS_BK.APP) throw new Error("This backup belongs to another app: " + o.app);
  if (o.format !== SCS_BK.FORMAT || !o.data || typeof o.data !== "object") throw new Error("Not a valid SCS Leave backup file");
  return o;
}

/** "01711..." বা "+880..." জাতীয় টেক্সট যেন শিটে নম্বর হয়ে শুরুর শূন্য হারিয়ে না যায় */
function bkSafe_(v) {
  if (typeof v === "string" && /^(0\d+|\+\d+)$/.test(v)) return "'" + v;
  return v == null ? "" : v;
}
function bkSafeRows_(rows) { return rows.map(function(r) { return r.map(bkSafe_); }); }

function bkRowsOf_(block, cols) {
  if (!block || !Array.isArray(block.rows)) return [];
  return block.rows.filter(function(r) { return Array.isArray(r); }).map(function(r) {
    var x = r.slice(0, cols);
    while (x.length < cols) x.push("");
    return x.map(function(c) { return c == null ? "" : c; });
  });
}

/** শিটের ডাটা সারি (হেডার বাদে) পড়া */
function bkSheetRows_(sh, cols) {
  var last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, cols).getValues();
}

/** শিটের ডাটা সারি পুরোপুরি বদলে লেখা (হেডার থাকে) */
function bkWriteRows_(sh, cols, rows, headers) {
  if (sh.getLastRow() < 1 && headers && headers.length) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  var last = sh.getLastRow();
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, Math.max(cols, sh.getLastColumn())).clearContent();
    sh.getRange(2, 1, last - 1, Math.max(cols, sh.getLastColumn())).clearFormat();
  }
  if (rows.length) sh.getRange(2, 1, rows.length, cols).setValues(bkSafeRows_(rows));
  var extra = sh.getMaxRows() - (rows.length + 1);
  if (extra > 50) sh.deleteRows(rows.length + 2, extra - 20);
}

/** একটা কী (key) কলাম ধরে মার্জ: একই কী থাকলে বদলাবে, না থাকলে নতুন সারি */
function bkUpsert_(sh, cols, keyIdx, rows) {
  var cur = bkSheetRows_(sh, cols), pos = {}, added = 0, updated = 0;
  cur.forEach(function(r, i) { var k = String(r[keyIdx] || ""); if (k) pos[k] = i; });
  rows.forEach(function(r) {
    var k = String(r[keyIdx] || "");
    if (!k) return;
    if (pos[k] != null) { cur[pos[k]] = r; updated++; }
    else { pos[k] = cur.length; cur.push(r); added++; }
  });
  if (cur.length) sh.getRange(2, 1, cur.length, cols).setValues(bkSafeRows_(cur));
  return { added: added, updated: updated };
}

/**
 * ব্যাকআপ ফাইল থেকে রিস্টোর।
 * mode: "merge" (প্রস্তাবিত) বা "replace" (শুধু লাইফটাইম ফাইলে — বর্তমান সব ডাটা সরে গিয়ে ফাইলের ডাটা বসবে)
 * opts: { withSettings: bool, withPin: bool }
 */
function restoreBackupJson(json, mode, opts, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    opts = opts || {};
    var b = bkParse_(json);
    mode = mode === "replace" ? "replace" : "merge";
    if (mode === "replace" && b.scope !== "all") return { ok: false, error: "Full replace is allowed only with a lifetime backup file" };
    var safety = "";
    try { safety = abSaveFile_(bkBuild_("all"), "before-restore").name; } catch (e) { safety = ""; }
    var report = bkLock_(function() {
      initializeSystem_();
      var empSh = getSheet_(APP_CONFIG.EMPLOYEE_SHEET);
      var appSh = getSheet_(APP_CONFIG.APPLICATION_SHEET);
      var noteSh = getSheet_(APP_CONFIG.NOTIFICATION_SHEET);
      var sigSh = bkEnsureSigSheet_();
      var emp = bkRowsOf_(b.data.employees, SCS_BK.EMP_COLS);
      var apps = bkRowsOf_(b.data.applications, SCS_BK.APP_COLS);
      var notes = bkRowsOf_(b.data.notifications, SCS_BK.NOTE_COLS);
      var sigs = bkRowsOf_(b.data.signatures, SCS_BK.SIG_COLS);
      var r = { employees: emp.length, applications: apps.length, notifications: notes.length, signatures: sigs.length, settings: 0 };
      if (mode === "replace") {
        bkWriteRows_(empSh, SCS_BK.EMP_COLS, emp);
        bkWriteRows_(appSh, SCS_BK.APP_COLS, apps);
        bkWriteRows_(noteSh, SCS_BK.NOTE_COLS, notes);
        if (b.data.signatures) bkWriteRows_(sigSh, SCS_BK.SIG_COLS, sigs);
      } else {
        bkUpsert_(empSh, SCS_BK.EMP_COLS, 4, emp);
        bkUpsert_(appSh, SCS_BK.APP_COLS, 1, apps);
        if (sigs.length) bkUpsert_(sigSh, SCS_BK.SIG_COLS, 0, sigs);
        // নোটিফিকেশন: যেগুলো নেই শুধু সেগুলো যোগ হবে, তারপর সময় অনুযায়ী সাজানো
        var have = {};
        bkSheetRows_(noteSh, SCS_BK.NOTE_COLS).forEach(function(x) { have[String(bkCell_(x[0])) + "|" + String(x[1])] = 1; });
        var add = notes.filter(function(x) { return !have[String(x[0]) + "|" + String(x[1])]; });
        if (add.length) {
          noteSh.getRange(noteSh.getLastRow() + 1, 1, add.length, SCS_BK.NOTE_COLS).setValues(bkSafeRows_(add));
          if (noteSh.getLastRow() > 2) noteSh.getRange(2, 1, noteSh.getLastRow() - 1, SCS_BK.NOTE_COLS).sort({ column: 1, ascending: true });
        }
        r.notifications = add.length;
      }
      if (b.data.config && b.data.config.leaveTypes) {
        var cfg = getSheet_(APP_CONFIG.CONFIG_SHEET);
        cfg.getRange("B2").setValue(String(b.data.config.leaveTypes || defaultLeaveTypes_()));
        cfg.getRange("B3").setValue(String(b.data.config.approvers || defaultApprovers_()));
      }
      if (opts.withSettings && b.settings && typeof b.settings === "object") r.settings = bkApplySettings_(b.settings, !!opts.withPin);
      return r;
    });
    formatEmployeeSheet_();
    formatApplicationSheet_();
    updateLeaveRecordSheet_();
    addNotification_("Backup restored (" + mode + ", " + (b.scope || "") + ")");
    var boot = getBootstrapData();
    boot.restore = report;
    boot.safetyFile = safety;
    return boot;
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function bkApplySettings_(s, withPin) {
  var p = PropertiesService.getScriptProperties(), n = 0;
  if (withPin && /^[0-9a-f]{64}$/.test(String(s.ADMIN_PIN_HASH || "")) && /^[4-8]$/.test(String(s.ADMIN_PIN_LEN || ""))) {
    p.setProperty("ADMIN_PIN_HASH", String(s.ADMIN_PIN_HASH));
    p.setProperty("ADMIN_PIN_LEN", String(s.ADMIN_PIN_LEN));
    n += 2;
  } else if (withPin && s.ADMIN_PIN_HASH === "") {
    // ব্যাকআপের সময় ডিফল্ট PIN চালু ছিল → ডিফল্ট PIN-এ ফেরা
    p.deleteProperty("ADMIN_PIN_HASH");
    p.deleteProperty("ADMIN_PIN_LEN");
    n += 2;
  }
  if (s.NOTIFY_EMAILS != null) { p.setProperty("NOTIFY_EMAILS", String(s.NOTIFY_EMAILS || "")); n++; }
  if (s.BACKUP_FOLDER_ID) { p.setProperty(SCS_AB.FOLDER_KEY, String(s.BACKUP_FOLDER_ID)); n++; }
  var logo = String(s.LOGO || "");
  if (logo && logo.indexOf("data:image/") === 0 && logo.length <= 60000) {
    var old = Number(p.getProperty("LOGO_N")) || 0;
    for (var i = 0; i < old; i++) p.deleteProperty("LOGO_" + i);
    var k = 0;
    for (var q = 0; q < logo.length; q += 8000) { p.setProperty("LOGO_" + k, logo.slice(q, q + 8000)); k++; }
    p.setProperty("LOGO_N", String(k));
    n++;
  }
  if (s.AUTO_BACKUP_CONFIG) {
    try { JSON.parse(s.AUTO_BACKUP_CONFIG); p.setProperty(SCS_AB.KEY, String(s.AUTO_BACKUP_CONFIG)); abInstallTrigger_(abConfig_()); n++; } catch (e) {}
  }
  return n;
}

/**
 * সম্পূর্ণ রিসেট। শর্ত: (১) ৩০ মিনিটের মধ্যে নেওয়া লাইফটাইম ব্যাকআপের টোকেন, (২) অ্যাডমিন PIN।
 * what: "leave" = শুধু আবেদন + নোটিফিকেশন + লিভ রেকর্ড; "all" = সাথে কর্মী তালিকা ও সিগনেচারও
 * সেটিংস (অ্যাডমিন PIN, লোগো, লিভ টাইপ, অ্যাপ্রুভার, ইমেইল) থাকে।
 */
function resetAllData(adminPin, resetToken, what) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    var p = PropertiesService.getScriptProperties();
    var saved = String(p.getProperty("RESET_TOKEN") || "").split("|");
    var fresh = saved[0] && saved[0] === String(resetToken || "") && (Date.now() - Number(saved[1] || 0)) < SCS_BK.RESET_TOKEN_MIN * 60000;
    if (!fresh) return { ok: false, error: "Take a fresh lifetime backup first (valid for " + SCS_BK.RESET_TOKEN_MIN + " minutes)" };
    p.deleteProperty("RESET_TOKEN");
    what = what === "all" ? "all" : "leave";
    var safety = "";
    try { safety = abSaveFile_(bkBuild_("all"), "before-reset").name; } catch (e) { safety = ""; }
    bkLock_(function() {
      initializeSystem_();
      bkWriteRows_(getSheet_(APP_CONFIG.APPLICATION_SHEET), SCS_BK.APP_COLS, []);
      bkWriteRows_(getSheet_(APP_CONFIG.NOTIFICATION_SHEET), SCS_BK.NOTE_COLS, []);
      if (what === "all") {
        bkWriteRows_(getSheet_(APP_CONFIG.EMPLOYEE_SHEET), SCS_BK.EMP_COLS, []);
        bkWriteRows_(bkEnsureSigSheet_(), SCS_BK.SIG_COLS, []);
      }
    });
    formatEmployeeSheet_();
    formatApplicationSheet_();
    updateLeaveRecordSheet_();
    addNotification_("Database reset by admin (" + (what === "all" ? "all data" : "leave data") + ")");
    var boot = getBootstrapData();
    boot.safetyFile = safety;
    return boot;
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}


/* =====================================================================
 *  GOOGLE DRIVE AUTO BACKUP (JSON) — Admin থেকে চালু/বন্ধ ও সময় নির্ধারণ
 * ===================================================================== */
var SCS_AB = {
  KEY: "AUTO_BACKUP_CONFIG",
  STATE: "AUTO_BACKUP_STATE",
  FOLDER_KEY: "BACKUP_FOLDER_ID",
  HANDLER: "scsLeaveAutoBackupTick",
  FOLDER: "SCS Leave Auto Backup",
  PREFIX: "SCS_Leave_Backup_",
  INTERVALS: { "1m": 1, "2m": 2, "5m": 5, "15m": 15, "30m": 30, "1h": 60, "6h": 360, "12h": 720, "1d": 1440 },
  DEFAULT: { enabled: true, interval: "1h", keepMode: "days", keepValue: 30, onlyChanged: true }
};

function abProps_() { return PropertiesService.getScriptProperties(); }

function abConfig_() {
  var cfg = {};
  Object.keys(SCS_AB.DEFAULT).forEach(function(k) { cfg[k] = SCS_AB.DEFAULT[k]; });
  try { var saved = JSON.parse(String(abProps_().getProperty(SCS_AB.KEY) || "{}")); Object.keys(saved).forEach(function(k) { cfg[k] = saved[k]; }); } catch (e) {}
  if (!SCS_AB.INTERVALS[cfg.interval]) cfg.interval = SCS_AB.DEFAULT.interval;
  cfg.keepMode = cfg.keepMode === "count" ? "count" : "days";
  cfg.keepValue = Math.max(1, Math.min(5000, Math.round(Number(cfg.keepValue) || SCS_AB.DEFAULT.keepValue)));
  cfg.enabled = cfg.enabled === true || String(cfg.enabled) === "true";
  cfg.onlyChanged = !(cfg.onlyChanged === false || String(cfg.onlyChanged) === "false");
  return cfg;
}
function abState_() {
  try { return JSON.parse(String(abProps_().getProperty(SCS_AB.STATE) || "{}")) || {}; } catch (e) { return {}; }
}
function abSaveState_(st) { abProps_().setProperty(SCS_AB.STATE, JSON.stringify(st || {})); }

/** ব্যাকআপ ফোল্ডার: Admin-এ দেওয়া ফোল্ডারের ভেতরে "SCS Leave Auto Backup"; না দিলে শিট যে ফোল্ডারে আছে সেখানে */
function abFolder_() {
  var parent = null;
  var id = String(abProps_().getProperty(SCS_AB.FOLDER_KEY) || "").trim();
  if (id) { try { parent = DriveApp.getFolderById(id); } catch (e) { parent = null; } }
  if (!parent) {
    var it = DriveApp.getFileById(SpreadsheetApp.getActiveSpreadsheet().getId()).getParents();
    parent = it.hasNext() ? it.next() : DriveApp.getRootFolder();
  }
  var sub = parent.getFoldersByName(SCS_AB.FOLDER);
  return sub.hasNext() ? sub.next() : parent.createFolder(SCS_AB.FOLDER);
}

function abTriggerExists_() {
  return ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === SCS_AB.HANDLER; });
}
function abRemoveTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function(t) { if (t.getHandlerFunction() === SCS_AB.HANDLER) ScriptApp.deleteTrigger(t); });
}
/** সময় অনুযায়ী ট্রিগার: ১/২ মিনিট → প্রতি ১ মিনিটে চেক, ৫/১৫/৩০ → সেই মিনিটে, বাকিগুলো → প্রতি ঘন্টায় চেক */
function abInstallTrigger_(cfg) {
  abRemoveTriggers_();
  if (!cfg.enabled) return;
  var b = ScriptApp.newTrigger(SCS_AB.HANDLER).timeBased();
  var m = SCS_AB.INTERVALS[cfg.interval];
  if (m <= 2) b.everyMinutes(1);
  else if (m === 5) b.everyMinutes(5);
  else if (m === 15) b.everyMinutes(15);
  else if (m === 30) b.everyMinutes(30);
  else b.everyHours(1);
  b.create();
}
/** ওয়েব অ্যাপ খুললেই (doGet) ট্রিগার আছে কি না দেখে নেয় — তাই ডিফল্টভাবে অটো ব্যাকআপ চালু থাকে */
function ensureAutoBackup_() {
  try {
    var cfg = abConfig_();
    var has = abTriggerExists_();
    if (cfg.enabled && !has) abInstallTrigger_(cfg);
    if (!cfg.enabled && has) abRemoveTriggers_();
  } catch (e) {}
}

function getAutoBackupConfig() {
  var cfg = abConfig_(), st = abState_();
  var out = { ok: true, enabled: cfg.enabled, interval: cfg.interval, keepMode: cfg.keepMode, keepValue: cfg.keepValue, onlyChanged: cfg.onlyChanged,
    lastRun: st.lastRun || "", lastFile: st.lastFile || "", lastFileUrl: st.lastFileUrl || "", lastError: st.lastError || "",
    lastCheck: st.lastCheck || "", triggerOn: false, folderId: String(abProps_().getProperty(SCS_AB.FOLDER_KEY) || ""),
    folderName: "", folderUrl: "", files: [] };
  try { out.triggerOn = abTriggerExists_(); } catch (e) { out.lastError = out.lastError || ("Trigger: " + e.message); }
  try {
    var f = abFolder_();
    out.folderName = f.getName();
    out.folderUrl = f.getUrl();
    out.files = abListFiles_(f).slice(0, 15).map(function(x) {
      return { id: x.file.getId(), name: x.name, url: x.url, size: x.size, created: x.created.toISOString() };
    });
  } catch (e) { out.lastError = out.lastError || ("Drive: " + e.message); }
  return out;
}

function saveAutoBackupConfig(cfg, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    cfg = cfg || {};
    var old = abConfig_();
    var clean = {
      enabled: !!cfg.enabled,
      interval: SCS_AB.INTERVALS[cfg.interval] ? String(cfg.interval) : old.interval,
      keepMode: cfg.keepMode === "count" ? "count" : "days",
      keepValue: Math.max(1, Math.min(5000, Math.round(Number(cfg.keepValue) || old.keepValue))),
      onlyChanged: cfg.onlyChanged !== false
    };
    if (cfg.folderId != null) {
      var fid = String(cfg.folderId || "").trim();
      var m = fid.match(/folders\/([a-zA-Z0-9_-]+)/) || fid.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (m) fid = m[1];
      if (fid) {
        try { DriveApp.getFolderById(fid).getName(); } catch (e) { return { ok: false, error: "Drive folder not found or no access" }; }
        abProps_().setProperty(SCS_AB.FOLDER_KEY, fid);
      } else abProps_().deleteProperty(SCS_AB.FOLDER_KEY);
    }
    abProps_().setProperty(SCS_AB.KEY, JSON.stringify(clean));
    abInstallTrigger_(clean);
    addNotification_("Auto backup " + (clean.enabled ? "ON (" + clean.interval + ")" : "OFF"));
    return getAutoBackupConfig();
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

function abListFiles_(folder) {
  var it = folder.getFiles(), list = [];
  while (it.hasNext()) {
    var f = it.next();
    var n = f.getName();
    if (n.indexOf(SCS_AB.PREFIX) !== 0 || !/\.json$/i.test(n)) continue;
    list.push({ file: f, name: n, url: f.getUrl(), size: f.getSize(), created: f.getDateCreated() });
  }
  list.sort(function(a, b) { return b.created.getTime() - a.created.getTime(); });
  return list;
}

/** দ্রুত যাচাই: সময় বাদে পুরো ডাটার হ্যাশ — কিছু বদলেছে কি না */
function abPrint_(payload) {
  var copy = {};
  Object.keys(payload).forEach(function(k) { if (k !== "exportedAt" && k !== "exportedAtLocal") copy[k] = payload[k]; });
  return sha256_(JSON.stringify(copy));
}

function abSaveFile_(payload, tag) {
  var folder = abFolder_();
  var name = SCS_AB.PREFIX + Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, "yyyy-MM-dd_HH-mm-ss") + (tag ? "_" + tag : "") + ".json";
  var file = folder.createFile(Utilities.newBlob(JSON.stringify(payload), "application/json", name));
  return { file: file, folder: folder, name: name };
}

function abRun_(force) {
  var cfg = abConfig_(), st = abState_();
  var payload = bkBuild_("all");
  var fingerprint = abPrint_(payload);
  var nowIso = new Date().toISOString();
  if (!force && cfg.onlyChanged && st.hash === fingerprint) {
    st.lastCheck = nowIso; st.lastError = "";
    abSaveState_(st);
    return { ok: true, skipped: true, reason: "unchanged" };
  }
  var saved = abSaveFile_(payload, "");
  var removed = abCleanup_(saved.folder, cfg, saved.file.getId());
  st.hash = fingerprint; st.lastRun = nowIso; st.lastCheck = nowIso; st.lastFile = saved.name; st.lastFileUrl = saved.file.getUrl(); st.lastError = "";
  abSaveState_(st);
  return { ok: true, skipped: false, file: { name: saved.name, url: saved.file.getUrl(), size: saved.file.getSize(), created: nowIso }, removed: removed };
}

/** পুরনো ফাইল ট্র্যাশে: দিন হিসেবে বা ফাইল সংখ্যা হিসেবে */
function abCleanup_(folder, cfg, keepId) {
  var list = abListFiles_(folder), removed = 0;
  var cutoff = Date.now() - cfg.keepValue * 86400000;
  list.forEach(function(x, i) {
    if (x.file.getId() === keepId) return;
    var drop = cfg.keepMode === "count" ? i >= cfg.keepValue : x.created.getTime() < cutoff;
    if (drop) { try { x.file.setTrashed(true); removed++; } catch (e) {} }
  });
  return removed;
}

/** ট্রিগার এই ফাংশন চালায় */
function scsLeaveAutoBackupTick() {
  var cfg = abConfig_();
  if (!cfg.enabled) { try { abRemoveTriggers_(); } catch (e) {} return "disabled"; }
  var st = abState_();
  var every = SCS_AB.INTERVALS[cfg.interval] * 60000;
  var lastT = st.lastCheck ? new Date(st.lastCheck).getTime() : 0;
  if (lastT && Date.now() - lastT < every - 20000) return "not-due";
  try {
    var r = abRun_(false);
    return r.skipped ? "unchanged" : "saved";
  } catch (e) {
    st.lastError = new Date().toISOString() + " — " + (e && e.message ? e.message : e);
    st.lastCheck = new Date().toISOString();
    try { abSaveState_(st); } catch (x) {}
    throw e;
  }
}

/** Admin → "Backup Now" বাটন */
function runAutoBackupNow(adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    var r = abRun_(true);
    var cfg = getAutoBackupConfig();
    cfg.run = r;
    return cfg;
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/** ড্রাইভের ব্যাকআপ ফাইল পড়া (রিস্টোরের জন্য) — শুধু ব্যাকআপ ফোল্ডারের ফাইল */
function getDriveBackupFile(fileId, adminPin) {
  try {
    if (!verifyAdminPin_(adminPin)) return { ok: false, error: "Invalid Admin PIN" };
    var f = DriveApp.getFileById(String(fileId || ""));
    var folderId = abFolder_().getId(), inside = false, it = f.getParents();
    while (it.hasNext()) if (it.next().getId() === folderId) inside = true;
    if (!inside || f.getName().indexOf(SCS_AB.PREFIX) !== 0) return { ok: false, error: "File is not in the backup folder" };
    return { ok: true, name: f.getName(), json: f.getBlob().getDataAsString("UTF-8") };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}

/** Apps Script এডিটর থেকে একবার চালান: Drive ও ট্রিগারের অনুমতি দেওয়া + প্রথম ব্যাকআপ */
function authorizeBackup() {
  DriveApp.getRootFolder();
  ScriptApp.getProjectTriggers();
  abInstallTrigger_(abConfig_());
  var r = abRun_(true);
  Logger.log("Auto backup ready: " + (r.file ? r.file.name : "ok"));
  return r;
}
