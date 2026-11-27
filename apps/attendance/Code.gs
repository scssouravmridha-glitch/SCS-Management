/**
 * ==============================================================================
 * Google Apps Script Backend for SCS Attendance System
 * ==============================================================================
 * 
 * 📌 সহজে ডেপ্লয় করার নিয়মাবলী (Easy Deployment Steps):
 * 1. আপনার Google Drive-এ যান অথবা ব্রাউজারে sheets.new লিখে একটি নতুন Google Spreadsheet তৈরি করুন।
 * 2. স্প্রেডশিটের ওপরের মেনু থেকে Extensions > Apps Script (এক্সটেনশন > অ্যাপস স্ক্রিপ্ট) এ ক্লিক করুন।
 * 3. Apps Script এডিটরে বিদ্যমান কোড মুছে ফেলে এই "Code.gs" ফাইলের সম্পূর্ণ কোড পেস্ট করুন।
 * 4. বামপাশের Files তালিকার পাশে "+" (Plus) আইকনে ক্লিক করে "HTML" নির্বাচন করুন।
 *    - ফাইলের নাম দিন: Index (শুধু Index লিখবেন, .html লিখতে হবে না)।
 *    - এবার Index.html ফাইলের সম্পূর্ণ কোড কপি করে Index ফাইলে পেস্ট করে দিন।
 * 5. ওপরের ডানে "Deploy" (ডিপ্লয়) বাটনে ক্লিক করে "New deployment" নির্বাচন করুন।
 *    - বামপাশে গিয়ার (Gear) আইকন থেকে "Web app" সিলেক্ট করুন।
 *    - Description: SCS Attendance System
 *    - Execute as: Me (আমার অ্যাকাউন্টে)
 *    - Who has access: Anyone (যে কেউ)
 * 6. "Deploy" বাটনে ক্লিক করুন, পারমিশন চাইলে "Authorize access" দিয়ে অনুমোদন দিন।
 * 7. প্রাপ্ত Web App URL-এ প্রবেশ করলেই আপনার পুরো SCS Attendance অ্যাপটি লাইভ হয়ে যাবে!
 * 
 * ==============================================================================
 */

function doGet(e) {
  try {
    var fileNames = ['Index', 'index', 'Index.html', 'index.html', 'App', 'app'];
    var htmlOutput = null;
    
    for (var i = 0; i < fileNames.length; i++) {
      try {
        htmlOutput = HtmlService.createHtmlOutputFromFile(fileNames[i]);
        if (htmlOutput) break;
      } catch (err) {}
    }
    
    if (!htmlOutput) {
      return HtmlService.createHtmlOutput(
        '<div style="font-family:sans-serif,Arial;padding:30px;color:#991b1b;background:#fee2e2;border:2px solid #ef4444;border-radius:16px;max-width:650px;margin:40px auto;line-height:1.7;">' +
        '<h2 style="color:#b91c1c;margin-top:0;font-size:22px;">⚠️ Index.html ফাইলটি পাওয়া যায়নি!</h2>' +
        '<p style="font-size:15px;">Google Apps Script এডিটরে বামপাশে <b>+</b> আইকনে ক্লিক করুন, <b>HTML</b> নির্বাচন করুন এবং ফাইলের নাম দিন <b>Index</b> (হুবহু Index লিখুন)।</p>' +
        '<p style="font-size:15px;">এরপর প্রজেক্টের <b>Index.html</b> ফাইল থেকে সম্পূর্ণ কোডটি কপি করে পেস্ট করে Save (সংরক্ষণ) করুন।</p>' +
        '<hr style="border:none;border-top:1px solid #fca5a5;margin:20px 0;">' +
        '<p style="font-size:13px;color:#7f1d1d;"><b>সহজ নির্দেশিকা:</b> Code.gs ফাইলে দেওয়া কোডটি কোড এডিটরে পেস্ট করুন এবং HTML ফাইলে Index.html এর কোড পেস্ট করে Deploy > New deployment > Web app হিসেবে পাবলিশ করুন।</p>' +
        '</div>'
      ).setTitle('SCS Attendance - সেটআপ নির্দেশিকা');
    }
    
    return htmlOutput
      .setTitle('SCS ATTENDANCE')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (fatalErr) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:sans-serif;padding:30px;color:#991b1b;background:#fee2e2;border:2px solid #ef4444;border-radius:12px;max-width:600px;margin:40px auto;">' +
      '<h2>doGet Execution Error</h2>' +
      '<p>' + fatalErr.toString() + '</p>' +
      '</div>'
    );
  }
}

function doPost(e) {
  try {
    var data = {};
    if (e && e.postData && e.postData.contents) {
      data = JSON.parse(e.postData.contents);
    }
    var action = data.action || (e && e.parameter ? e.parameter.action : '');
    var result = { success: false, error: 'Unknown action: ' + action };

    if (action === 'getInitialData') {
      result = getInitialData();
    } else if (action === 'saveAttendanceRecord') {
      result = saveAttendanceRecord(data.record);
    } else if (action === 'updateAttendanceList') {
      result = updateAttendanceList(data.records);
    } else if (action === 'updateEmployeeList') {
      result = updateEmployeeList(data.employees);
    } else if (action === 'updateOfficeSettings') {
      result = updateOfficeSettings(data.officeSetup);
    } else if (action === 'updateDriveSettings') {
      result = updateDriveSettings(data.driveSetup);
    } else if (action === 'updateLiveExportSetup') {
      result = updateLiveExportSetup(data.liveExportSetup);
    } else if (action === 'exportLiveSummaryToSheet') {
      result = exportLiveSummaryToSheet(data.sheetUrl, data.month, data.summaryData);
    } else if (action === 'rebuildAllMonths') {
      result = rebuildAllMonths();
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getActiveSpreadsheetSafe() {
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    return null;
  }
}

function formatCellDateSafe(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Dhaka', 'yyyy-MM-dd');
  }
  return String(val).trim();
}

function formatCellTimeSafe(val) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone() || 'Asia/Dhaka', 'hh:mm a');
  }
  return String(val).trim();
}

function extractSpreadsheetId(urlOrId) {
  if (!urlOrId) return '';
  var trimmed = String(urlOrId).trim();
  var match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) return match[1];
  var clean = trimmed.replace(/[^a-zA-Z0-9-_]/g, '');
  return clean;
}

function sanitizeEmpNameAndId(name, empId) {
  var n = String(name || '').trim();
  var id = String(empId || '').trim();
  // Check if name looks like an ID pattern while empId contains Bengali or multiple words
  var nIsIdPattern = /^[A-Z0-9_-]{1,10}$/i.test(n);
  var idIsNamePattern = /[\u0980-\u09FF\s]/.test(id) && id.length > n.length;
  if (nIsIdPattern && idIsNamePattern) {
    return { name: id, empId: n };
  }
  return { name: n, empId: id };
}

function getInitialData() {
  try {
    var ss = getActiveSpreadsheetSafe();
    if (!ss) {
      return {
        success: true,
        standalone: true,
        employees: [],
        attendance: [],
        officeSetup: {
          officeInTime: '09:00',
          officeOutTime: '17:00',
          maxLateMinutes: '15',
          holidays: [
            '2026-09-04 (Friday)',
            '2026-09-11 (Friday)',
            '2026-09-18 (Friday)',
            '2026-09-25 (Friday)',
            '2026-09-16 (Eid-e-Miladunnabi)'
          ]
        },
        driveSetup: { folderId: '', folderUrl: '' },
        liveExportSetup: { sheetUrl: '', sheetId: '', autoSync: true, lastStatus: 'idle' }
      };
    }

    // 1. Employees Sheet
    var empSheet = ss.getSheetByName('Employees') ||
                   ss.getSheetByName('employees') ||
                   ss.getSheetByName('কর্মকর্তাবৃন্দ') ||
                   ss.getSheetByName('কর্মকর্তা') ||
                   ss.getSheetByName('Staff');
    if (!empSheet) {
      empSheet = ss.insertSheet('Employees');
      empSheet.appendRow(['ID', 'EmpID', 'Name', 'Designation', 'Department', 'Mobile', 'PhotoUrl', 'SortOrder']);
      
      var defaultEmps = [
        ['emp-001', 'SCS-101', 'মোঃ রফিকুল ইসলাম', 'অফিস ইনচার্জ (Supervisor)', 'Operations', '01711000001', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=256&h=256&fit=crop&crop=face', 1],
        ['emp-002', 'SCS-102', 'তানজিলা আক্তার', 'সিনিয়র অ্যাকাউন্ট্যান্ট', 'Accounts & Finance', '01711000002', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=256&h=256&fit=crop&crop=face', 2],
        ['emp-003', 'SCS-103', 'কামরুল হাসান', 'ফিল্ড এক্সিকিউティブ', 'Field Operations', '01711000003', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=256&h=256&fit=crop&crop=face', 3],
        ['emp-004', 'SCS-104', 'সাদিয়া রহমান', 'অ্যাসিস্ট্যান্ট কো-অর্ডিনেটর', 'Coordination', '01711000004', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=256&h=256&fit=crop&crop=face', 4],
        ['emp-005', 'SCS-105', 'আব্দুল মোমিন', 'আইটি অ্যান্ড ডাটা সাপোর্ট', 'IT Support', '01711000005', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=256&h=256&fit=crop&crop=face', 5]
      ];
      defaultEmps.forEach(function(row) {
        empSheet.appendRow(row);
      });
    }

    var empData = empSheet.getDataRange().getValues();
    var employees = [];
    if (empData && empData.length > 1) {
      var header = empData[0] || [];
      var idIdx = -1;
      var empIdIdx = -1;
      var nameIdx = -1;
      var desigIdx = -1;
      var deptIdx = -1;
      var mobileIdx = -1;
      var photoIdx = -1;
      var sortIdx = -1;

      for (var col = 0; col < header.length; col++) {
        var colName = String(header[col] || '').trim().toLowerCase();
        if (colName === 'name' || colName === 'employee name' || colName === 'emp name' || colName === 'নাম' || colName === 'কর্মকর্তার নাম' || colName.indexOf('নাম') !== -1) {
          nameIdx = col;
        } else if (colName === 'empid' || colName === 'emp id' || colName === 'employee id' || colName === 'আইডি' || colName === 'এমপ্লয়ি আইডি' || colName.indexOf('empid') !== -1 || colName.indexOf('emp id') !== -1) {
          empIdIdx = col;
        } else if (colName === 'id' || colName === 'sl' || colName === 'sl no' || colName === 'ক্রমিক') {
          idIdx = col;
        } else if (colName === 'designation' || colName === 'পদবী' || colName === 'পদবি' || colName.indexOf('desig') !== -1) {
          desigIdx = col;
        } else if (colName === 'department' || colName === 'বিভাগ' || colName === 'শাখা' || colName.indexOf('dept') !== -1) {
          deptIdx = col;
        } else if (colName === 'mobile' || colName === 'phone' || colName === 'contact' || colName === 'মোবাইল' || colName === 'ফোন') {
          mobileIdx = col;
        } else if (colName === 'photo' || colName === 'photourl' || colName === 'ছবি' || colName === 'image') {
          photoIdx = col;
        } else if (colName === 'sortorder' || colName === 'sort' || colName === 'order') {
          sortIdx = col;
        }
      }

      // Default fallbacks if standard 8-column layout
      if (nameIdx === -1) nameIdx = (header.length > 2 ? 2 : 1);
      if (empIdIdx === -1) empIdIdx = (header.length > 1 ? 1 : 0);
      if (idIdx === -1) idIdx = 0;
      if (desigIdx === -1 && header.length > 3) desigIdx = 3;
      if (deptIdx === -1 && header.length > 4) deptIdx = 4;
      if (mobileIdx === -1 && header.length > 5) mobileIdx = 5;
      if (photoIdx === -1 && header.length > 6) photoIdx = 6;
      if (sortIdx === -1 && header.length > 7) sortIdx = 7;

      for (var i = 1; i < empData.length; i++) {
        var row = empData[i];
        if (!row || row.length === 0) continue;

        var rawId = idIdx >= 0 && row[idIdx] !== undefined ? String(row[idIdx]).trim() : '';
        var rawEmpId = empIdIdx >= 0 && row[empIdIdx] !== undefined ? String(row[empIdIdx]).trim() : '';
        var rawName = nameIdx >= 0 && row[nameIdx] !== undefined ? String(row[nameIdx]).trim() : '';
        var rawDesig = desigIdx >= 0 && row[desigIdx] !== undefined ? String(row[desigIdx]).trim() : '';
        var rawDept = deptIdx >= 0 && row[deptIdx] !== undefined ? String(row[deptIdx]).trim() : '';
        var rawMobile = mobileIdx >= 0 && row[mobileIdx] !== undefined ? String(row[mobileIdx]).trim() : '';
        var rawPhoto = photoIdx >= 0 && row[photoIdx] !== undefined ? String(row[photoIdx]).trim() : '';
        var rawSort = sortIdx >= 0 && row[sortIdx] !== undefined ? Number(row[sortIdx]) : i;

        if (!rawId && !rawEmpId && !rawName) continue;

        var clean = sanitizeEmpNameAndId(rawName, rawEmpId);
        rawName = clean.name;
        rawEmpId = clean.empId;

        if (!rawName) {
          if (rawEmpId && isNaN(Number(rawEmpId)) && !/^[A-Z0-9_-]{1,8}$/i.test(rawEmpId)) {
            rawName = rawEmpId;
            rawEmpId = 'SCS-' + (100 + i);
          } else if (rawId && isNaN(Number(rawId))) {
            rawName = rawId;
          }
        }
        if (!rawEmpId) {
          rawEmpId = rawId ? ('SCS-' + rawId) : ('SCS-' + (100 + i));
        }
        if (!rawId) {
          rawId = 'emp-' + i;
        }

        employees.push({
          id: rawId,
          empId: rawEmpId,
          name: rawName || ('Employee ' + i),
          designation: rawDesig || '-',
          department: rawDept || '',
          mobile: rawMobile || '',
          photoUrl: rawPhoto || '',
          sortOrder: isNaN(rawSort) ? i : rawSort
        });
      }
    }

    // 2. Attendance Sheet
    var attSheet = ss.getSheetByName('Attendance');
    if (!attSheet) {
      attSheet = ss.insertSheet('Attendance');
      attSheet.appendRow(['ID', 'EmpID', 'Date', 'Type', 'Time', 'Lat', 'Lng', 'LocationText', 'Note', 'CreatedBy']);
    }
    var attData = attSheet.getDataRange().getValues();
    var attendance = [];
    for (var j = 1; j < attData.length; j++) {
      if (attData[j][0]) {
        attendance.push({
          id: String(attData[j][0]),
          empId: String(attData[j][1]),
          date: formatCellDateSafe(attData[j][2]),
          type: String(attData[j][3]),
          time: formatCellTimeSafe(attData[j][4]),
          lat: Number(attData[j][5]) || 0,
          lng: Number(attData[j][6]) || 0,
          locationText: String(attData[j][7] || ''),
          note: String(attData[j][8] || ''),
          createdBy: String(attData[j][9] || 'user')
        });
      }
    }

    // 3. Settings Sheet
    var settingsSheet = ss.getSheetByName('Settings');
    if (!settingsSheet) {
      settingsSheet = ss.insertSheet('Settings');
      settingsSheet.appendRow(['Key', 'Value']);
      settingsSheet.appendRow(['officeInTime', '09:00']);
      settingsSheet.appendRow(['officeOutTime', '17:00']);
      settingsSheet.appendRow(['maxLateMinutes', '15']);
      settingsSheet.appendRow(['holidays', '2026-09-04 (Friday),2026-09-11 (Friday),2026-09-18 (Friday),2026-09-25 (Friday),2026-09-16 (Eid-e-Miladunnabi)']);
      settingsSheet.appendRow(['driveFolderId', '1AbCdEfGhIjKlMnOpQrStUvWxYz']);
      settingsSheet.appendRow(['driveFolderUrl', 'https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz']);
    }
    var settings = readSettingsMap_(settingsSheet);

    return {
      success: true,
      employees: employees,
      attendance: attendance,
      officeSetup: {
        officeInTime: settings.officeInTime || '09:00',
        officeOutTime: settings.officeOutTime || '17:00',
        maxLateMinutes: settings.maxLateMinutes || '15',
        holidays: settings.holidays ? settings.holidays.split(',') : []
      },
      driveSetup: {
        folderId: settings.driveFolderId || '',
        folderUrl: settings.driveFolderUrl || ''
      },
      liveExportSetup: {
        sheetUrl: settings.liveExportSheetUrl || '',
        sheetId: settings.liveExportSheetId || '',
        autoSync: settings.liveExportAutoSync !== 'false',
        lastStatus: 'idle'
      },
      liveExportSheetUrl: settings.liveExportSheetUrl || ''
    };
  } catch (err) {
    return {
      success: false,
      error: err.toString()
    };
  }
}

function saveAttendanceRecord(record) {
  return withLockThenExport_(function () { return saveAttendanceRecordImpl_(record); });
}

function saveAttendanceRecordImpl_(record) {
  try {
    var ss = getActiveSpreadsheetSafe();
    if (!ss) return { status: 'error', message: 'No active Google Sheet linked' };
    var sheet = ss.getSheetByName('Attendance');
    if (!sheet) {
      sheet = ss.insertSheet('Attendance');
      sheet.appendRow(['ID', 'EmpID', 'Date', 'Type', 'Time', 'Lat', 'Lng', 'LocationText', 'Note', 'CreatedBy']);
    }
    if (sheet.getLastRow() > 1) {
      var existingIds = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
      for (var q = 0; q < existingIds.length; q++) {
        if (String(existingIds[q][0]) === String(record.id)) return { status: 'success', duplicate: true };
      }
    }
    sheet.appendRow([
      record.id,
      record.empId,
      record.date,
      record.type,
      record.time,
      record.lat || 0,
      record.lng || 0,
      record.locationText || '',
      record.note || '',
      record.createdBy || 'user'
    ]);
    triggerAutoLiveExportIfConfigured();
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function updateAttendanceList(attendanceRecords) {
  return withLockThenExport_(function () { return updateAttendanceListImpl_(attendanceRecords); });
}

function updateAttendanceListImpl_(attendanceRecords) {
  try {
    var ss = getActiveSpreadsheetSafe();
    if (!ss) return { status: 'error', message: 'No active Google Sheet linked' };
    var sheet = ss.getSheetByName('Attendance');
    if (!sheet) {
      sheet = ss.insertSheet('Attendance');
    }
    sheet.clear();
    sheet.appendRow(['ID', 'EmpID', 'Date', 'Type', 'Time', 'Lat', 'Lng', 'LocationText', 'Note', 'CreatedBy']);
    if (attendanceRecords && attendanceRecords.length > 0) {
      var rows = [];
      for (var i = 0; i < attendanceRecords.length; i++) {
        var r = attendanceRecords[i];
        rows.push([
          r.id,
          r.empId,
          r.date,
          r.type,
          r.time,
          r.lat || 0,
          r.lng || 0,
          r.locationText || '',
          r.note || '',
          r.createdBy || 'user'
        ]);
      }
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    triggerAutoLiveExportIfConfigured();
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function updateEmployeeList(employees) {
  try {
    var ss = getActiveSpreadsheetSafe();
    if (!ss) return { status: 'error', message: 'No active Google Sheet linked' };
    var sheet = ss.getSheetByName('Employees');
    if (!sheet) {
      sheet = ss.insertSheet('Employees');
    }
    sheet.clear();
    sheet.appendRow(['ID', 'EmpID', 'Name', 'Designation', 'Department', 'Mobile', 'PhotoUrl', 'SortOrder']);
    if (employees && employees.length > 0) {
      var rows = [];
      for (var i = 0; i < employees.length; i++) {
        var e = employees[i];
        var clean = sanitizeEmpNameAndId(e.name, e.empId);
        rows.push([
          e.id || ('emp-' + (i + 1)),
          clean.empId || e.empId || ('SCS-' + (100 + i + 1)),
          clean.name || e.name || ('Employee ' + (i + 1)),
          e.designation || '',
          e.department || '',
          e.mobile || '',
          e.photoUrl || '',
          i + 1
        ]);
      }
      sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
    }
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function toHHmmText_(v) {
  var s = String(v === null || v === undefined ? '' : v).trim();
  var m = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM|am|pm)?/);
  if (!m) return s;
  var hh = parseInt(m[1], 10);
  var ap = (m[3] || '').toUpperCase();
  if (ap === 'PM' && hh < 12) hh += 12;
  if (ap === 'AM' && hh === 12) hh = 0;
  return ('0' + hh).slice(-2) + ':' + m[2];
}

// Reads the Settings sheet as displayed text (Sheets turns "09:00" into a time value, which broke the office time field)
function readSettingsMap_(sheet) {
  var rows = sheet.getDataRange().getDisplayValues();
  var cfg = {};
  for (var i = 1; i < rows.length; i++) {
    if (!rows[i][0]) continue;
    var key = String(rows[i][0]);
    var val = String(rows[i][1]);
    if (key === 'officeInTime' || key === 'officeOutTime') val = toHHmmText_(val);
    cfg[key] = val;
  }
  return cfg;
}

function writeSettingsMap_(sheet, cfg) {
  var keys = Object.keys(cfg);
  var rows = [['Key', 'Value']];
  for (var k = 0; k < keys.length; k++) rows.push([keys[k], cfg[keys[k]]]);
  sheet.clear();
  var range = sheet.getRange(1, 1, rows.length, 2);
  range.setNumberFormat('@');
  range.setValues(rows);
}

function withScriptLock_(fn) {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { return { status: 'error', message: 'Server busy, try again' }; }
  try { return fn(); } finally { try { lock.releaseLock(); } catch (e2) {} }
}

// Removes attendance rows by id (used to make deletions stick)
function deleteAttendanceRecords(ids) {
  return withLockThenExport_(function () {
    try {
      var ss = getActiveSpreadsheetSafe();
      if (!ss) return { status: 'error', message: 'No active Google Sheet linked' };
      var sheet = ss.getSheetByName('Attendance');
      if (!sheet || sheet.getLastRow() < 2) return { status: 'success', deleted: 0 };
      var set = {};
      for (var i = 0; i < (ids || []).length; i++) set[String(ids[i])] = true;
      var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getDisplayValues();
      var deleted = 0;
      for (var r = vals.length - 1; r >= 0; r--) {
        if (set[String(vals[r][0])]) { sheet.deleteRow(r + 2); deleted++; }
      }
      if (deleted > 0) triggerAutoLiveExportIfConfigured();
      return { status: 'success', deleted: deleted };
    } catch (err) {
      return { status: 'error', message: err.toString() };
    }
  });
}

var ACTIVITY_LOG_HEADERS = ['ID', 'Time', 'Source', 'Action', 'Employee', 'EmpID', 'Details', 'Actor'];

function getActivityLogSheet_(ss) {
  var sheet = ss.getSheetByName('ActivityLog');
  if (!sheet) {
    sheet = ss.insertSheet('ActivityLog');
    sheet.appendRow(ACTIVITY_LOG_HEADERS);
    sheet.getRange(1, 1, 1, ACTIVITY_LOG_HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.getRange(2, 1, sheet.getMaxRows() - 1, ACTIVITY_LOG_HEADERS.length).setNumberFormat('@');
  }
  return sheet;
}

function appendActivityLog(entries) {
  return withScriptLock_(function () {
    try {
      var ss = getActiveSpreadsheetSafe();
      if (!ss || !entries || !entries.length) return { status: 'success' };
      var sheet = getActivityLogSheet_(ss);
      var rows = [];
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i] || {};
        rows.push([String(e.id || ''), String(e.ts || new Date().toISOString()), String(e.source || 'auto'), String(e.action || ''),
          String(e.empName || ''), String(e.empId || ''), String(e.details || '').slice(0, 1000), String(e.actor || 'app')]);
      }
      var start = sheet.getLastRow() + 1;
      var range = sheet.getRange(start, 1, rows.length, ACTIVITY_LOG_HEADERS.length);
      range.setNumberFormat('@');
      range.setValues(rows);
      return { status: 'success' };
    } catch (err) {
      return { status: 'error', message: err.toString() };
    }
  });
}

function getActivityLog() {
  try {
    var ss = getActiveSpreadsheetSafe();
    if (!ss) return [];
    var sheet = ss.getSheetByName('ActivityLog');
    if (!sheet || sheet.getLastRow() < 2) return [];
    var total = sheet.getLastRow() - 1;
    var take = Math.min(total, 3000);
    var vals = sheet.getRange(sheet.getLastRow() - take + 1, 1, take, ACTIVITY_LOG_HEADERS.length).getDisplayValues();
    var out = [];
    for (var i = vals.length - 1; i >= 0; i--) {
      var r = vals[i];
      if (!r[0]) continue;
      out.push({ id: r[0], ts: r[1], source: r[2], action: r[3], empName: r[4], empId: r[5], details: r[6], actor: r[7] });
    }
    return out;
  } catch (err) {
    return [];
  }
}


function updateOfficeSettings(officeSetup) {
  try {
    var ss = getActiveSpreadsheetSafe();
    if (!ss) return { status: 'error', message: 'No active Google Sheet linked' };
    var sheet = ss.getSheetByName('Settings');
    if (!sheet) {
      sheet = ss.insertSheet('Settings');
    }
    var config = readSettingsMap_(sheet);
    config['officeInTime'] = officeSetup.officeInTime || '09:00';
    config['officeOutTime'] = officeSetup.officeOutTime || '17:00';
    config['maxLateMinutes'] = officeSetup.maxLateMinutes || '15';
    config['holidays'] = Array.isArray(officeSetup.holidays) ? officeSetup.holidays.join(',') : (officeSetup.holidays || '');
    
    writeSettingsMap_(sheet, config);
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function updateDriveSettings(driveSetup) {
  try {
    var ss = getActiveSpreadsheetSafe();
    if (!ss) return { status: 'error', message: 'No active Google Sheet linked' };
    var sheet = ss.getSheetByName('Settings');
    if (!sheet) {
      sheet = ss.insertSheet('Settings');
    }
    var config = readSettingsMap_(sheet);
    config['driveFolderId'] = driveSetup.folderId || '';
    config['driveFolderUrl'] = driveSetup.folderUrl || '';

    writeSettingsMap_(sheet, config);
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

function getEnglishMonthName(monthStr) {
  var mList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  if (!monthStr) {
    var now = new Date();
    return mList[now.getMonth()] + ' ' + now.getFullYear();
  }
  var parts = String(monthStr).split('-');
  var y = parseInt(parts[0], 10) || new Date().getFullYear();
  var m = (parseInt(parts[1], 10) || 1) - 1;
  var d = new Date(y, m, 1);
  return mList[d.getMonth()] + ' ' + d.getFullYear();
}

function getUpcoming6MonthsList(baseMonthStr) {
  var parts = String(baseMonthStr || '').split('-');
  var y = parts.length === 2 ? parseInt(parts[0], 10) : new Date().getFullYear();
  var m = parts.length === 2 ? parseInt(parts[1], 10) - 1 : new Date().getMonth();
  var mList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var result = [];
  for (var i = 0; i < 6; i++) {
    var d = new Date(y, m + i, 1);
    result.push(mList[d.getMonth()] + ' ' + d.getFullYear());
  }
  return result;
}

var SUMMARY_TITLE_PREFIX = 'EMPLOYEE ATTENDANCE SUMMARY';
var SUMMARY_NUM_COLS = 9;
var MONTH_NAMES_UPPER = ['JANUARY','FEBRUARY','MARCH','APRIL','MAY','JUNE','JULY','AUGUST','SEPTEMBER','OCTOBER','NOVEMBER','DECEMBER'];

function monthKeyToIndex(monthKey) {
  var p = String(monthKey || '').split('-');
  return parseInt(p[0], 10) * 12 + (parseInt(p[1], 10) - 1);
}

function indexToMonthKey(idx) {
  var y = Math.floor(idx / 12);
  var m = idx % 12;
  return y + '-' + ('0' + (m + 1)).slice(-2);
}

function currentMonthKey() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Dhaka', 'yyyy-MM');
}

function normalizeMonthKey(monthStr) {
  var m = String(monthStr || '').match(/^(\d{4})-(\d{1,2})/);
  if (!m) return currentMonthKey();
  return m[1] + '-' + ('0' + parseInt(m[2], 10)).slice(-2);
}

function titleToMonthIndex(titleUpper) {
  var m = String(titleUpper).match(/-\s*([A-Z]+)\s+(\d{4})\s*$/);
  if (!m) return null;
  var mi = MONTH_NAMES_UPPER.indexOf(m[1]);
  if (mi < 0) return null;
  return parseInt(m[2], 10) * 12 + mi;
}

// Finds every month table (title row to the row before the next title) on the sheet
function findSummaryBlocks(sheet) {
  var lastRow = sheet.getLastRow();
  var blocks = [];
  if (lastRow < 1) return blocks;
  var vals = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var k = 0; k < vals.length; k++) {
    var v = String(vals[k][0] || '').trim().toUpperCase();
    if (v.indexOf(SUMMARY_TITLE_PREFIX) === 0) {
      blocks.push({ row: k + 1, monthIndex: titleToMonthIndex(v) });
    }
  }
  for (var b = 0; b < blocks.length; b++) {
    var endRow = (b + 1 < blocks.length) ? blocks[b + 1].row - 1 : lastRow;
    blocks[b].count = endRow - blocks[b].row + 1;
  }
  return blocks;
}

function removeSummaryBlock(sheet, block) {
  try { sheet.getRange(block.row, 1, block.count, SUMMARY_NUM_COLS).breakApart(); } catch (e) {}
  sheet.deleteRows(block.row, block.count);
}

// One table per month. Existing month table is replaced in place, duplicates are removed,
// a missing month is inserted in date order (older on top, newer below).
function upsertMonthBlock(sheet, monthKey, rowsData) {
  var englishMonthLabel = getEnglishMonthName(monthKey);
  var tableTitleText = SUMMARY_TITLE_PREFIX + ' - ' + englishMonthLabel.toUpperCase();
  var targetIdx = monthKeyToIndex(monthKey);
  var numCols = SUMMARY_NUM_COLS;
  var numRows = rowsData.length;
  var newBlockRowCount = numRows + 3; // title + header + data + spacer

  var headers = ['SL', 'Photo', 'Employee Name', 'Emp ID', 'Designation', 'Present', 'Absent', 'Late Days', 'Attendance Rate'];

  var blocks = findSummaryBlocks(sheet);
  var same = [];
  for (var i = 0; i < blocks.length; i++) {
    if (blocks[i].monthIndex === targetIdx) same.push(blocks[i]);
  }

  // Remove every duplicate of this month (from the bottom up so row numbers stay valid)
  for (var d = same.length - 1; d >= 1; d--) {
    removeSummaryBlock(sheet, same[d]);
  }
  if (same.length > 1) {
    blocks = findSummaryBlocks(sheet);
    same = [];
    for (var j = 0; j < blocks.length; j++) {
      if (blocks[j].monthIndex === targetIdx) same.push(blocks[j]);
    }
  }

  var startRow;
  if (same.length >= 1) {
    var old = same[0];
    try { sheet.getRange(old.row, 1, old.count, numCols).breakApart(); } catch (e) {}
    sheet.insertRowsBefore(old.row, newBlockRowCount);
    sheet.deleteRows(old.row + newBlockRowCount, old.count);
    startRow = old.row;
  } else {
    var before = null;
    for (var k = 0; k < blocks.length; k++) {
      if (blocks[k].monthIndex !== null && blocks[k].monthIndex > targetIdx) { before = blocks[k]; break; }
    }
    if (before) {
      sheet.insertRowsBefore(before.row, newBlockRowCount);
      startRow = before.row;
    } else {
      var lr = sheet.getLastRow();
      if (lr === 0) {
        startRow = 1;
      } else {
        var lastA = String(sheet.getRange(lr, 1).getValue() || '').trim();
        startRow = lastA ? lr + 2 : lr + 1;
      }
      var needMax = startRow + newBlockRowCount - 1;
      if (sheet.getMaxRows() < needMax) {
        sheet.insertRowsAfter(sheet.getMaxRows(), needMax - sheet.getMaxRows());
      }
    }
  }

  // Start from a clean slate for the rows of this table
  var blockRange = sheet.getRange(startRow, 1, newBlockRowCount, numCols);
  try { blockRange.breakApart(); } catch (e) {}
  blockRange.clear();

  var titleRange = sheet.getRange(startRow, 1, 1, numCols);
  titleRange.merge()
    .setValue(tableTitleText)
    .setFontWeight('bold')
    .setFontSize(12)
    .setFontColor('#ffffff')
    .setBackground('#e91e63')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(startRow, 38);

  sheet.getRange(startRow + 1, 1, 1, numCols).setValues([headers])
    .setFontWeight('bold')
    .setFontSize(10)
    .setFontColor('#ffffff')
    .setBackground('#1e293b')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(startRow + 1, 32);

  var dataStartRow = startRow + 2;
  if (numRows > 0) {
    sheet.getRange(dataStartRow, 1, numRows, numCols).setValues(rowsData)
      .setVerticalAlignment('middle')
      .setFontSize(10)
      .setBackground('#ffffff');
    sheet.getRange(dataStartRow, 1, numRows, 1).setHorizontalAlignment('center');
    sheet.getRange(dataStartRow, 2, numRows, 1).setHorizontalAlignment('center');
    sheet.getRange(dataStartRow, 3, numRows, 1).setFontWeight('bold');
    sheet.getRange(dataStartRow, 4, numRows, 1).setHorizontalAlignment('center');
    sheet.getRange(dataStartRow, 6, numRows, 1).setHorizontalAlignment('center').setFontColor('#059669').setFontWeight('bold');
    sheet.getRange(dataStartRow, 7, numRows, 1).setHorizontalAlignment('center').setFontColor('#dc2626').setFontWeight('bold');
    sheet.getRange(dataStartRow, 8, numRows, 1).setHorizontalAlignment('center').setFontColor('#b45309').setFontWeight('bold');
    sheet.getRange(dataStartRow, 9, numRows, 1).setHorizontalAlignment('center').setFontColor('#be185d').setFontWeight('bold');
    for (var r = 0; r < numRows; r++) {
      sheet.setRowHeight(dataStartRow + r, 40);
    }
    sheet.getRange(startRow + 1, 1, numRows + 1, numCols)
      .setBorder(true, true, true, true, true, true, '#cbd5e1', SpreadsheetApp.BorderStyle.SOLID);
  }
  sheet.setRowHeight(dataStartRow + numRows, 20);
}

function setSummaryColumnWidths(sheet) {
  sheet.setColumnWidth(1, 55);
  sheet.setColumnWidth(2, 65);
  sheet.setColumnWidth(3, 190);
  sheet.setColumnWidth(4, 110);
  sheet.setColumnWidth(5, 180);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 110);
  sheet.setColumnWidth(9, 140);
}

function parseTimeToMinutes(str) {
  var s = String(str || '').trim();
  var m = s.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  var hh = parseInt(m[1], 10);
  var mm = parseInt(m[2], 10);
  var pm = /pm/i.test(s);
  var am = /am/i.test(s);
  if (pm && hh < 12) hh += 12;
  if (am && hh === 12) hh = 0;
  return hh * 60 + mm;
}

// Same rules as the app: present = Clock IN day, late = after office time + grace,
// absent = past working day (not Friday / holiday / approved Leave) without Clock IN
function buildMonthRows(monthKey, employees, attendance, officeSetup) {
  var parts = monthKey.split('-');
  var y = parseInt(parts[0], 10);
  var mo = parseInt(parts[1], 10) - 1;
  var daysInMonth = new Date(y, mo + 1, 0).getDate();
  var todayStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Dhaka', 'yyyy-MM-dd');
  var inMin = parseTimeToMinutes(officeSetup.officeInTime || '09:00');
  var grace = parseInt(officeSetup.maxLateMinutes || '15', 10) || 0;
  var holidays = officeSetup.holidays || [];

  var byEmpDate = {};
  for (var a = 0; a < attendance.length; a++) {
    var rec = attendance[a];
    if (String(rec.date).indexOf(monthKey) !== 0) continue;
    var key = String(rec.empId).trim().toLowerCase() + '|' + rec.date;
    if (!byEmpDate[key]) byEmpDate[key] = [];
    byEmpDate[key].push(rec);
  }

  var rows = [];
  for (var e = 0; e < employees.length; e++) {
    var emp = employees[e];
    var present = 0, absent = 0, late = 0;
    for (var day = 1; day <= daysInMonth; day++) {
      var ds = monthKey + '-' + ('0' + day).slice(-2);
      var isFriday = new Date(y, mo, day).getDay() === 5;
      var isHoliday = isFriday;
      for (var h = 0; h < holidays.length && !isHoliday; h++) {
        if (holidays[h] && String(holidays[h]).indexOf(ds) !== -1) isHoliday = true;
      }
      var recs = byEmpDate[String(emp.empId).trim().toLowerCase() + '|' + ds] || [];
      var clockIn = null, hasLeave = false;
      for (var q = 0; q < recs.length; q++) {
        if (recs[q].type === 'Clock IN' && !clockIn) clockIn = recs[q];
        if (recs[q].type === 'Leave') hasLeave = true;
      }
      if (clockIn) {
        present++;
        var tm = parseTimeToMinutes(clockIn.time);
        if (tm !== null && inMin !== null && (tm - inMin) > grace) late++;
      } else if (ds <= todayStr && !isHoliday && !hasLeave) {
        absent++;
      }
    }
    var denom = present + absent;
    var rate = denom > 0 ? Math.round(present / denom * 100) : 0;
    rows.push(makeSummaryRow(e, emp.name, emp.empId, emp.photoUrl, emp.designation, present, absent, late, rate));
  }
  return rows;
}

function makeSummaryRow(i, name, empId, photoUrl, designation, present, absent, late, rate) {
  var clean = sanitizeEmpNameAndId(name, empId);
  var finalName = clean.name || name || ('Employee ' + (i + 1));
  var finalEmpId = clean.empId || empId || ('SCS-' + (100 + i + 1));
  var photo = photoUrl || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(finalName) + '&background=e91e63&color=fff&size=128');
  return [
    i + 1,
    '=IMAGE("' + photo + '", 1)',
    finalName,
    finalEmpId,
    designation || '-',
    Number(present) || 0,
    Number(absent) || 0,
    Number(late) || 0,
    (rate !== undefined && rate !== null ? rate : 0) + '%'
  ];
}

function openTargetSpreadsheet(sheetUrl) {
  var targetId = extractSpreadsheetId(sheetUrl);
  if (targetId) {
    try {
      return SpreadsheetApp.openById(targetId);
    } catch (errById) {
      try {
        return SpreadsheetApp.openByUrl('https://docs.google.com/spreadsheets/d/' + targetId + '/edit');
      } catch (errByUrl) {
        return getActiveSpreadsheetSafe();
      }
    }
  }
  return getActiveSpreadsheetSafe();
}

function getOrCreateSummarySheet(ss) {
  var sheetName = 'Employee Attendance';
  var sheet = ss.getSheetByName(sheetName) || ss.getSheetByName('এমপ্লয়ি অ্যাটেন্ডেন্স');
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else if (sheet.getName() !== sheetName) {
    sheet.setName(sheetName);
  }
  // Legacy top banner clean-up
  if (sheet.getLastRow() >= 4) {
    var topVal = String(sheet.getRange(1, 1).getValue() || '').trim();
    if (topVal === 'EMPLOYEE ATTENDANCE MANAGEMENT SYSTEM') {
      sheet.deleteRows(1, 4);
    }
  }
  return sheet;
}

// Creates the table of any month that has data but no table yet (e.g. lost data), never duplicates
function fillMissingMonths(sheet, skipMonthKey, forceAll) {
  var initial = getInitialData();
  if (!initial || !initial.success || initial.standalone) return;
  var atts = initial.attendance || [];
  var minIdx = null;
  for (var i = 0; i < atts.length; i++) {
    var m = String(atts[i].date || '').match(/^(\d{4})-(\d{2})/);
    if (!m) continue;
    var idx = monthKeyToIndex(m[1] + '-' + m[2]);
    if (minIdx === null || idx < minIdx) minIdx = idx;
  }
  if (minIdx === null) return;
  var curIdx = monthKeyToIndex(currentMonthKey());
  if (curIdx - minIdx > 60) minIdx = curIdx - 60;
  var present = {};
  var blocks = findSummaryBlocks(sheet);
  for (var b = 0; b < blocks.length; b++) {
    if (blocks[b].monthIndex !== null) present[blocks[b].monthIndex] = true;
  }
  var skipIdx = skipMonthKey ? monthKeyToIndex(skipMonthKey) : -1;
  for (var x = minIdx; x <= curIdx; x++) {
    if (x === skipIdx) continue;
    if (present[x] && !forceAll) continue;
    var key = indexToMonthKey(x);
    var rows = buildMonthRows(key, initial.employees || [], atts, initial.officeSetup || {});
    upsertMonthBlock(sheet, key, rows);
  }
}

function exportLiveSummaryToSheet(sheetUrl, monthStr, summaryData) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(60000);
  } catch (lockErr) {
    return { success: false, error: 'অন্য একটি আপডেট চলছে, একটু পরে আবার চেষ্টা করুন।' };
  }
  try {
    var ss = openTargetSpreadsheet(sheetUrl);
    if (!ss) {
      return {
        success: false,
        error: 'গুগল স্প্রেডশিটে অ্যাক্সেস করা সম্ভব হয়নি। অনুগ্রহ করে লিংক যাচাই করুন এবং Share অপশনে \"Editor\" অনুমতি নিশ্চিত করুন।'
      };
    }

    var sheet = getOrCreateSummarySheet(ss);
    var monthKey = normalizeMonthKey(monthStr);
    var rowsData = [];

    if (summaryData && Array.isArray(summaryData) && summaryData.length > 0) {
      for (var i = 0; i < summaryData.length; i++) {
        var s = summaryData[i];
        rowsData.push(makeSummaryRow(i, s.name, s.empId, s.photoUrl, s.designation, s.present, s.absent, s.late, s.attendanceRate));
      }
    } else {
      var initial = getInitialData();
      rowsData = buildMonthRows(monthKey, initial.employees || [], initial.attendance || [], initial.officeSetup || {});
    }

    upsertMonthBlock(sheet, monthKey, rowsData);
    // Any earlier month that has data but is missing from the sheet is restored here
    try { fillMissingMonths(sheet, monthKey, false); } catch (fillErr) {}
    setSummaryColumnWidths(sheet);

    if (sheetUrl) {
      saveLiveExportUrlInSettings(sheetUrl);
    }

    var nowTimeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Dhaka', 'yyyy-MM-dd hh:mm a');
    return {
      success: true,
      sheetName: sheet.getName(),
      sheetUrl: ss.getUrl(),
      month: getEnglishMonthName(monthKey),
      lastUpdated: nowTimeStr,
      rowCount: rowsData.length
    };
  } catch (err) {
    return { success: false, error: err.toString() };
  } finally {
    try { lock.releaseLock(); } catch (e2) {}
  }
}

// Run this once from the Apps Script editor to rebuild every month's table from the Attendance data.
function rebuildAllMonths() {
  var url = '';
  try { url = PropertiesService.getScriptProperties().getProperty('liveExportSheetUrl') || ''; } catch (e) {}
  if (!url) {
    var ssAct = getActiveSpreadsheetSafe();
    var st = ssAct ? ssAct.getSheetByName('Settings') : null;
    if (st) {
      var rows = st.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] === 'liveExportSheetUrl') url = String(rows[i][1]);
      }
    }
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var ss = openTargetSpreadsheet(url);
    if (!ss) return { success: false, error: 'Destination sheet not found' };
    var sheet = getOrCreateSummarySheet(ss);
    fillMissingMonths(sheet, null, true);
    setSummaryColumnWidths(sheet);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

function saveLiveExportUrlInSettings(sheetUrl) {
  try {
    try {
      PropertiesService.getScriptProperties().setProperty('liveExportSheetUrl', sheetUrl);
      PropertiesService.getScriptProperties().setProperty('liveExportAutoSync', 'true');
    } catch (pe) {}

    var ss = getActiveSpreadsheetSafe();
    if (!ss || !sheetUrl) return;
    var sheet = ss.getSheetByName('Settings');
    if (!sheet) {
      sheet = ss.insertSheet('Settings');
      sheet.appendRow(['Key', 'Value']);
    }
    var rows = sheet.getDataRange().getValues();
    var found = false;
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][0] === 'liveExportSheetUrl') {
        sheet.getRange(i + 1, 2).setValue(sheetUrl);
        found = true;
        break;
      }
    }
    if (!found) {
      sheet.appendRow(['liveExportSheetUrl', sheetUrl]);
    }
  } catch (e) {}
}

function updateLiveExportSetup(liveExportSetup) {
  try {
    if (liveExportSetup) {
      try {
        var props = PropertiesService.getScriptProperties();
        if (props) {
          if (liveExportSetup.sheetUrl) props.setProperty('liveExportSheetUrl', liveExportSetup.sheetUrl);
          if (liveExportSetup.autoSync !== undefined) props.setProperty('liveExportAutoSync', String(liveExportSetup.autoSync));
        }
      } catch (pe) {}
    }

    var ss = getActiveSpreadsheetSafe();
    if (!ss) return { status: 'error', message: 'No active Google Sheet linked' };
    var sheet = ss.getSheetByName('Settings');
    if (!sheet) {
      sheet = ss.insertSheet('Settings');
      sheet.appendRow(['Key', 'Value']);
    }
    var config = readSettingsMap_(sheet);
    if (liveExportSetup) {
      if (liveExportSetup.sheetUrl !== undefined) config['liveExportSheetUrl'] = liveExportSetup.sheetUrl || '';
      if (liveExportSetup.sheetId !== undefined) config['liveExportSheetId'] = liveExportSetup.sheetId || '';
      if (liveExportSetup.autoSync !== undefined) config['liveExportAutoSync'] = String(liveExportSetup.autoSync);
    }

    writeSettingsMap_(sheet, config);
    return { status: 'success' };
  } catch (err) {
    return { status: 'error', message: err.toString() };
  }
}

var deferExport_ = false;
var exportPending_ = false;

function withLockThenExport_(fn) {
  deferExport_ = true;
  exportPending_ = false;
  var res;
  try {
    res = withScriptLock_(fn);
  } finally {
    deferExport_ = false;
  }
  if (exportPending_) {
    exportPending_ = false;
    try { triggerAutoLiveExportIfConfigured(); } catch (e) {}
  }
  return res;
}

function triggerAutoLiveExportIfConfigured() {
  if (deferExport_) { exportPending_ = true; return; }
  try {
    var sheetUrl = '';
    var autoSync = true;

    try {
      var props = PropertiesService.getScriptProperties();
      if (props) {
        var pUrl = props.getProperty('liveExportSheetUrl');
        var pSync = props.getProperty('liveExportAutoSync');
        if (pUrl) sheetUrl = pUrl;
        if (pSync === 'false') autoSync = false;
      }
    } catch (pe) {}

    if (!sheetUrl) {
      var ss = getActiveSpreadsheetSafe();
      if (ss) {
        var settingsSheet = ss.getSheetByName('Settings');
        if (settingsSheet) {
          var rows = settingsSheet.getDataRange().getValues();
          for (var i = 1; i < rows.length; i++) {
            if (rows[i][0] === 'liveExportSheetUrl') sheetUrl = String(rows[i][1]);
            if (rows[i][0] === 'liveExportAutoSync' && String(rows[i][1]) === 'false') autoSync = false;
          }
        }
      }
    }

    if (sheetUrl && autoSync) {
      exportLiveSummaryToSheet(sheetUrl, '', null);
    }
  } catch (e) {}
}
