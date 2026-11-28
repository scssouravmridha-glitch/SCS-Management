/**
 * SCS Requisition Management System - Google Apps Script Backend
 * Swarup Construction Solution
 *
 * Instructions:
 * 1. Make a COPY of the Google Sheet for every new app (File > Make a copy).
 * 2. In the copied sheet: Extensions > Apps Script.
 * 3. Replace the content of Code.gs with this code.
 * 4. Create an HTML file named "Index" and paste the Index.html code into it.
 * 5. Deploy > New Deployment > Web app (Execute as: Me, Who has access: Anyone).
 * 6. Authorize permissions and copy the Web App URL.
 *
 * IMPORTANT: Never share one deployment / one script between different sheets.
 * Every sheet must have its own copy of the script and its own deployment URL.
 */

// Sheet Tab Names Constants
var SHEET_PRODUCTS = "Product List";
var SHEET_PROJECTS = "Project List";
var SHEET_REQUISITIONS = "Requisitions";
var SHEET_SETTINGS = "Settings";

// Drive root folder is configured PER SHEET from Admin > Drive Folder Setup
// (stored in the "Settings" tab). No hardcoded folder, so apps never share one.
var DEFAULT_DRIVE_FOLDER_ID = "";
var DEFAULT_DRIVE_FOLDER_URL = "";

// Explicit Drive scope triggers for Apps Script auto-detection:
// DriveApp.getRootFolder();
// DriveApp.createFolder("");
// DriveApp.createFile("", "");

/**
 * Spreadsheet resolver: the sheet this script is bound to.
 * (Optional fallback: Script Property SPREADSHEET_ID for standalone scripts.)
 */
function getSS_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('এই স্ক্রিপ্ট কোনো Google Sheet এর সাথে যুক্ত নয়। শিটের Extensions > Apps Script থেকে কোড বসান।');
}

/**
 * When no Drive folder is configured, use a separate folder per spreadsheet.
 */
function getDefaultRootFolder_() {
  var name = "Challans - " + getSS_().getName();
  var it = DriveApp.getRootFolder().getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(name);
}

/**
 * Web App Entrypoint (doGet)
 */
function doGet(e) {
  initSheets();

  var template = HtmlService.createTemplateFromFile("Index");
  template.appId = getSS_().getId();
  return template.evaluate()
    .setTitle("SCS Requisition Management")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag("viewport", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");
}

/**
 * Spreadsheet Menu on Open
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("📋 SCS Requisition")
    .addItem("🚀 Initialize / Verify All Sheets", "initSheetsWithFeedback")
    .addItem("🔑 Grant Google Drive Permission", "grantDriveAccess")
    .addItem("🧪 Test Drive Folder Upload", "testUploadChallanToDrive")
    .addItem("🔄 Reload Catalog & Projects", "initSheets")
    .addToUi();
}

/**
 * 🔑 1-CLICK GOOGLE DRIVE AUTHORIZATION
 */
function grantDriveAccess() {
  var root = DriveApp.getRootFolder();
  var folder = null;
  try {
    folder = getDefaultRootFolder_();
  } catch(e) {}
  var ss = getSS_();
  var msg = "✅ Google Drive Authorization Granted! Root: " + root.getName() + (folder ? (" | Default folder: " + folder.getName()) : "");
  Logger.log(msg);
  if (ss) ss.toast(msg, "Drive Authorized", 6);
  return msg;
}

/**
 * 🔑 ONE-CLICK GOOGLE DRIVE & SPREADSHEET AUTHORIZATION
 */
function authorizeDrivePermissions() {
  var diag = {
    driveAuthorized: false,
    rootAccessible: false,
    targetFolderAccessible: false,
    targetFolderName: "",
    message: ""
  };
  try {
    var root = DriveApp.getRootFolder();
    diag.driveAuthorized = true;
    diag.rootAccessible = true;
    diag.rootName = root.getName();
    Logger.log("✅ Google Drive Root is accessible: " + diag.rootName);

    try {
      var targetFolder = getDefaultRootFolder_();
      diag.targetFolderAccessible = true;
      diag.targetFolderName = targetFolder.getName();
      Logger.log("✅ Default Drive Folder is ready: '" + diag.targetFolderName + "'");
    } catch(fErr) {
      Logger.log("⚠️ Default Drive Folder not accessible: " + fErr.message);
    }

    var msg = diag.targetFolderAccessible
      ? "Drive authorized! Folder '" + diag.targetFolderName + "' is ready."
      : "Drive authorized! My Drive root will be used.";
    diag.message = msg;
    Logger.log("Summary: " + msg);

    try {
      var ss = getSS_();
      if (ss) ss.toast(msg, "Authorization Successful", 8);
    } catch(tErr) {}

    return { success: true, data: diag };
  } catch (err) {
    var errMsg = "Authorization Notice: " + (err.message || err.toString());
    Logger.log(errMsg);
    try {
      var ss2 = getSS_();
      if (ss2) ss2.toast(errMsg, "Drive Authorization", 8);
    } catch(tErr2) {}
    return {
      success: false,
      message: errMsg,
      help: "To authorize: When running in Apps Script, click 'Review Permissions' -> Choose your Google Account -> Click 'Advanced' -> Click 'Go to SCS Requisition (unsafe)' -> Click 'Allow'."
    };
  }
}

/**
 * Direct Test Upload to verify write permissions to the Drive folder
 */
function testUploadChallanToDrive() {
  try {
    var targetFolder = null;
    var folderPath = "";
    try {
      var configured = getSettingValue_("drive_folder_url");
      var fid = extractFolderId_(configured);
      targetFolder = fid ? DriveApp.getFolderById(fid) : getDefaultRootFolder_();
      folderPath = targetFolder.getName();
    } catch (e1) {
      Logger.log("Target folder not accessible, falling back to root folder...");
      targetFolder = DriveApp.getRootFolder();
      folderPath = "My Drive (Root)";
    }

    var groupFolder = getOrCreateSubfolder(targetFolder, "GROUP OF COMPANY");
    var testFile = groupFolder.createFile("PERMISSIONS_TEST.txt", "Drive write test successful at " + new Date().toISOString());
    var successMsg = "Success! Created test file in '" + folderPath + " > GROUP OF COMPANY'";
    Logger.log(successMsg);

    try {
      var ss = getSS_();
      if (ss) ss.toast(successMsg, "Drive Verified", 6);
    } catch(tErr) {}

    return { success: true, message: successMsg, fileUrl: testFile.getUrl(), fileId: testFile.getId() };
  } catch (err) {
    var errMsg = "Drive Test Failed: " + (err.message || err.toString());
    Logger.log(errMsg);
    try {
      var ss2 = getSS_();
      if (ss2) ss2.toast(errMsg, "Drive Error", 8);
    } catch(tErr2) {}
    return { success: false, message: errMsg };
  }
}

function initSheetsWithFeedback() {
  initSheets();
  getSS_().toast("Product List, Project List, and Requisitions sheets have been verified.", "Setup Completed", 6);
}

/**
 * Automatically create and format required sheets if they do not exist
 */
function initSheets() {
  var ss = getSS_();

  // 1. PRODUCT LIST SHEET (SL, Product Name, Unit)
  var prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  if (!prodSheet) {
    prodSheet = ss.insertSheet(SHEET_PRODUCTS);
    var prodHeaders = [["SL", "Product Name", "Unit"]];
    prodSheet.getRange(1, 1, 1, 3).setValues(prodHeaders);
    formatHeaderRow(prodSheet, 3, "#1e3a8a");
    prodSheet.setColumnWidth(1, 70);
    prodSheet.setColumnWidth(2, 320);
    prodSheet.setColumnWidth(3, 100);
  }

  // 2. PROJECT LIST SHEET (7 columns) - created EMPTY (no shared sample data)
  var projSheet = ss.getSheetByName(SHEET_PROJECTS);
  if (!projSheet) {
    projSheet = ss.insertSheet(SHEET_PROJECTS);
    var projHeaders = [["SL", "Project Type", "Group Name / Private Project", "Project Name", "Project Address", "Engineer Name", "Mobile Number"]];
    projSheet.getRange(1, 1, 1, 7).setValues(projHeaders);
    formatHeaderRow(projSheet, 7, "#0f172a");
    projSheet.setColumnWidth(1, 60);
    projSheet.setColumnWidth(2, 140);
    projSheet.setColumnWidth(3, 180);
    projSheet.setColumnWidth(4, 240);
    projSheet.setColumnWidth(5, 260);
    projSheet.setColumnWidth(6, 180);
    projSheet.setColumnWidth(7, 160);
  }

  // 3. REQUISITIONS SHEET
  var reqSheet = ss.getSheetByName(SHEET_REQUISITIONS);
  if (!reqSheet) {
    reqSheet = ss.insertSheet(SHEET_REQUISITIONS);
    var reqHeaders = [[
      "Challan No", "Date", "Project Type", "Group Name", "Project Name", "Project Address",
      "Requisition By", "Contact Number", "Engineer Name", "Engineer Mobile", "Items Summary",
      "Delivered Status", "Delivered Date", "Items Data JSON", "Submitted At"
    ]];
    reqSheet.getRange(1, 1, 1, reqHeaders[0].length).setValues(reqHeaders);
    formatHeaderRow(reqSheet, reqHeaders[0].length, "#1e293b");
    reqSheet.setColumnWidth(1, 140);
    reqSheet.setColumnWidth(2, 100);
    reqSheet.setColumnWidth(5, 200);
    reqSheet.setColumnWidth(11, 260);
  }

  // 4. SETTINGS SHEET
  var setSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!setSheet) {
    setSheet = ss.insertSheet(SHEET_SETTINGS);
    setSheet.getRange(1, 1, 1, 2).setValues([["Setting Key", "Setting Value"]]);
    formatHeaderRow(setSheet, 2, "#475569");
    setSheet.getRange(2, 1, 3, 2).setValues([
      ["seal_url", ""],
      ["app_title", "Swarup Construction Solution Requisitions"],
      ["drive_folder_url", DEFAULT_DRIVE_FOLDER_URL]
    ]);
  }
}

/**
 * Format sheet header row
 */
function formatHeaderRow(sheet, numCols, bgColor) {
  sheet.setFrozenRows(1);
  var range = sheet.getRange(1, 1, 1, numCols);
  range.setBackground(bgColor)
       .setFontColor("#ffffff")
       .setFontWeight("bold")
       .setFontSize(11)
       .setHorizontalAlignment("center")
       .setVerticalAlignment("middle");
  sheet.setRowHeight(1, 32);
}

/**
 * Format Bangladesh Mobile Number: 8801...
 */
function formatBangladeshMobile(input) {
  if (!input) return "";
  var str = String(input).trim();
  var digits = str.replace(/\D/g, "");
  if (!digits) return str;

  if (digits.indexOf("8801") === 0) return digits;
  if (digits.indexOf("01") === 0) return "88" + digits;
  if (digits.indexOf("1") === 0) return "880" + digits;
  if (digits.indexOf("88") === 0 && digits.length >= 12) return digits;
  if (digits.indexOf("880") === 0) return digits;

  return digits;
}

/**
 * Get Initial Data to bootstrap the web app
 */
function getInitialData() {
  initSheets();
  var ss = getSS_();

  // 1. Load Products
  var prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  var products = [];
  var lastProdRow = prodSheet.getLastRow();
  if (lastProdRow > 1) {
    var prodValues = prodSheet.getRange(2, 1, lastProdRow - 1, 3).getValues();
    for (var i = 0; i < prodValues.length; i++) {
      var name = String(prodValues[i][1] || "").trim();
      var unit = String(prodValues[i][2] || "").trim();
      if (name) {
        products.push({
          slNo: Number(prodValues[i][0]) || (i + 1),
          name: name,
          unit: unit || "Pcs"
        });
      }
    }
  }

  // 2. Load Projects (All 7 columns)
  var projSheet = ss.getSheetByName(SHEET_PROJECTS);
  var projects = [];
  var lastProjRow = projSheet.getLastRow();
  if (lastProjRow > 1) {
    var projValues = projSheet.getRange(2, 1, lastProjRow - 1, 7).getValues();
    for (var j = 0; j < projValues.length; j++) {
      var pType = String(projValues[j][1] || "").trim();
      var gName = String(projValues[j][2] || "").trim();
      var pName = String(projValues[j][3] || "").trim();
      if (pName) {
        projects.push({
          slNo: Number(projValues[j][0]) || (j + 1),
          projectType: pType.toLowerCase().indexOf("private") !== -1 ? "Private Project" : "Group Project",
          groupName: gName || (pType.toLowerCase().indexOf("private") !== -1 ? "Private Project" : "General Group"),
          projectName: pName,
          projectAddress: String(projValues[j][4] || "").trim(),
          engineerName: String(projValues[j][5] || "").trim(),
          mobileNumber: formatBangladeshMobile(projValues[j][6])
        });
      }
    }
  }

  // 3. Load Requisitions
  var reqSheet = ss.getSheetByName(SHEET_REQUISITIONS);
  var requisitions = [];
  var lastReqRow = reqSheet.getLastRow();
  if (lastReqRow > 1) {
    var reqValues = reqSheet.getRange(2, 1, lastReqRow - 1, 15).getValues();
    for (var k = 0; k < reqValues.length; k++) {
      var cNo = String(reqValues[k][0] || "").trim();
      if (cNo) {
        var rawJson = String(reqValues[k][13] || "");
        var parsedItems = [];
        try {
          if (rawJson) parsedItems = JSON.parse(rawJson);
        } catch (e) {
          parsedItems = [];
        }

        var isDelivered = String(reqValues[k][11] || "").toLowerCase() === "delivered" || String(reqValues[k][11] || "").toLowerCase() === "yes";

        requisitions.push({
          challanNo: cNo,
          date: formatDateString(reqValues[k][1]),
          projectType: String(reqValues[k][2] || "Group Project"),
          groupName: String(reqValues[k][3] || ""),
          projectName: String(reqValues[k][4] || ""),
          projectAddress: String(reqValues[k][5] || ""),
          requisitionBy: String(reqValues[k][6] || ""),
          contactNumber: String(reqValues[k][7] || ""),
          engineerName: String(reqValues[k][8] || ""),
          mobileNumber: formatBangladeshMobile(reqValues[k][9]),
          items: parsedItems,
          delivered: isDelivered,
          deliveredAt: reqValues[k][12] ? formatDateString(reqValues[k][12]) : undefined
        });
      }
    }
  }

  // 4. Load Settings
  var sealUrl = "";
  var driveFolderUrl = "";
  var setSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (setSheet && setSheet.getLastRow() > 1) {
    var setValues = setSheet.getRange(2, 1, setSheet.getLastRow() - 1, 2).getValues();
    for (var s = 0; s < setValues.length; s++) {
      var key = String(setValues[s][0]).trim();
      if (key === "seal_url") {
        sealUrl = String(setValues[s][1]).trim();
      } else if (key === "drive_folder_url") {
        driveFolderUrl = String(setValues[s][1]).trim();
      }
    }
  }

  return {
    appId: ss.getId(),
    products: products,
    projects: projects,
    requisitions: requisitions,
    sealUrl: sealUrl,
    driveFolderUrl: driveFolderUrl
  };
}

/**
 * Submit / Record a Requisition
 */
function submitRequisition(req) {
  if (typeof req === "string") {
    try {
      req = JSON.parse(req);
    } catch(e) {
      throw new Error("Invalid requisition data payload");
    }
  }

  // একসাথে দুইজন সাবমিট করলে যাতে একই চালান নম্বর না হয়
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (lockErr) {
    return { success: false, message: "Server is busy. Please try again in a few seconds." };
  }
  try {
    return submitRequisitionLocked_(req);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Today's date (yyyy-MM-dd) in the script's own time zone (not UTC)
 */
function todayString_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
}

/**
 * Next free challan number (SCSYYYYMM-NN) for the month of the given date
 */
function nextChallanNoForDate_(sheet, dateStr) {
  var m = String(dateStr || "").match(/^(\d{4})-(\d{2})/);
  var yyyymm = m ? (m[1] + m[2]) : todayString_().replace(/-/g, "").substring(0, 6);
  var prefix = "SCS" + yyyymm + "-";
  var alt = "SCS-" + yyyymm + "-";
  var highest = 0;
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var vals = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var c = String(vals[i][0] || "").trim();
      var part = null;
      if (c.indexOf(prefix) === 0) part = c.substring(prefix.length);
      else if (c.indexOf(alt) === 0) part = c.substring(alt.length);
      if (part !== null) {
        var n = parseInt(part, 10);
        if (!isNaN(n) && n > highest) highest = n;
      }
    }
  }
  var next = highest + 1;
  return prefix + (next < 10 ? "0" + next : String(next));
}

function submitRequisitionLocked_(req) {
  initSheets();
  var ss = getSS_();

  // 1. Auto-Add New Products to "Product List" if not present
  var prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
  var existingProducts = [];
  var lastProdRow = prodSheet.getLastRow();
  if (lastProdRow > 1) {
    var pRows = prodSheet.getRange(2, 2, lastProdRow - 1, 1).getValues();
    for (var i = 0; i < pRows.length; i++) {
      existingProducts.push(String(pRows[i][0]).toLowerCase().trim());
    }
  }

  if (Array.isArray(req.items)) {
    for (var it = 0; it < req.items.length; it++) {
      var itemObj = req.items[it];
      var itemName = String(itemObj.item || "").trim();
      var itemUnit = String(itemObj.unit || "Pcs").trim();
      if (itemName && existingProducts.indexOf(itemName.toLowerCase()) === -1) {
        var nextProdSl = prodSheet.getLastRow();
        prodSheet.appendRow([nextProdSl, itemName, itemUnit]);
        existingProducts.push(itemName.toLowerCase());
      }
    }
  }

  // 2. Auto-Add New Project to "Project List" under its specific group if not present
  var projSheet = ss.getSheetByName(SHEET_PROJECTS);
  var existingProjectKeys = [];
  var lastProjRow = projSheet.getLastRow();
  if (lastProjRow > 1) {
    var prRows = projSheet.getRange(2, 1, lastProjRow - 1, 7).getValues();
    for (var j = 0; j < prRows.length; j++) {
      var exGroup = String(prRows[j][2] || "").toLowerCase().trim();
      var exProj = String(prRows[j][3] || "").toLowerCase().trim();
      existingProjectKeys.push(exGroup + ":::" + exProj);
    }
  }

  var projName = String(req.projectName || "").trim();
  var isPrivateProj = (req.projectType === "Private Project") || (String(req.groupName || "").toLowerCase().indexOf("private") !== -1);
  var projectTypeLabel = isPrivateProj ? "Private Project" : "Group Project";
  var groupLabel = isPrivateProj ? "Private Project" : (String(req.groupName || "").trim() || "General Group");
  var targetProjKey = groupLabel.toLowerCase().trim() + ":::" + projName.toLowerCase().trim();

  if (projName && existingProjectKeys.indexOf(targetProjKey) === -1) {
    var nextProjSl = Math.max(1, projSheet.getLastRow());
    projSheet.appendRow([
      nextProjSl,
      projectTypeLabel,
      groupLabel,
      projName,
      req.projectAddress || "",
      req.engineerName || "",
      formatBangladeshMobile(req.mobileNumber || "")
    ]);
  }

  // 3. Save Requisition in "Requisitions"
  var reqSheet = ss.getSheetByName(SHEET_REQUISITIONS);

  // নতুন রিকুইজিশনের চালান নম্বর অন্য কেউ আগেই নিয়ে থাকলে পরের খালি নম্বর দেওয়া হবে
  // (আগে এক্ষেত্রে পুরনো চালানটি মুছে গিয়ে নতুনটা বসে যেত)
  var isNew = req.isNew === true;
  if (!req.challanNo || (isNew && findRequisitionRow(reqSheet, req.challanNo) > 0)) {
    req.challanNo = nextChallanNoForDate_(reqSheet, req.date || todayString_());
  }
  var itemsSummary = "";
  if (Array.isArray(req.items)) {
    itemsSummary = req.items.map(function(item) {
      return (item.item || "") + " (" + (item.qty || "") + " " + (item.unit || "") + ")";
    }).join("; ");
  }

  var formattedEngMobile = formatBangladeshMobile(req.mobileNumber || "");
  var formattedContactMobile = formatBangladeshMobile(req.contactNumber || "");

  var rowData = [
    req.challanNo,
    req.date || todayString_(),
    req.projectType || "Group Project",
    req.groupName || "",
    req.projectName || "",
    req.projectAddress || "",
    req.requisitionBy || "",
    formattedContactMobile,
    req.engineerName || "",
    formattedEngMobile,
    itemsSummary,
    req.delivered ? "Delivered" : "Pending",
    req.deliveredAt || "",
    JSON.stringify(req.items || []),
    new Date()
  ];

  var existingRowIndex = findRequisitionRow(reqSheet, req.challanNo);
  if (existingRowIndex > 0) {
    reqSheet.getRange(existingRowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    reqSheet.appendRow(rowData);
  }

  return {
    success: true,
    message: "Requisition recorded successfully",
    challanNo: req.challanNo,
    updatedData: getInitialData()
  };
}

function updateRequisition(req) {
  if (typeof req === "string") {
    try { req = JSON.parse(req); } catch (e) { throw new Error("Invalid requisition data payload"); }
  }
  // এডিট করা চালান শিটে না থাকলে (যেমন অন্য কেউ ডিলিট করেছে) নতুন সারি তৈরি করা হবে না
  var sheet = getSS_().getSheetByName(SHEET_REQUISITIONS);
  if (!sheet || findRequisitionRow(sheet, req.challanNo) <= 0) {
    return { success: false, message: "Challan " + req.challanNo + " not found. It may have been deleted or re-numbered. Please sync and try again.", updatedData: getInitialData() };
  }
  req.isNew = false;
  return submitRequisition(req);
}

/**
 * Settings helpers
 */
function getSettingValue_(key) {
  var setSheet = getSS_().getSheetByName(SHEET_SETTINGS);
  if (!setSheet || setSheet.getLastRow() <= 1) return "";
  var vals = setSheet.getRange(2, 1, setSheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === key) return String(vals[i][1]).trim();
  }
  return "";
}

function extractFolderId_(raw) {
  raw = String(raw || "").trim();
  if (!raw || raw.toLowerCase() === "root") return "";
  var match = raw.match(/folders\/([a-zA-Z0-9_-]+)/) ||
              raw.match(/id=([a-zA-Z0-9_-]+)/) ||
              raw.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match && match[1]) return match[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(raw)) return raw;
  return "";
}

/**
 * Mark a Requisition as Delivered and Auto-Upload PDF to Google Drive
 */
function markDelivered(challanNo) {
  var ss = getSS_();
  var reqSheet = ss.getSheetByName(SHEET_REQUISITIONS);
  var rowIndex = findRequisitionRow(reqSheet, challanNo);

  if (rowIndex <= 0) {
    return { success: false, message: "Challan " + challanNo + " not found" };
  }

  var today = todayString_();
  reqSheet.getRange(rowIndex, 12).setValue("Delivered");
  reqSheet.getRange(rowIndex, 13).setValue(today);

  var driveResult = null;
  try {
    var rowValues = reqSheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
    var parsedItems = [];
    try {
      if (rowValues[13]) parsedItems = JSON.parse(rowValues[13]);
    } catch(e) {}

    var req = {
      challanNo: String(rowValues[0] || challanNo),
      date: formatDateString(rowValues[1]),
      projectType: String(rowValues[2] || "Group Project"),
      groupName: String(rowValues[3] || ""),
      projectName: String(rowValues[4] || ""),
      projectAddress: String(rowValues[5] || ""),
      requisitionBy: String(rowValues[6] || ""),
      contactNumber: String(rowValues[7] || ""),
      engineerName: String(rowValues[8] || ""),
      mobileNumber: String(rowValues[9] || ""),
      items: parsedItems,
      delivered: true,
      deliveredAt: today
    };

    driveResult = uploadChallanPdfToDrive(req, getSettingValue_("drive_folder_url"), { sealUrl: getSettingValue_("seal_url") });
  } catch (driveErr) {
    console.error("Auto drive upload error:", driveErr);
  }

  return {
    success: true,
    message: "Challan marked as Delivered",
    challanNo: challanNo,
    deliveredAt: today,
    driveUpload: driveResult
  };
}

/**
 * Helper to get or create a subfolder without duplicating
 */
function getOrCreateSubfolder(parentFolder, name) {
  var cleanName = String(name || "Unnamed").trim();
  try {
    if (!parentFolder || typeof parentFolder.getFoldersByName !== "function") {
      return parentFolder;
    }
    var folders = parentFolder.getFoldersByName(cleanName);
    if (folders.hasNext()) {
      return folders.next();
    }
    return parentFolder.createFolder(cleanName);
  } catch (err) {
    Logger.log("Notice: Subfolder creation for '" + cleanName + "' skipped/failed: " + err.message);
    return parentFolder;
  }
}

/**
 * Upload Challan PDF to Google Drive
 * Hierarchy: Root Folder -> Group / Private -> [Group Name] -> [Project Name] -> [ChallanNo.pdf]
 */
function uploadChallanPdfToDrive(req, rootFolderUrlOrId, appSettings) {
  try {
    if (!req) return { success: false, message: "No requisition data provided" };
    if (typeof req === "string") {
      req = JSON.parse(req);
    }

    // Resolve Root Folder (configured per sheet; otherwise a per-sheet default folder)
    var rootFolder = null;
    var folderId = extractFolderId_(rootFolderUrlOrId);
    if (folderId) {
      try {
        rootFolder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        Logger.log("Specified Drive folder ID '" + folderId + "' not accessible: " + fErr.message);
      }
    }
    if (!rootFolder) {
      rootFolder = getDefaultRootFolder_();
    }

    var pType = String(req.projectType || "").toLowerCase();
    var gNameRaw = String(req.groupName || "").toLowerCase();
    var isPrivate = (pType.indexOf("private") !== -1) || (gNameRaw.indexOf("private") !== -1);

    var targetProjectFolder = rootFolder;
    var folderPath = "";
    var projectName = String(req.projectName || "General Project").trim();

    try {
      if (isPrivate) {
        var privateMainFolder = getOrCreateSubfolder(rootFolder, "PRIVATE PROJECT");
        targetProjectFolder = getOrCreateSubfolder(privateMainFolder, projectName);
        folderPath = "Root / PRIVATE PROJECT / " + projectName;
      } else {
        var groupMainFolder = getOrCreateSubfolder(rootFolder, "GROUP OF COMPANY");
        var groupName = String(req.groupName || "General Group").trim();
        var groupFolder = getOrCreateSubfolder(groupMainFolder, groupName);
        targetProjectFolder = getOrCreateSubfolder(groupFolder, projectName);
        folderPath = "Root / GROUP OF COMPANY / " + groupName + " / " + projectName;
      }
    } catch (hierErr) {
      Logger.log("Folder hierarchy creation notice: " + hierErr.message);
      targetProjectFolder = rootFolder;
      folderPath = rootFolder.getName();
    }

    // Overwrite previous file: trash old version(s), then upload the new one
    var cleanChallanNo = String(req.challanNo || "CHALLAN").trim();
    var fileName = cleanChallanNo + ".pdf";

    try {
      var existingFiles = targetProjectFolder.getFilesByName(fileName);
      while (existingFiles.hasNext()) {
        try {
          var oldFile = existingFiles.next();
          oldFile.setTrashed(true);
          Logger.log("Trashed previous version of " + fileName + " (ID: " + oldFile.getId() + ")");
        } catch (delErr) {
          Logger.log("Notice deleting old file: " + delErr.message);
        }
      }

      var existingAlt = targetProjectFolder.getFilesByName(cleanChallanNo);
      while (existingAlt.hasNext()) {
        try {
          var oldAlt = existingAlt.next();
          oldAlt.setTrashed(true);
          Logger.log("Trashed previous alt version of " + cleanChallanNo + " (ID: " + oldAlt.getId() + ")");
        } catch (delErr2) {
          Logger.log("Notice deleting old alt file: " + delErr2.message);
        }
      }
    } catch (dupErr) {
      Logger.log("Previous file delete notice: " + dupErr.message);
    }

    // Generate HTML & Convert to PDF Blob
    var htmlContent = buildChallanPdfHtml(req, appSettings);
    var pdfBlob = null;
    try {
      var htmlOutput = HtmlService.createHtmlOutput(htmlContent);
      pdfBlob = htmlOutput.getAs("application/pdf");
    } catch (pdfErr1) {
      Logger.log("HtmlService getAs pdf notice: " + pdfErr1.message);
      try {
        pdfBlob = Utilities.newBlob(htmlContent, "text/html", cleanChallanNo + ".html").getAs("application/pdf");
      } catch (pdfErr2) {
        Logger.log("Utilities getAs pdf fallback: " + pdfErr2.message);
        pdfBlob = Utilities.newBlob(htmlContent, "application/pdf", fileName);
      }
    }
    pdfBlob.setName(fileName);

    // Save to Folder with Safe Multi-Tier Fallback
    var file = null;
    try {
      file = targetProjectFolder.createFile(pdfBlob);
    } catch (createErr) {
      Logger.log("Primary file creation failed (" + createErr.message + "), falling back to root folder...");
      try {
        if (rootFolder && targetProjectFolder !== rootFolder) {
          file = rootFolder.createFile(pdfBlob);
          folderPath = rootFolder.getName();
        } else {
          file = DriveApp.createFile(pdfBlob);
          folderPath = "My Drive";
        }
      } catch (rootErr) {
        Logger.log("Root folder file creation failed, falling back to DriveApp.createFile...");
        file = DriveApp.createFile(pdfBlob);
        folderPath = "My Drive";
      }
    }

    return {
      success: true,
      duplicateSkipped: false,
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      fileName: fileName,
      folderPath: folderPath
    };
  } catch (err) {
    var rawErr = err.message || err.toString();
    var isPerm = rawErr.indexOf("permission") !== -1 || rawErr.indexOf("auth/drive") !== -1;
    var finalMsg = "Drive Upload Failed: " + rawErr;
    if (isPerm) {
      finalMsg += " (Permission issue: Please ensure Web App is deployed with 'Execute as: Me' and authorized)";
    }
    return { success: false, isPermissionError: isPerm, message: finalMsg };
  }
}

/**
 * Manual trigger to upload / re-upload any delivered challan to Google Drive
 */
function uploadDeliveredChallanToDrive(challanNo) {
  var ss = getSS_();
  var reqSheet = ss.getSheetByName(SHEET_REQUISITIONS);
  var rowIndex = findRequisitionRow(reqSheet, challanNo);

  if (rowIndex <= 0) {
    return { success: false, message: "Challan " + challanNo + " not found" };
  }

  var rowValues = reqSheet.getRange(rowIndex, 1, 1, 15).getValues()[0];
  var parsedItems = [];
  try {
    if (rowValues[13]) parsedItems = JSON.parse(rowValues[13]);
  } catch(e) {}

  var req = {
    challanNo: String(rowValues[0] || challanNo),
    date: formatDateString(rowValues[1]),
    projectType: String(rowValues[2] || "Group Project"),
    groupName: String(rowValues[3] || ""),
    projectName: String(rowValues[4] || ""),
    projectAddress: String(rowValues[5] || ""),
    requisitionBy: String(rowValues[6] || ""),
    contactNumber: String(rowValues[7] || ""),
    engineerName: String(rowValues[8] || ""),
    mobileNumber: String(rowValues[9] || ""),
    items: parsedItems,
    delivered: true,
    deliveredAt: formatDateString(rowValues[12]) || todayString_()
  };

  return uploadChallanPdfToDrive(req, getSettingValue_("drive_folder_url"), { sealUrl: getSettingValue_("seal_url") });
}

// ============================================================================
// ⚙️ CHALLAN PRINT & PDF UNIFIED CONFIGURATION (একক কনফিগারেশন)
// Index.html এর CHALLAN_LAYOUT_CONFIG এর সাথে হুবহু একই রাখুন।
// Letter size: উপরে 30mm, নিচে 22mm মার্জিন। ফুটার মার্জিনের 2mm উপরে ফিক্সড।
// ============================================================================
var CHALLAN_LAYOUT_CONFIG = {
  marginTop: '30mm',
  marginBottom: '22mm',
  marginLeft: '0.6in',
  marginRight: '0.6in',
  footerBottomOffset: '24mm',   // নিচের মার্জিন 22mm + 2mm গ্যাপ
  titleGapMm: 2,                // উপরের মার্জিন থেকে DELIVERY CHALLAN এর দূরত্ব

  // ---- অটো পেজিনেশনের হিসাব (দরকার হলে টিউন করবেন) ----
  rowHeightMm: 7,               // একলাইনের সারির উচ্চতা
  extraLineMm: 3.6,             // নাম/রিমার্ক ২ লাইন হলে অতিরিক্ত উচ্চতা
  nameCharsPerLine: 44,         // Description কলামে এক লাইনে প্রায় কত অক্ষর
  remarkCharsPerLine: 16,       // Remarks কলামে এক লাইনে প্রায় কত অক্ষর
  rowsAreaFirstMm: 134,         // ১ম পেজে সারি বসার জায়গা (সিলের উপর পর্যন্ত)
  rowsAreaNextMm: 154,          // পরের পেজগুলোতে সারি বসার জায়গা
  noteHeightMm: 12              // শেষ পেজে নোটের জায়গা
};

function paginateChallanItems(allItems) {
  var C = CHALLAN_LAYOUT_CONFIG;
  function rowH(it) {
    var nl = Math.max(1, Math.ceil(String(it.item || '').length / C.nameCharsPerLine));
    var rl = Math.max(1, Math.ceil(String(it.remark || '').length / C.remarkCharsPerLine));
    return C.rowHeightMm + (Math.max(nl, rl) - 1) * C.extraLineMm;
  }
  var pages = [], cur = [], used = 0, limit = C.rowsAreaFirstMm;
  (allItems || []).forEach(function(it) {
    var h = rowH(it);
    if (cur.length > 0 && used + h > limit) {
      pages.push(cur); cur = []; used = 0; limit = C.rowsAreaNextMm;
    }
    cur.push(it); used += h;
  });
  pages.push(cur);
  // শেষ পেজে নোট না ধরলে শেষ সারিটা নতুন পেজে পাঠাও
  if (used + C.noteHeightMm > limit && cur.length > 1) {
    pages.push([cur.pop()]);
  }
  return pages;
}

/**
 * Generate PDF-ready HTML for Challan (Letter, margins from CHALLAN_LAYOUT_CONFIG)
 */
function buildChallanPdfHtml(req, appSettings) {
  var sealHtml = "";
  if (appSettings && appSettings.sealUrl) {
    var sUrl = String(appSettings.sealUrl).trim();
    if (sUrl.indexOf("drive.google.com") !== -1) {
      var matchId = sUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || sUrl.match(/id=([a-zA-Z0-9_-]+)/);
      if (matchId && matchId[1]) {
        sUrl = "https://lh3.googleusercontent.com/d/" + matchId[1];
      }
    }
    sealHtml = '<img src="' + sUrl + '" style="max-height: 122px; max-width: 175px; object-fit: contain; margin-bottom: 2px; transform: rotate(-4deg);" />';
  } else {
    sealHtml = '<div style="display:inline-block; border: 2.2px solid #6b21a8; border-radius: 50%; width: 118px; height: 118px; text-align: center; color: #6b21a8; font-size: 10px; font-weight: bold; padding-top: 20px; box-sizing: border-box; margin-bottom: 2px; transform: rotate(-5deg);">' +
      '<span style="display:block; font-size: 9px; letter-spacing: 0.5px;">SWARUP CONST.</span>' +
      '<span style="display:block; font-size: 11px; font-weight: 900; border-top: 1px solid #6b21a8; border-bottom: 1px solid #6b21a8; margin: 4px 0; padding: 1px 0;">DELIVERED</span>' +
      '<span style="display:block; font-size: 8px;">OFFICIAL SEAL</span>' +
    '</div>';
  }

  var noteText = (appSettings && appSettings.challanNote) ? appSettings.challanNote : "নোট: কাজ শেষে খালি ড্রাম, বালতি ও যন্ত্রপাতি পুনরায় ফেরত যোগ্য এবং কাজের পর অবশিষ্ট মালামাল ফেরত যোগ্য।";
  var companyName = (appSettings && appSettings.companyName) ? appSettings.companyName : "SWARUP CONSTRUCTION SOLUTION";

  var pages = paginateChallanItems(req.items || []);
  var totalPages = pages.length;
  var pagesOutputHtml = "";

  for (var p = 0; p < totalPages; p++) {
    var pageItems = pages[p];
    var isFirst = p === 0;
    var isLast = p === totalPages - 1;
    var itemOffset = 0;
    for (var q = 0; q < p; q++) itemOffset += pages[q].length;

    var rowsHtml = "";
    for (var i = 0; i < pageItems.length; i++) {
      var it = pageItems[i];
      rowsHtml += '<tr style="height: ' + CHALLAN_LAYOUT_CONFIG.rowHeightMm + 'mm;">' +
        '<td style="border: 1px solid #000000; padding: 4px 6px; text-align: center; font-size: 11px; font-weight: bold;">' + (itemOffset + i + 1) + '</td>' +
        '<td style="border: 1px solid #000000; padding: 4px 8px; font-weight: bold; font-size: 11px; text-transform: uppercase;">' + (it.item || "") + '</td>' +
        '<td style="border: 1px solid #000000; padding: 4px 8px; text-align: center; font-weight: bold; font-size: 11px;">' + (it.qty || "") + '</td>' +
        '<td style="border: 1px solid #000000; padding: 4px 6px; text-align: center; font-size: 11px;">' + (it.unit || "Pcs") + '</td>' +
        '<td style="border: 1px solid #000000; padding: 4px 6px; font-size: 11px; color: #333333;">' + (it.remark || "") + '</td>' +
      '</tr>';
    }

    var headerBlock = "";
    if (isFirst) {
      headerBlock = '<div class="pill-wrap">' +
        '<span class="pill-badge">DELIVERY CHALLAN</span>' +
      '</div>' +
      '<table class="info-table">' +
        '<tr>' +
          '<td style="width: 55%; text-align: left; padding-right: 10px;">' +
            '<div class="info-left-row"><strong class="info-lbl">Project Name : </strong><span style="font-weight: 900; text-transform: uppercase;">' + (req.projectName || "") + '</span></div>' +
            '<div class="info-left-row"><strong class="info-lbl">Project Address : </strong><span style="text-transform: uppercase;">' + (req.projectAddress || "") + '</span></div>' +
            '<div class="info-left-row"><strong class="info-lbl">Site Engineer : </strong><span style="text-transform: uppercase;">' + (req.engineerName || "") + '</span></div>' +
            '<div class="info-left-row"><strong class="info-lbl">Mobile No : </strong><span>' + (req.mobileNumber || "") + '</span></div>' +
          '</td>' +
          '<td style="width: 45%; text-align: right; padding-left: 10px;">' +
            '<div class="info-right-row"><strong class="info-lbl">Challan No : </strong><span style="font-family: monospace; font-weight: 900; font-size: 13px;">' + req.challanNo + '</span></div>' +
            '<div class="info-right-row"><strong class="info-lbl">Date : </strong><span>' + (req.date || "") + '</span></div>' +
            '<div class="info-right-row"><strong class="info-lbl">Requisition By : </strong><span style="text-transform: uppercase;">' + (req.requisitionBy || "") + '</span></div>' +
            '<div class="info-right-row"><strong class="info-lbl">Mobile No : </strong><span style="font-family: monospace;">' + (req.contactNumber || "") + '</span></div>' +
          '</td>' +
        '</tr>' +
      '</table>';
    } else {
      headerBlock = '<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000000; padding-bottom: 6px; margin-top: ' + CHALLAN_LAYOUT_CONFIG.titleGapMm + 'mm; margin-bottom: 10px;">' +
        '<div><span class="pill-badge" style="padding: 2px 14px; font-size: 11px;">DELIVERY CHALLAN (PAGE ' + (p + 1) + '/' + totalPages + ')</span>' +
        '<span style="font-size: 11.5px; font-weight: bold; margin-left: 8px; text-transform: uppercase;">' + (req.projectName || "") + '</span></div>' +
        '<div style="font-size: 11.5px; text-align: right;"><strong>Challan: </strong>' + req.challanNo + ' | <strong>Date: </strong>' + (req.date || "") + '</div>' +
      '</div>';
    }

    pagesOutputHtml += '<div class="page-border-container" style="' + (isLast ? 'page-break-after: avoid;' : 'page-break-after: always;') + '">' +
      '<div>' +
        headerBlock +
        '<table class="items-table">' +
          '<thead>' +
            '<tr>' +
              '<th style="width: 50px; text-align: center;">SL NO</th>' +
              '<th style="text-align: left; padding-left: 10px;">DESCRIPTION OF MATERIALS</th>' +
              '<th style="width: 80px; text-align: center;">QTY</th>' +
              '<th style="width: 70px; text-align: center;">UNIT</th>' +
              '<th style="width: 110px; text-align: left; padding-left: 8px;">REMARKS</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            rowsHtml +
          '</tbody>' +
        '</table>' +
        (isLast ? '<div class="note-text">' + noteText + '</div>' : '') +
      '</div>' +
      '<table class="footer-table">' +
        '<tr>' +
          '<td style="width: 50%; text-align: left;">' +
            '<div class="rec-line"></div>' +
            '<div class="rec-label">RECEIVED BY :</div>' +
          '</td>' +
          '<td style="width: 50%; text-align: center; padding-left: 35px;">' +
            '<div style="min-height: 122px; display: flex; align-items: flex-end; justify-content: center; margin-bottom: 4px;">' + sealHtml + '</div>' +
            '<div class="for-line"></div>' +
            '<div class="for-label">FOR: ' + companyName + '</div>' +
          '</td>' +
        '</tr>' +
      '</table>' +
    '</div>';
  }

  return '<!DOCTYPE html>' +
  '<html>' +
  '<head>' +
    '<meta charset="UTF-8">' +
    '<style>' +
      '@page { size: letter portrait; margin: 0; }' +
      '* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }' +
      'html, body { font-family: Arial, "Helvetica Neue", Helvetica, sans-serif; color: #000000; margin: 0; padding: 0; background: #ffffff; text-rendering: geometricPrecision; -webkit-font-smoothing: antialiased; }' +
      '.page-border-container { width: 8.5in; max-width: 8.5in; height: 11in; min-height: 11in; max-height: 11in; margin: 0 auto; border: none; padding-top: ' + CHALLAN_LAYOUT_CONFIG.marginTop + '; padding-bottom: ' + CHALLAN_LAYOUT_CONFIG.marginBottom + '; padding-left: ' + CHALLAN_LAYOUT_CONFIG.marginLeft + '; padding-right: ' + CHALLAN_LAYOUT_CONFIG.marginRight + '; box-sizing: border-box; position: relative; background: #ffffff; overflow: hidden; page-break-after: always; }' +
      '.pill-wrap { text-align: center; margin-top: ' + CHALLAN_LAYOUT_CONFIG.titleGapMm + 'mm; margin-bottom: 12px; }' +
      '.pill-badge { display: inline-block; background-color: #b91c1c; color: #ffffff !important; border: 2px solid #991b1b; padding: 4px 26px; font-size: 13px; font-weight: 900; border-radius: 9999px; letter-spacing: 1.2px; text-transform: uppercase; }' +
      '.info-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; border: none; }' +
      '.info-table td { vertical-align: top; font-size: 11.5px; line-height: 1.45; border: none; padding: 2px 4px; }' +
      '.info-left-row { margin-bottom: 2px; }' +
      '.info-lbl { font-weight: bold; color: #000000; }' +
      '.info-right-row { margin-bottom: 2px; text-align: right; line-height: 1.45; }' +
      '.items-table { width: 100%; border-collapse: collapse; border: 1.5px solid #000000; margin-bottom: 6px; }' +
      '.items-table th { background-color: #ffffff; border: 1px solid #000000; border-bottom: 1.5px solid #000000; padding: 4px 6px; font-size: 11px; font-weight: 900; }' +
      '.note-text { font-size: 11px; font-weight: bold; margin-top: 6px; margin-bottom: 8px; line-height: 1.35; color: #000000; }' +
      '.footer-table { width: calc(100% - (' + CHALLAN_LAYOUT_CONFIG.marginLeft + ' + ' + CHALLAN_LAYOUT_CONFIG.marginRight + ')); border-collapse: collapse; page-break-inside: avoid; border: none; position: absolute; bottom: ' + CHALLAN_LAYOUT_CONFIG.footerBottomOffset + '; left: ' + CHALLAN_LAYOUT_CONFIG.marginLeft + '; right: ' + CHALLAN_LAYOUT_CONFIG.marginRight + '; margin: 0; }' +
      '.footer-table td { vertical-align: bottom; border: none; padding: 0; }' +
      '.rec-line { border-top: 1.5px solid #000000; width: 180px; margin-bottom: 5px; }' +
      '.rec-label { font-size: 11px; font-weight: 900; letter-spacing: 0.5px; }' +
      '.for-line { border-top: 1.5px solid #000000; width: 100%; margin-bottom: 5px; }' +
      '.for-label { font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-align: center; text-transform: uppercase; }' +
    '</style>' +
  '</head>' +
  '<body>' +
    pagesOutputHtml +
  '</body>' +
  '</html>';
}

/**
 * Resequences remaining requisitions sequentially after a deletion
 * Format: SCSYYYYMM-01, SCSYYYYMM-02...
 */
function resequenceRequisitionsSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  var range = sheet.getRange(2, 1, lastRow - 1, 15);
  var values = range.getValues();
  var monthCounters = {};

  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var oldChallanNo = String(row[0] || "").trim();
    var dateVal = row[1];

    var yyyymm = "";
    if (dateVal) {
      try {
        var d = new Date(dateVal);
        if (!isNaN(d.getTime())) {
          var y = d.getFullYear();
          var m = String(d.getMonth() + 1);
          if (m.length === 1) m = "0" + m;
          yyyymm = String(y) + m;
        }
      } catch(e) {}
    }
    if (!yyyymm && oldChallanNo) {
      var match = oldChallanNo.match(/SCS-?(\d{6})-/i);
      if (match && match[1]) {
        yyyymm = match[1];
      }
    }
    if (!yyyymm) {
      var now = new Date();
      var curM = String(now.getMonth() + 1);
      if (curM.length === 1) curM = "0" + curM;
      yyyymm = String(now.getFullYear()) + curM;
    }

    var prefix = "SCS" + yyyymm + "-";
    if (!monthCounters[prefix]) {
      monthCounters[prefix] = 1;
    } else {
      monthCounters[prefix]++;
    }

    var serialStr = String(monthCounters[prefix]);
    if (serialStr.length === 1) serialStr = "0" + serialStr;

    row[0] = prefix + serialStr;
  }

  range.setValues(values);
}

/**
 * Delete Requisition & Automatically Resequence Challan Numbers
 */
function deleteRequisition(challanNo) {
  var ss = getSS_();
  var reqSheet = ss.getSheetByName(SHEET_REQUISITIONS);
  var rowIndex = findRequisitionRow(reqSheet, challanNo);
  if (rowIndex > 0) {
    reqSheet.deleteRow(rowIndex);
    resequenceRequisitionsSheet(reqSheet);
    return {
      success: true,
      message: "Challan deleted and sequence updated successfully",
      updatedData: getInitialData()
    };
  }
  return { success: false, message: "Challan not found" };
}

/**
 * Full Product CRUD
 */
function addProduct(name, unit) {
  var prodSheet = getSS_().getSheetByName(SHEET_PRODUCTS);
  var nextSl = prodSheet.getLastRow();
  prodSheet.appendRow([nextSl, String(name).trim(), String(unit || "Pcs").trim()]);
  return { success: true, nextSl: nextSl };
}

function editProduct(slNo, name, unit) {
  var prodSheet = getSS_().getSheetByName(SHEET_PRODUCTS);
  var lastRow = prodSheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    if (Number(prodSheet.getRange(i, 1).getValue()) === Number(slNo)) {
      prodSheet.getRange(i, 2).setValue(String(name).trim());
      prodSheet.getRange(i, 3).setValue(String(unit || "Pcs").trim());
      return { success: true };
    }
  }
  return { success: false, message: "Product not found" };
}

function deleteProduct(slNo) {
  var prodSheet = getSS_().getSheetByName(SHEET_PRODUCTS);
  var lastRow = prodSheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    if (Number(prodSheet.getRange(i, 1).getValue()) === Number(slNo)) {
      prodSheet.deleteRow(i);
      reindexSheet(prodSheet);
      return { success: true };
    }
  }
  return { success: false, message: "Product not found" };
}

/**
 * Full Project CRUD (7 columns)
 */
function addProject(proj) {
  var projSheet = getSS_().getSheetByName(SHEET_PROJECTS);
  var nextSl = projSheet.getLastRow();
  var formattedMobile = formatBangladeshMobile(proj.mobileNumber || "");
  projSheet.appendRow([
    nextSl,
    proj.projectType || "Group Project",
    proj.groupName || (proj.projectType === "Private Project" ? "Private Project" : "General Group"),
    proj.projectName,
    proj.projectAddress || "",
    proj.engineerName || "",
    formattedMobile
  ]);
  return { success: true, nextSl: nextSl };
}

function editProject(slNo, proj) {
  var projSheet = getSS_().getSheetByName(SHEET_PROJECTS);
  var lastRow = projSheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    if (Number(projSheet.getRange(i, 1).getValue()) === Number(slNo)) {
      var formattedMobile = formatBangladeshMobile(proj.mobileNumber || "");
      projSheet.getRange(i, 2, 1, 6).setValues([[
        proj.projectType || "Group Project",
        proj.groupName || (proj.projectType === "Private Project" ? "Private Project" : "General Group"),
        proj.projectName,
        proj.projectAddress || "",
        proj.engineerName || "",
        formattedMobile
      ]]);
      return { success: true };
    }
  }
  return { success: false, message: "Project not found" };
}

function deleteProject(slNo) {
  var projSheet = getSS_().getSheetByName(SHEET_PROJECTS);
  var lastRow = projSheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    if (Number(projSheet.getRange(i, 1).getValue()) === Number(slNo)) {
      projSheet.deleteRow(i);
      reindexSheet(projSheet);
      return { success: true };
    }
  }
  return { success: false, message: "Project not found" };
}

/**
 * Re-number SL column after delete
 */
function reindexSheet(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    for (var i = 2; i <= lastRow; i++) {
      sheet.getRange(i, 1).setValue(i - 1);
    }
  }
}

/**
 * Save Seal URL / Base64 Data
 */
function saveSealUrl(url) {
  return setSettingValue("seal_url", url);
}

/**
 * Save Google Drive Folder URL / ID
 */
function saveDriveFolderUrl(url) {
  return setSettingValue("drive_folder_url", url);
}

/**
 * Save System Settings (sealUrl, driveFolderUrl, company info)
 */
function saveSettings(settingsObj) {
  if (typeof settingsObj === "string") {
    try {
      settingsObj = JSON.parse(settingsObj);
    } catch(e) {}
  }
  if (!settingsObj) return { success: false, message: "No settings provided" };

  if (settingsObj.sealUrl !== undefined) setSettingValue("seal_url", settingsObj.sealUrl);
  if (settingsObj.driveFolderUrl !== undefined) setSettingValue("drive_folder_url", settingsObj.driveFolderUrl);
  if (settingsObj.companyName !== undefined) setSettingValue("company_name", settingsObj.companyName);
  if (settingsObj.companySubtitle !== undefined) setSettingValue("company_subtitle", settingsObj.companySubtitle);
  if (settingsObj.companyContact !== undefined) setSettingValue("company_contact", settingsObj.companyContact);

  return { success: true };
}

function setSettingValue(key, val) {
  var ss = getSS_();
  var setSheet = ss.getSheetByName(SHEET_SETTINGS);
  if (!setSheet) initSheets();
  setSheet = ss.getSheetByName(SHEET_SETTINGS);

  var lastRow = setSheet.getLastRow();
  for (var i = 2; i <= lastRow; i++) {
    if (String(setSheet.getRange(i, 1).getValue()).trim() === key) {
      setSheet.getRange(i, 2).setValue(val);
      return { success: true };
    }
  }
  setSheet.appendRow([key, val]);
  return { success: true };
}

/**
 * Verify and initialize Google Drive root folder with Group & Private subfolders
 */
function testDriveFolderSetup(rootFolderUrlOrId) {
  try {
    var rootFolder = null;
    var rawInput = String(rootFolderUrlOrId || "").trim();

    if (rawInput && rawInput.toLowerCase() !== "root") {
      var folderId = extractFolderId_(rawInput);
      if (!folderId) {
        return {
          success: false,
          isPermissionError: false,
          message: "Invalid Drive Folder format. Please copy the complete folder URL from Google Drive (e.g. https://drive.google.com/drive/folders/...) or leave blank to use the default folder."
        };
      }
      try {
        rootFolder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        return {
          success: false,
          isPermissionError: false,
          message: "Could not open folder with ID '" + folderId + "': " + (fErr.message || fErr.toString()) + ". Please make sure the folder exists and is accessible."
        };
      }
    } else if (rawInput.toLowerCase() === "root") {
      rootFolder = DriveApp.getRootFolder();
    } else {
      rootFolder = getDefaultRootFolder_();
    }

    var groupFolder = getOrCreateSubfolder(rootFolder, "GROUP OF COMPANY");
    var privateFolder = getOrCreateSubfolder(rootFolder, "PRIVATE PROJECT");

    return {
      success: true,
      folderId: rootFolder.getId(),
      folderName: rootFolder.getName(),
      folderUrl: rootFolder.getUrl(),
      groupFolderId: groupFolder.getId(),
      privateFolderId: privateFolder.getId(),
      message: "Connected successfully! Target: '" + rootFolder.getName() + "' (Subfolders 'GROUP OF COMPANY' and 'PRIVATE PROJECT' are ready)"
    };
  } catch (err) {
    var rawMsg = err.message || err.toString();
    var isPerm = rawMsg.indexOf("permission") !== -1 || rawMsg.indexOf("auth/drive") !== -1;
    var finalMsg = "Drive folder access failed: " + rawMsg;
    if (isPerm) {
      finalMsg += " (Permission issue: Please ensure Web App deployment has 'Execute as: Me' and authorized)";
    }
    return { success: false, isPermissionError: isPerm, message: finalMsg };
  }
}

function findRequisitionRow(sheet, challanNo) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;
  var values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === String(challanNo).trim().toLowerCase()) {
      return i + 2;
    }
  }
  return -1;
}

function formatDateString(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(val);
}
// ============================================================================
// 💾 BACKUP / RESTORE / RESET + AUTO BACKUP TO GOOGLE DRIVE
// লাইফটাইম, বাৎসরিক ও মাসিক ব্যাকআপ; রিস্টোর ও রিসেটের আগে সবসময় নিরাপত্তা ব্যাকআপ নেওয়া হয়।
// ============================================================================
var BACKUP_FORMAT = "scs-requisition-backup";
var BACKUP_SUBFOLDERS = { lifetime: "Lifetime", year: "Yearly", month: "Monthly", auto: "Auto Backup", safety: "Safety (before restore or reset)" };
var REQ_COLS = 15;

// Apps Script time triggers allow: minutes 1/5/10/15/30, any whole number of hours, any whole number of days
var AUTO_BACKUP_OPTIONS = {
  "off": null,
  "m1": { unit: "minutes", n: 1 }, "m5": { unit: "minutes", n: 5 }, "m10": { unit: "minutes", n: 10 },
  "m15": { unit: "minutes", n: 15 }, "m30": { unit: "minutes", n: 30 },
  "h1": { unit: "hours", n: 1 }, "h2": { unit: "hours", n: 2 }, "h4": { unit: "hours", n: 4 },
  "h6": { unit: "hours", n: 6 }, "h8": { unit: "hours", n: 8 }, "h12": { unit: "hours", n: 12 },
  "d1": { unit: "days", n: 1 }, "d2": { unit: "days", n: 2 }, "d3": { unit: "days", n: 3 }, "d7": { unit: "days", n: 7 }
};

function backupTz_() { return Session.getScriptTimeZone(); }
function backupStamp_() { return Utilities.formatDate(new Date(), backupTz_(), "yyyy-MM-dd_HH-mm-ss"); }

function getBackupRootFolder_() {
  var raw = getSettingValue_("backup_folder_url");
  var id = extractFolderId_(raw);
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* fall back to default */ }
  }
  var name = "SCS Backups - " + getSS_().getName();
  var it = DriveApp.getRootFolder().getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.getRootFolder().createFolder(name);
}

function getBackupSubfolder_(kind) {
  return getOrCreateSubfolder(getBackupRootFolder_(), BACKUP_SUBFOLDERS[kind] || BACKUP_SUBFOLDERS.lifetime);
}

function serializeCell_(v, withTime) {
  if (v instanceof Date) return Utilities.formatDate(v, backupTz_(), withTime ? "yyyy-MM-dd HH:mm:ss" : "yyyy-MM-dd");
  return v;
}

function readSheet_(name, cols) {
  var sh = getSS_().getSheetByName(name);
  if (!sh) return { headers: [], rows: [] };
  var last = sh.getLastRow();
  var headers = last >= 1 ? sh.getRange(1, 1, 1, cols).getValues()[0] : [];
  var rows = last > 1 ? sh.getRange(2, 1, last - 1, cols).getValues() : [];
  rows = rows.filter(function(r) { return r.some(function(c) { return c !== "" && c !== null; }); })
    .map(function(r) { return r.map(function(c, i) { return serializeCell_(c, name === SHEET_REQUISITIONS && i === 14); }); });
  return { headers: headers, rows: rows };
}

function buildBackupPayload_(scope, period) {
  initSheets();
  scope = scope === "year" || scope === "month" ? scope : "lifetime";
  var req = readSheet_(SHEET_REQUISITIONS, REQ_COLS);
  if (scope !== "lifetime") {
    var p = String(period || "");
    req.rows = req.rows.filter(function(r) { return String(r[1] || "").indexOf(p) === 0; });
  }
  var payload = {
    app: "SCS Requisition",
    format: BACKUP_FORMAT,
    version: 1,
    scope: scope,
    period: scope === "lifetime" ? "" : String(period || ""),
    spreadsheet: getSS_().getName(),
    exportedAt: Utilities.formatDate(new Date(), backupTz_(), "yyyy-MM-dd HH:mm:ss"),
    sheets: {
      requisitions: req,
      products: readSheet_(SHEET_PRODUCTS, 3),
      projects: readSheet_(SHEET_PROJECTS, 7),
      settings: readSheet_(SHEET_SETTINGS, 2)
    }
  };
  payload.counts = {
    requisitions: payload.sheets.requisitions.rows.length,
    products: payload.sheets.products.rows.length,
    projects: payload.sheets.projects.rows.length
  };
  return payload;
}

function backupFileName_(payload, kind) {
  var label = payload.scope === "lifetime" ? "lifetime" : (payload.scope + "_" + payload.period);
  var prefix = kind === "auto" ? "scs_req_AUTO_" : kind === "safety" ? "scs_req_SAFETY_" : "scs_req_backup_";
  return prefix + label + "_" + backupStamp_() + ".json";
}

/**
 * Create a backup. opts = { scope: 'lifetime'|'year'|'month', period: 'YYYY' | 'YYYY-MM',
 *                          saveToDrive: true/false, returnJson: true/false }
 */
function createBackup(opts) {
  opts = opts || {};
  var payload = buildBackupPayload_(opts.scope, opts.period);
  if (payload.scope !== "lifetime" && !payload.period) return { success: false, message: "Please choose the year or month to back up." };
  var json = JSON.stringify(payload);
  var fileName = backupFileName_(payload, opts.kind);
  var out = { success: true, fileName: fileName, scope: payload.scope, period: payload.period, counts: payload.counts, exportedAt: payload.exportedAt };
  if (opts.saveToDrive !== false) {
    try {
      var kind = opts.kind === "auto" ? "auto" : opts.kind === "safety" ? "safety" : payload.scope;
      var file = getBackupSubfolder_(kind).createFile(fileName, json, "application/json");
      out.fileId = file.getId();
      out.fileUrl = file.getUrl();
      out.folderPath = getBackupRootFolder_().getName() + " / " + (BACKUP_SUBFOLDERS[kind] || "");
    } catch (e) {
      out.driveError = "Google Drive save failed: " + (e && e.message ? e.message : e);
      if (opts.requireDrive) return { success: false, message: out.driveError };
    }
  }
  if (opts.returnJson) out.json = json;
  return out;
}

/**
 * List backup files saved in Google Drive (newest first)
 */
function listBackups(limit) {
  limit = limit || 60;
  var list = [];
  try {
    var root = getBackupRootFolder_();
    Object.keys(BACKUP_SUBFOLDERS).forEach(function(kind) {
      var it = root.getFoldersByName(BACKUP_SUBFOLDERS[kind]);
      if (!it.hasNext()) return;
      var files = it.next().getFiles();
      while (files.hasNext()) {
        var f = files.next();
        if (String(f.getName()).slice(-5) !== ".json") continue;
        var created = f.getDateCreated();
        list.push({
          id: f.getId(), name: f.getName(), url: f.getUrl(), kind: kind, size: f.getSize(),
          created: Utilities.formatDate(created, backupTz_(), "yyyy-MM-dd HH:mm:ss"), ts: created.getTime()
        });
      }
    });
  } catch (e) {
    return { success: false, message: "Could not read the backup folder: " + (e && e.message ? e.message : e), backups: [] };
  }
  list.sort(function(a, b) { return b.ts - a.ts; });
  return { success: true, backups: list.slice(0, limit) };
}

function parseBackup_(src) {
  var text;
  if (src && src.fileId) text = DriveApp.getFileById(src.fileId).getBlob().getDataAsString();
  else if (src && src.json) text = src.json;
  else if (typeof src === "string") text = src;
  if (!text) throw new Error("No backup data received.");
  var data = JSON.parse(text);
  if (!data || data.format !== BACKUP_FORMAT || !data.sheets || !data.sheets.requisitions) throw new Error("This is not a valid SCS Requisition backup file.");
  return data;
}

function clearDataRows_(sheet, cols) {
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, cols).clearContent();
}

function writeRows_(sheet, rows, cols) {
  if (!rows.length) return;
  var fixed = rows.map(function(r) { var a = r.slice(0, cols); while (a.length < cols) a.push(""); return a; });
  sheet.getRange(sheet.getLastRow() + 1, 1, fixed.length, cols).setValues(fixed);
}

function inPeriod_(row, scope, period) {
  if (scope === "lifetime") return true;
  var d = serializeCell_(row[1], false);
  return String(d || "").indexOf(period) === 0;
}

/**
 * Restore. src = { fileId } or { json };  mode = 'merge' | 'replace';  includeSettings = true/false
 * Always takes a lifetime safety backup to Drive first — if that fails, nothing is changed.
 */
function restoreBackup(src, mode, includeSettings) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return { success: false, message: "Server is busy. Please try again." }; }
  try {
    var data;
    try { data = parseBackup_(src); } catch (pe) { return { success: false, message: pe.message }; }
    mode = mode === "replace" ? "replace" : "merge";

    var safety = createBackup({ scope: "lifetime", kind: "safety", saveToDrive: true, requireDrive: true });
    if (!safety.success) return { success: false, message: "Safety backup failed, restore stopped. " + safety.message };

    var ss = getSS_();
    var reqSheet = ss.getSheetByName(SHEET_REQUISITIONS);
    var scope = data.scope || "lifetime", period = data.period || "";
    var incoming = data.sheets.requisitions.rows || [];

    var current = readSheet_(SHEET_REQUISITIONS, REQ_COLS).rows;
    var result = [];
    if (mode === "replace") {
      result = current.filter(function(r) { return !inPeriod_(r, scope, period); }).concat(incoming);
    } else {
      var idx = {};
      result = current.slice();
      result.forEach(function(r, i) { idx[String(r[0]).trim().toLowerCase()] = i; });
      incoming.forEach(function(r) {
        var k = String(r[0]).trim().toLowerCase();
        if (idx.hasOwnProperty(k)) result[idx[k]] = r; else { idx[k] = result.length; result.push(r); }
      });
    }
    result.sort(function(a, b) {
      var da = String(serializeCell_(a[1]) || ""), db = String(serializeCell_(b[1]) || "");
      if (da !== db) return da < db ? -1 : 1;
      return String(a[0]).localeCompare(String(b[0]), undefined, { numeric: true });
    });
    clearDataRows_(reqSheet, REQ_COLS);
    writeRows_(reqSheet, result, REQ_COLS);

    // catalogs: full replace only for a lifetime backup in replace mode; otherwise add the missing ones
    restoreCatalog_(SHEET_PRODUCTS, 3, data.sheets.products, 1, mode === "replace" && scope === "lifetime");
    restoreCatalog_(SHEET_PROJECTS, 7, data.sheets.projects, 3, mode === "replace" && scope === "lifetime");

    if (includeSettings && data.sheets.settings) {
      (data.sheets.settings.rows || []).forEach(function(r) {
        var key = String(r[0] || "").trim();
        if (key && key.indexOf("auto_backup") !== 0) setSettingValue(key, r[1]);
      });
    }
    return {
      success: true,
      message: "Restore complete (" + mode + "): " + incoming.length + " requisitions from the backup.",
      safetyBackup: { fileName: safety.fileName, fileUrl: safety.fileUrl },
      updatedData: getInitialData()
    };
  } finally {
    lock.releaseLock();
  }
}

function restoreCatalog_(name, cols, block, keyCol, replace) {
  if (!block || !block.rows) return;
  var sh = getSS_().getSheetByName(name);
  if (replace) {
    clearDataRows_(sh, cols);
    writeRows_(sh, block.rows, cols);
  } else {
    var cur = readSheet_(name, cols).rows;
    var keys = {};
    cur.forEach(function(r) { keys[String(r[keyCol] || "").trim().toLowerCase()] = true; });
    var add = block.rows.filter(function(r) {
      var k = String(r[keyCol] || "").trim().toLowerCase();
      if (!k || keys[k]) return false;
      keys[k] = true;
      return true;
    });
    writeRows_(sh, add, cols);
  }
  reindexSheet(sh);
}

/**
 * Reset data. Allowed only with a lifetime backup made in the last 60 minutes (its Drive file id).
 * what = 'requisitions' (only challans) | 'all' (challans + products + projects). Settings are kept.
 */
function resetAllData(backupFileId, what) {
  if (!backupFileId) return { success: false, message: "Take a lifetime backup first. Reset is locked until then." };
  try {
    var f = DriveApp.getFileById(backupFileId);
    var data = JSON.parse(f.getBlob().getDataAsString());
    if (data.format !== BACKUP_FORMAT || data.scope !== "lifetime") throw new Error("not a lifetime backup");
    if (new Date().getTime() - f.getDateCreated().getTime() > 60 * 60 * 1000) {
      return { success: false, message: "The lifetime backup is older than 60 minutes. Please take a new one before reset." };
    }
  } catch (e) {
    return { success: false, message: "Lifetime backup could not be verified, reset stopped. " + (e && e.message ? e.message : "") };
  }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e2) { return { success: false, message: "Server is busy. Please try again." }; }
  try {
    var ss = getSS_();
    clearDataRows_(ss.getSheetByName(SHEET_REQUISITIONS), REQ_COLS);
    if (what === "all") {
      clearDataRows_(ss.getSheetByName(SHEET_PRODUCTS), 3);
      clearDataRows_(ss.getSheetByName(SHEET_PROJECTS), 7);
    }
    setSettingValue("last_reset", Utilities.formatDate(new Date(), backupTz_(), "yyyy-MM-dd HH:mm:ss") + " (" + (what === "all" ? "all data" : "requisitions") + ")");
    return { success: true, message: what === "all" ? "All data has been reset." : "All requisitions have been reset.", updatedData: getInitialData() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Auto backup schedule (time-driven trigger → runAutoBackup)
 */
function setAutoBackup(intervalKey, keepCount, folderUrl) {
  if (!AUTO_BACKUP_OPTIONS.hasOwnProperty(intervalKey)) return { success: false, message: "Unknown interval: " + intervalKey };
  if (folderUrl !== undefined && folderUrl !== null) setSettingValue("backup_folder_url", String(folderUrl).trim());
  var keep = parseInt(keepCount, 10);
  if (isNaN(keep) || keep < 1) keep = 30;
  setSettingValue("auto_backup_keep", keep);

  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === "runAutoBackup") ScriptApp.deleteTrigger(t);
  });
  var opt = AUTO_BACKUP_OPTIONS[intervalKey];
  if (opt) {
    var b = ScriptApp.newTrigger("runAutoBackup").timeBased();
    if (opt.unit === "minutes") b.everyMinutes(opt.n);
    else if (opt.unit === "hours") b.everyHours(opt.n);
    else b.everyDays(opt.n).atHour(1);
    b.create();
  }
  setSettingValue("auto_backup_interval", intervalKey);
  return { success: true, message: opt ? "Auto backup is on." : "Auto backup is off.", status: getBackupStatus() };
}

function runAutoBackup() {
  var res = createBackup({ scope: "lifetime", kind: "auto", saveToDrive: true, requireDrive: true });
  if (!res.success) { console.error("Auto backup failed: " + res.message); return res; }
  setSettingValue("auto_backup_last", res.exportedAt);
  // keep only the newest N auto backups
  try {
    var keep = parseInt(getSettingValue_("auto_backup_keep"), 10) || 30;
    var files = [], it = getBackupSubfolder_("auto").getFiles();
    while (it.hasNext()) files.push(it.next());
    files.sort(function(a, b) { return b.getDateCreated().getTime() - a.getDateCreated().getTime(); });
    files.slice(keep).forEach(function(f) { f.setTrashed(true); });
  } catch (e) { console.error("Auto backup cleanup: " + e); }
  return res;
}

function getBackupStatus() {
  var interval = getSettingValue_("auto_backup_interval") || "off";
  var active = false;
  try {
    active = ScriptApp.getProjectTriggers().some(function(t) { return t.getHandlerFunction() === "runAutoBackup"; });
  } catch (e) {}
  var folderName = "", folderUrl = "";
  try { var root = getBackupRootFolder_(); folderName = root.getName(); folderUrl = root.getUrl(); } catch (e2) {}
  var list = listBackups(40);
  return {
    success: true,
    interval: active ? interval : "off",
    keep: parseInt(getSettingValue_("auto_backup_keep"), 10) || 30,
    lastAuto: getSettingValue_("auto_backup_last"),
    lastReset: getSettingValue_("last_reset"),
    folderSetting: getSettingValue_("backup_folder_url"),
    folderName: folderName,
    folderUrl: folderUrl,
    backups: list.backups || [],
    listError: list.success ? "" : list.message
  };
}
