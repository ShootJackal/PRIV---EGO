/**
 * ============================================================================
 * COLLECTION NEXUS — Mobile App API (Google Apps Script Web App)
 * ============================================================================
 *
 * DEPLOYMENT STEPS:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Create a new script file (e.g. "MobileAPI.gs")
 * 3. Paste this entire file into it
 * 4. Click Deploy → New Deployment
 * 5. Choose "Web app"
 * 6. Set "Execute as" → Me
 * 7. Set "Who has access" → Anyone
 * 8. Click Deploy and copy the URL
 * 9. In your Rork app, set EXPO_PUBLIC_GOOGLE_SCRIPT_URL to that URL
 *
 * ENDPOINTS:
 *   GET ?action=getCollectors        → list of active collectors
 *   GET ?action=getTasks             → list of tasks from TASK_LIST
 *   GET ?action=getTodayLog&collector=Name → today's log for collector
 *   GET ?action=getTaskMeta&task=Name     → task metadata + planned chunk
 *   GET ?action=getCollectorStats&collector=Name → collector statistics
 *   POST (JSON body)                 → submit action (ASSIGN/COMPLETE/CANCEL/NOTE_ONLY)
 *
 * This script mirrors CI_processSubmit_ exactly for the POST endpoint.
 * ============================================================================
 */

var API_CFG = {
  tz: "America/Los_Angeles",
  sheets: {
    ui: "Collector Interface",
    log: "Collector Task Assignments Log",
    collectors: "Collectors",
    taskActuals: "Task Actuals | Redashpull",
    taskList: "TASK_LIST",
    taskReq: "RS_Task_Req",
    caIndex: "CA_INDEX",
    actualsFallback: "Collector Actuals | RedashPull",
  },
  rules: {
    defaultRequiredHours: 4.0,
    segmentCount: 4,
    minChunkHours: 0.5,
    dailyCapHours: 7.0,
    doneEpsilonHours: 0.001,
  },
  perf: {
    maxLogRows: 2500,
  },
};

/* =========================================================================
 * RESPONSE HELPER
 * ========================================================================= */

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================================
 * doGet — READ ENDPOINTS
 * ========================================================================= */

function doGet(e) {
  try {
    var action = (e.parameter.action || "").trim();
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "getCollectors") {
      return jsonResponse_({ success: true, data: API_getCollectors_(ss) });
    }
    if (action === "getTasks") {
      return jsonResponse_({ success: true, data: API_getTasks_(ss) });
    }
    if (action === "getTodayLog") {
      var collector = (e.parameter.collector || "").trim();
      return jsonResponse_({ success: true, data: API_getTodayLog_(ss, collector) });
    }
    if (action === "getTaskMeta") {
      var taskName = (e.parameter.task || "").trim();
      return jsonResponse_({ success: true, data: API_getTaskMeta_(ss, taskName) });
    }
    if (action === "getCollectorStats") {
      var statsCollector = (e.parameter.collector || "").trim();
      return jsonResponse_({ success: true, data: API_getCollectorStats_(ss, statsCollector) });
    }
    if (action === "getRecollections") {
      return jsonResponse_({ success: true, data: API_getRecollections_(ss) });
    }
    if (action === "getFullLog") {
      var logCollector = (e.parameter.collector || "").trim();
      return jsonResponse_({ success: true, data: API_getFullLog_(ss, logCollector) });
    }
    if (action === "getTaskActualsSheet") {
      return jsonResponse_({ success: true, data: API_getTaskActualsSheet_(ss) });
    }
    if (action === "getAdminDashboardData") {
      return jsonResponse_({ success: true, data: API_getAdminDashboardData_(ss) });
    }
    if (action === "getCATaggedWeekly") {
      return jsonResponse_({ success: true, data: API_getCATaggedWeekly_(ss) });
    }
    if (action === "getWeeklyLog") {
      return jsonResponse_({ success: true, data: API_getWeeklyLog_(ss) });
    }

    return jsonResponse_({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message || String(err) });
  }
}

/* =========================================================================
 * doPost — SUBMIT ACTION (mirrors CI_processSubmit_)
 * ========================================================================= */

function doPost(e) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(25000);

  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var log = ss.getSheetByName(API_CFG.sheets.log);
    var ta = ss.getSheetByName(API_CFG.sheets.taskActuals);

    if (!log) throw new Error("Missing sheet: " + API_CFG.sheets.log);

    var collector = String(payload.collector || "").trim();
    var taskName = API_cleanTaskName_(payload.task || "");
    var hoursInput = API_toNum_(payload.hours, 0);
    var actionType = String(payload.actionType || "").trim();
    var noteText = String(payload.notes || "").trim();

    var eps = Math.max(Number(API_CFG.rules.doneEpsilonHours || 0.001), 1e-9);

    if (!collector) {
      return jsonResponse_({ success: false, error: "Select your name first." });
    }

    if (!actionType || actionType === "NONE") {
      if (noteText && taskName) actionType = "NOTE_ONLY";
      else return jsonResponse_({ success: false, error: "No action specified." });
    }

    if ((actionType === "ASSIGN" || actionType === "COMPLETE" || actionType === "CANCEL" || actionType === "NOTE_ONLY") && !taskName) {
      return jsonResponse_({ success: false, error: "Select a task first." });
    }

    var today = API_today_();
    var todayStr = Utilities.formatDate(today, API_CFG.tz, "yyyy-MM-dd");

    var logLast = log.getLastRow();
    var logCols = log.getLastColumn();
    var map = API_getHeaderMap_(log);

    var n = Math.min(Math.max(logLast - 1, 0), API_CFG.perf.maxLogRows);
    var data = n ? log.getRange(2, 1, n, logCols).getValues() : [];

    var matchIndex = -1;
    if (taskName) {
      var keyTask = API_norm_(taskName);
      for (var i = data.length - 1; i >= 0; i--) {
        var r = data[i];
        var rCollector = String(r[map["Collector"] - 1] || "").trim();
        var rTaskName = API_cleanTaskName_(r[map["Task Name"] - 1]);
        var rDate = r[map["Assigned Date"] - 1];
        if (!rCollector || !rTaskName || !rDate) continue;
        var dStr = Utilities.formatDate(new Date(rDate), API_CFG.tz, "yyyy-MM-dd");
        if (rCollector === collector && dStr === todayStr && API_norm_(rTaskName) === keyTask) {
          matchIndex = i;
          break;
        }
      }
    }

    if (actionType === "NOTE_ONLY") {
      if (matchIndex === -1) {
        return jsonResponse_({ success: false, error: "No matching assignment today for notes. Assign the task first." });
      }
      var now = new Date();
      var noteStamp = Utilities.formatDate(now, API_CFG.tz, "yyyy-MM-dd HH:mm");
      var noteBlock = "\n\n--- " + noteStamp + " ---\n" + noteText;
      var sheetRow = matchIndex + 2;
      var oldNotes = String(log.getRange(sheetRow, map["Notes"]).getValue() || "");
      log.getRange(sheetRow, map["Notes"]).setValue(oldNotes + noteBlock);
      return jsonResponse_({ success: true, action: "NOTE_ONLY", message: "Notes saved." });
    }

    var reqMap = API_getRequiredHoursMap_(ss);
    var meta = taskName ? API_lookupTaskMeta_(ta, taskName) : {
      id: "", status: "", required: API_CFG.rules.defaultRequiredHours, remaining: 0, collected: 0
    };

    var taskId = meta.id;
    var required = API_resolveRequiredHours_(taskName, meta, reqMap);
    var remainingToCollect = Math.max(required - (Number(meta.collected) || 0), 0);
    var planned = API_computePlannedChunk_(required, remainingToCollect);

    if (matchIndex !== -1) {
      var existingPlanned = API_toNum_(data[matchIndex][map["Planned Hours"] - 1], 0);
      if (existingPlanned > 0) planned = existingPlanned;
    }

    if ((actionType === "ASSIGN" || actionType === "COMPLETE") && planned <= eps) {
      return jsonResponse_({ success: false, error: "Task is fully collected already. No segment to log." });
    }

    if (actionType === "ASSIGN" && meta.status === "DONE" && remainingToCollect <= eps) {
      return jsonResponse_({ success: false, error: "Task is already DONE." });
    }

    if (actionType === "ASSIGN" && matchIndex === -1) {
      var sumPlanned = 0;
      for (var j = 0; j < data.length; j++) {
        var dr = data[j];
        var drCollector = String(dr[map["Collector"] - 1] || "").trim();
        var drDate = dr[map["Assigned Date"] - 1];
        var drStatus = String(dr[map["Assignment Status"] - 1] || "").trim();
        if (!drCollector || !drDate) continue;
        var drStr = Utilities.formatDate(new Date(drDate), API_CFG.tz, "yyyy-MM-dd");
        if (drCollector !== collector || drStr !== todayStr) continue;
        if (drStatus === "Canceled") continue;
        sumPlanned += API_toNum_(dr[map["Planned Hours"] - 1], 0);
      }
      if (sumPlanned + planned > API_CFG.rules.dailyCapHours + 1e-9) {
        return jsonResponse_({
          success: false,
          error: "Daily cap hit: " + sumPlanned.toFixed(2) + "h already assigned.",
          dailyPlanned: sumPlanned
        });
      }
    }

    var hours = Math.max(0, hoursInput);

    var remaining = Math.max(planned - hours, 0);
    var status = "";
    var completedDate = "";

    if (actionType === "ASSIGN") {
      status = "In Progress";
    } else if (actionType === "COMPLETE") {
      status = (hours + eps >= planned) ? "Completed" : "Partial";
      if (status === "Completed") completedDate = new Date();
    } else if (actionType === "CANCEL") {
      status = "Canceled";
      completedDate = new Date();
    }

    var nowTs = new Date();
    var noteStampFull = Utilities.formatDate(nowTs, API_CFG.tz, "yyyy-MM-dd HH:mm");
    var noteBlockFull = noteText ? "\n\n--- " + noteStampFull + " ---\n" + noteText : "";

    if (matchIndex === -1) {
      var assignmentId = Utilities.getUuid();
      var weekStart = API_weekStart_(today);

      var row = [
        assignmentId,
        taskId,
        taskName,
        collector,
        today,
        API_round2_(planned),
        status,
        API_round2_(hours),
        API_round2_(remaining),
        completedDate,
        noteText ? noteBlockFull.trim() : "",
        weekStart
      ];

      API_prependLogRow_(log, row);

      return jsonResponse_({
        success: true,
        action: actionType,
        message: "Saved: " + actionType,
        assignmentId: assignmentId,
        planned: API_round2_(planned),
        hours: API_round2_(hours),
        remaining: API_round2_(remaining),
        status: status
      });
    } else {
      var sRow = matchIndex + 2;

      log.getRange(sRow, map["TaskID"]).setValue(taskId);
      log.getRange(sRow, map["Task Name"]).setValue(taskName);
      log.getRange(sRow, map["Planned Hours"]).setValue(API_round2_(planned));
      log.getRange(sRow, map["Assignment Status"]).setValue(status);
      log.getRange(sRow, map["Logged Hours"]).setValue(API_round2_(hours));
      log.getRange(sRow, map["Remaining Hours Task Completion"]).setValue(API_round2_(remaining));
      if (completedDate) log.getRange(sRow, map["Completed Date"]).setValue(completedDate);

      if (noteText) {
        var oldN = String(log.getRange(sRow, map["Notes"]).getValue() || "");
        log.getRange(sRow, map["Notes"]).setValue(oldN + noteBlockFull);
      }

      var existingId = String(data[matchIndex][map["AssignmentID"] ? map["AssignmentID"] - 1 : 0] || "");

      return jsonResponse_({
        success: true,
        action: actionType,
        message: "Saved: " + actionType,
        assignmentId: existingId,
        planned: API_round2_(planned),
        hours: API_round2_(hours),
        remaining: API_round2_(remaining),
        status: status
      });
    }
  } catch (err) {
    return jsonResponse_({ success: false, error: err.message || String(err) });
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================================
 * GET COLLECTORS
 * ========================================================================= */

function API_getCollectors_(ss) {
  var sh = ss.getSheetByName(API_CFG.sheets.collectors);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];

  var vals = sh.getRange(2, 1, last - 1, 5).getValues();
  var seen = {};
  var out = [];

  for (var i = 0; i < vals.length; i++) {
    var name = String(vals[i][0] || "").trim();
    var rig = String(vals[i][1] || "").trim();
    var active = (vals[i][4] === true || vals[i][4] === "" || vals[i][4] == null);
    if (!name || !active) continue;
    if (!seen[name]) {
      seen[name] = { name: name, rigs: [] };
      out.push(seen[name]);
    }
    if (rig) seen[name].rigs.push(rig);
  }
  return out;
}

/* =========================================================================
 * GET TASKS
 * ========================================================================= */

function API_getTasks_(ss) {
  var sh = ss.getSheetByName(API_CFG.sheets.taskList);
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];

  var vals = sh.getRange(2, 1, last - 1, 1).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var name = String(vals[i][0] || "").trim();
    if (name) out.push({ name: name });
  }
  return out;
}

/* =========================================================================
 * GET TODAY LOG
 * ========================================================================= */

function API_getTodayLog_(ss, collector) {
  var log = ss.getSheetByName(API_CFG.sheets.log);
  if (!log || !collector) return [];

  var last = log.getLastRow();
  if (last < 2) return [];

  var map = API_getHeaderMap_(log);
  var n = Math.min(Math.max(last - 1, 0), API_CFG.perf.maxLogRows);
  var data = n ? log.getRange(2, 1, n, log.getLastColumn()).getValues() : [];

  var todayStr = Utilities.formatDate(API_today_(), API_CFG.tz, "yyyy-MM-dd");
  var entries = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var rCollector = String(r[map["Collector"] - 1] || "").trim();
    if (rCollector !== collector) continue;

    var dt = r[map["Assigned Date"] - 1];
    if (!(dt instanceof Date)) continue;
    var dStr2 = Utilities.formatDate(dt, API_CFG.tz, "yyyy-MM-dd");
    if (dStr2 !== todayStr) continue;

    var taskName = API_cleanTaskName_(r[map["Task Name"] - 1]);
    if (!taskName) continue;

    var assignmentId = map["AssignmentID"] ? String(r[map["AssignmentID"] - 1] || "") : "";
    var taskId2 = map["TaskID"] ? String(r[map["TaskID"] - 1] || "") : "";
    var st = String(r[map["Assignment Status"] - 1] || "").trim();
    var logged = API_toNum_(r[map["Logged Hours"] - 1], 0);
    var planned2 = API_toNum_(r[map["Planned Hours"] - 1], 0);
    var rem2 = API_toNum_(r[map["Remaining Hours Task Completion"] - 1], 0);
    var notes = String(r[map["Notes"] - 1] || "").trim();
    var completedDate2 = r[map["Completed Date"] - 1] || null;

    entries.push({
      assignmentId: assignmentId,
      taskId: taskId2,
      taskName: taskName,
      status: st || "In Progress",
      loggedHours: API_round2_(logged),
      plannedHours: API_round2_(planned2),
      remainingHours: API_round2_(rem2),
      notes: notes,
      assignedDate: dStr2,
      completedDate: completedDate2 instanceof Date
        ? Utilities.formatDate(completedDate2, API_CFG.tz, "yyyy-MM-dd HH:mm")
        : ""
    });
  }

  return entries;
}

/* =========================================================================
 * GET TASK META
 * ========================================================================= */

function API_getTaskMeta_(ss, taskName) {
  var ta = ss.getSheetByName(API_CFG.sheets.taskActuals);
  if (!ta) return null;

  var meta = API_lookupTaskMeta_(ta, taskName);
  var reqMap = API_getRequiredHoursMap_(ss);
  var required = API_resolveRequiredHours_(taskName, meta, reqMap);
  var remainingToCollect = Math.max(required - (Number(meta.collected) || 0), 0);
  var planned = API_computePlannedChunk_(required, remainingToCollect);

  return {
    taskId: meta.id,
    status: meta.status,
    requiredHours: required,
    collectedHours: meta.collected,
    remainingHours: remainingToCollect,
    plannedChunk: planned,
    goodHours: meta.good
  };
}

/* =========================================================================
 * GET COLLECTOR STATS (NEW — powers the Stats tab)
 * ========================================================================= */

function API_getCollectorStats_(ss, collectorName) {
  var log = ss.getSheetByName(API_CFG.sheets.log);
  if (!log || !collectorName) {
    return {
      collectorName: collectorName || "",
      totalAssigned: 0,
      totalCompleted: 0,
      totalCanceled: 0,
      totalLoggedHours: 0,
      totalPlannedHours: 0,
      weeklyLoggedHours: 0,
      weeklyCompleted: 0,
      activeTasks: 0,
      completionRate: 0,
      avgHoursPerTask: 0,
      topTasks: []
    };
  }

  var last = log.getLastRow();
  if (last < 2) {
    return {
      collectorName: collectorName,
      totalAssigned: 0,
      totalCompleted: 0,
      totalCanceled: 0,
      totalLoggedHours: 0,
      totalPlannedHours: 0,
      weeklyLoggedHours: 0,
      weeklyCompleted: 0,
      activeTasks: 0,
      completionRate: 0,
      avgHoursPerTask: 0,
      topTasks: []
    };
  }

  var map = API_getHeaderMap_(log);
  var n = Math.min(Math.max(last - 1, 0), API_CFG.perf.maxLogRows);
  var data = n ? log.getRange(2, 1, n, log.getLastColumn()).getValues() : [];

  var today = API_today_();
  var weekStart = API_weekStart_(today);
  var weekStartStr = Utilities.formatDate(weekStart, API_CFG.tz, "yyyy-MM-dd");

  var totalAssigned = 0;
  var totalCompleted = 0;
  var totalCanceled = 0;
  var totalLoggedHours = 0;
  var totalPlannedHours = 0;
  var weeklyLoggedHours = 0;
  var weeklyCompleted = 0;
  var activeTasks = 0;
  var recentTasks = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var rCollector = String(r[map["Collector"] - 1] || "").trim();
    if (rCollector !== collectorName) continue;

    totalAssigned++;

    var st = String(r[map["Assignment Status"] - 1] || "").trim();
    var logged = API_toNum_(r[map["Logged Hours"] - 1], 0);
    var planned = API_toNum_(r[map["Planned Hours"] - 1], 0);
    var taskName = API_cleanTaskName_(r[map["Task Name"] - 1]);

    totalLoggedHours += logged;
    totalPlannedHours += planned;

    if (st === "Completed") totalCompleted++;
    else if (st === "Canceled") totalCanceled++;
    else if (st === "In Progress" || st === "Partial") activeTasks++;

    var dt = r[map["Assigned Date"] - 1];
    if (dt instanceof Date) {
      var dStr = Utilities.formatDate(dt, API_CFG.tz, "yyyy-MM-dd");
      if (dStr >= weekStartStr) {
        weeklyLoggedHours += logged;
        if (st === "Completed") weeklyCompleted++;
      }
    }

    if (recentTasks.length < 15 && taskName) {
      recentTasks.push({
        name: taskName,
        hours: API_round2_(logged),
        status: st || "In Progress"
      });
    }
  }

  var completionRate = totalAssigned > 0
    ? API_round2_((totalCompleted / totalAssigned) * 100)
    : 0;

  var avgHoursPerTask = totalCompleted > 0
    ? API_round2_(totalLoggedHours / totalCompleted)
    : 0;

  return {
    collectorName: collectorName,
    totalAssigned: totalAssigned,
    totalCompleted: totalCompleted,
    totalCanceled: totalCanceled,
    totalLoggedHours: API_round2_(totalLoggedHours),
    totalPlannedHours: API_round2_(totalPlannedHours),
    weeklyLoggedHours: API_round2_(weeklyLoggedHours),
    weeklyCompleted: weeklyCompleted,
    activeTasks: activeTasks,
    completionRate: completionRate,
    avgHoursPerTask: avgHoursPerTask,
    topTasks: recentTasks
  };
}

/* =========================================================================
 * TASK METADATA HELPERS
 * ========================================================================= */

function API_lookupTaskMeta_(taskActualsSheet, taskName) {
  var result = {
    id: "", status: "", required: API_CFG.rules.defaultRequiredHours,
    remaining: 0, collected: 0, good: 0
  };
  if (!taskActualsSheet) return result;
  var last = taskActualsSheet.getLastRow();
  if (last < 2) return result;

  var hm = API_getHeaderMap_(taskActualsSheet);
  if (!hm["Task Name"]) return result;

  var vals = taskActualsSheet.getRange(2, 1, last - 1, taskActualsSheet.getLastColumn()).getValues();
  var key = API_norm_(API_cleanTaskName_(taskName));

  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    var name = API_cleanTaskName_(r[hm["Task Name"] - 1]);
    if (API_norm_(name) !== key) continue;

    var collected = hm["Collected Hours"] ? API_toNum_(r[hm["Collected Hours"] - 1], 0) : 0;
    var rem = hm["Remaining Hours"] ? API_toNum_(r[hm["Remaining Hours"] - 1], 0) : 0;
    var req = hm["Required Hours"] ? API_toNum_(r[hm["Required Hours"] - 1], 0) : 0;
    if (req <= 0) req = Math.max(collected + Math.max(rem, 0), API_CFG.rules.defaultRequiredHours);

    return {
      id: String((hm["Task ID"] ? r[hm["Task ID"] - 1] : r[0]) || "").trim(),
      status: String((hm["Status"] ? r[hm["Status"] - 1] : "") || "").trim().toUpperCase(),
      required: req,
      remaining: Math.max(rem, 0),
      collected: Math.max(collected, 0),
      good: hm["Good Hours"] ? API_toNum_(r[hm["Good Hours"] - 1], 0) : 0
    };
  }
  return result;
}

function API_getRequiredHoursMap_(ss) {
  var sh = ss.getSheetByName(API_CFG.sheets.taskReq);
  var m = {};
  if (!sh) return m;
  var last = sh.getLastRow();
  if (last < 2) return m;

  var vals = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    var raw = API_cleanTaskName_(vals[i][0]);
    var req = Number(vals[i][1]);
    if (!raw || !isFinite(req) || req <= 0) continue;
    var vars = API_taskKeyVariants_(raw);
    for (var j = 0; j < vars.length; j++) m[vars[j]] = req;
  }
  return m;
}

function API_resolveRequiredHours_(taskName, meta, reqMap) {
  var vars = API_taskKeyVariants_(taskName);
  for (var i = 0; i < vars.length; i++) {
    var v = reqMap[vars[i]];
    if (v && isFinite(v) && v > 0) return v;
  }
  if (meta && isFinite(meta.required) && meta.required > 0) return meta.required;
  return API_CFG.rules.defaultRequiredHours;
}

function API_computePlannedChunk_(requiredHours, remainingHours) {
  var req = Math.max(Number(requiredHours) || 0, API_CFG.rules.defaultRequiredHours);
  var rem = Math.max(Number(remainingHours) || 0, 0);
  if (rem <= 0) return 0;
  var count = Math.max(1, Math.floor(Number(API_CFG.rules.segmentCount || 4)));
  var floorChunk = Math.max(0, Number(API_CFG.rules.minChunkHours || 0));
  var chunk = req / count;
  if (floorChunk > 0) chunk = Math.max(chunk, Math.min(floorChunk, rem));
  chunk = Math.min(chunk, rem);
  return API_round2_(chunk);
}

function API_taskKeyVariants_(name) {
  var v = [];
  var raw = String(name || "").trim();
  if (!raw) return v;
  var base = API_norm_(raw);
  if (base) v.push(base);
  var stripped = API_norm_(API_stripTaskPrefix_(raw));
  if (stripped && stripped !== base) v.push(stripped);
  return v;
}

function API_stripTaskPrefix_(s) {
  var raw = String(s || "").trim();
  if (raw.indexOf("|") !== -1) {
    var parts = raw.split("|");
    if (parts.length >= 2) {
      var left = parts[0].trim();
      if (left.length > 0 && left.length <= 25) return parts.slice(1).join("|").trim();
    }
  }
  return raw.replace(/^\s*(DIVERSE|NEXUS|FLAGSHIP|EGO|EGO-MX|EGO-SF)\s*[:\-]?\s*/i, "").trim();
}

/* =========================================================================
 * LOG HELPERS
 * ========================================================================= */

function API_prependLogRow_(logSheet, values) {
  var lastCol = logSheet.getLastColumn();
  var valueCols = values.length;
  logSheet.insertRowBefore(2);

  if (logSheet.getLastRow() >= 3) {
    var template = logSheet.getRange(3, 1, 1, lastCol);
    var target = logSheet.getRange(2, 1, 1, lastCol);
    template.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_FORMAT, false);
    template.copyTo(target, SpreadsheetApp.CopyPasteType.PASTE_DATA_VALIDATION, false);

    var formulas = template.getFormulas()[0];
    var formulaRow = [];
    for (var c = 0; c < lastCol; c++) formulaRow.push("");
    for (var c2 = valueCols; c2 < lastCol; c2++) {
      if (formulas[c2]) formulaRow[c2] = formulas[c2];
    }
    if (formulaRow.some(function(f) { return !!f; })) target.setFormulas([formulaRow]);
  }

  logSheet.getRange(2, 1, 1, valueCols).setValues([values]);
}

function API_getHeaderMap_(sheet) {
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) map[String(headers[i]).trim()] = i + 1;
  }
  return map;
}

/* =========================================================================
 * DATE / UTILITY HELPERS
 * ========================================================================= */

function API_today_() {
  var now = new Date();
  return new Date(Utilities.formatDate(now, API_CFG.tz, "yyyy-MM-dd") + "T00:00:00");
}

function API_weekStart_(d0) {
  var d = new Date(d0);
  var day = Number(Utilities.formatDate(d, API_CFG.tz, "u"));
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function API_getAdminWeekStart_(ss) {
  var sheet = ss.getSheetByName("ADMIN_DASHBOARD");
  if (!sheet) return null;
  try {
    var hm = API_getHeaderMap_(sheet);
    if (hm["Week Start"]) {
      var val = sheet.getRange(2, hm["Week Start"]).getValue();
      if (val instanceof Date) return val;
    }
    var val2 = sheet.getRange("B2").getValue();
    if (val2 instanceof Date) return val2;
  } catch (e) {}
  return null;
}

function API_toNum_(v, fallback) {
  if (typeof v === "number") return v;
  var n = Number(String(v || "").replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? (fallback || 0) : n;
}

function API_round2_(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function API_norm_(s) {
  return String(s || "").toLowerCase().replace(/_/g, "").replace(/[^a-z0-9]/g, "");
}

function API_cleanTaskName_(v) {
  return String(v || "").replace(/^✅\s*/, "").trim();
}

/* =========================================================================
 * RECOLLECTIONS FROM ADMIN_DASHBOARD C28+
 * ========================================================================= */

function API_getRecollections_(ss) {
  var sheet = ss.getSheetByName("ADMIN_DASHBOARD");
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 28) return [];
  var range = sheet.getRange(28, 3, lastRow - 27, 1);
  var values = range.getValues();
  var items = [];
  for (var i = 0; i < values.length; i++) {
    var val = String(values[i][0] || "").trim();
    if (val) items.push(val);
  }
  return items;
}

/* =========================================================================
 * GET FULL LOG (recent entries, optionally filtered by collector)
 * ========================================================================= */

function API_getFullLog_(ss, collector) {
  var log = ss.getSheetByName(API_CFG.sheets.log);
  if (!log) return [];
  var last = log.getLastRow();
  if (last < 2) return [];

  var map = API_getHeaderMap_(log);
  var n = Math.min(Math.max(last - 1, 0), 100);
  var data = n ? log.getRange(2, 1, n, log.getLastColumn()).getValues() : [];

  var entries = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var rCollector = String(r[map["Collector"] - 1] || "").trim();
    if (collector && rCollector !== collector) continue;

    var taskName = API_cleanTaskName_(r[map["Task Name"] - 1]);
    if (!taskName) continue;

    var dt = r[map["Assigned Date"] - 1];
    var dateStr = "";
    if (dt instanceof Date) {
      dateStr = Utilities.formatDate(dt, API_CFG.tz, "yyyy-MM-dd");
    }

    entries.push({
      collector: rCollector,
      taskName: taskName,
      status: String(r[map["Assignment Status"] - 1] || "").trim() || "In Progress",
      loggedHours: API_round2_(API_toNum_(r[map["Logged Hours"] - 1], 0)),
      plannedHours: API_round2_(API_toNum_(r[map["Planned Hours"] - 1], 0)),
      remainingHours: API_round2_(API_toNum_(r[map["Remaining Hours Task Completion"] - 1], 0)),
      assignedDate: dateStr
    });

    if (entries.length >= 50) break;
  }
  return entries;
}

/* =========================================================================
 * GET CA_TAGGED WEEKLY — location-tagged collection rows for this week
 * Reads from CA_Tagged sheet: Date, Rig ID, Site, Collector, Task Name, Hours Uploaded, Minutes Uploaded
 * SF rule: EGO-PROD-(2|3|4|5|6|9) → EGO-SF, everything else → EGO-MX
 * ========================================================================= */

function API_getCATaggedWeekly_(ss) {
  var sh = ss.getSheetByName("CA_Tagged");
  if (!sh) {
    var sh2 = ss.getSheetByName("CA_cache");
    if (!sh2) return [];
    sh = sh2;
  }

  var last = sh.getLastRow();
  if (last < 2) return [];

  var today = API_today_();
  var adminWeekStart = API_getAdminWeekStart_(ss);
  var weekStart = adminWeekStart || API_weekStart_(today);
  var weekStartStr = Utilities.formatDate(weekStart, API_CFG.tz, "yyyy-MM-dd");
  Logger.log("CA_Tagged weekStartStr: " + weekStartStr + " (admin: " + !!adminWeekStart + ")");

  var cols = Math.min(sh.getLastColumn(), 8);
  var data = sh.getRange(2, 1, last - 1, cols).getValues();
  var out = [];

  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var rawDate = r[0];
    if (!rawDate) continue;

    var dateStr = "";
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, API_CFG.tz, "yyyy-MM-dd");
    } else {
      dateStr = String(rawDate || "").trim().slice(0, 10);
    }
    if (!dateStr || dateStr < weekStartStr) continue;

    var rigId = String(r[1] || "").trim().toUpperCase();
    var siteRaw = String(r[2] || "").trim().toUpperCase();
    var collector = String(r[3] || "").trim();
    var taskName = API_cleanTaskName_(r[4] || "");
    var hoursUp = API_toNum_(r[5], 0);
    var minsUp = API_toNum_(r[6], 0);
    var totalHours = API_round2_(hoursUp + minsUp / 60);

    if (!collector) continue;

    var isSF = /^EGO-PROD-(2|3|4|5|6|9)$/i.test(rigId);
    var site = isSF ? "SF" : "MX";
    if (siteRaw === "EGO-SF") site = "SF";
    else if (siteRaw === "EGO-MX") site = "MX";

    out.push({
      date: dateStr,
      rigId: rigId,
      site: site,
      collector: collector,
      taskName: taskName,
      hours: totalHours
    });
  }
  return out;
}

/* =========================================================================
 * GET WEEKLY LOG — full task assignment log rows for this week (no 50-row cap)
 * ========================================================================= */

function API_getWeeklyLog_(ss) {
  var log = ss.getSheetByName(API_CFG.sheets.log);
  if (!log) return [];
  var last = log.getLastRow();
  if (last < 2) return [];

  var today = API_today_();
  var adminWeekStart = API_getAdminWeekStart_(ss);
  var weekStart = adminWeekStart || API_weekStart_(today);
  var weekStartStr = Utilities.formatDate(weekStart, API_CFG.tz, "yyyy-MM-dd");
  Logger.log("WeeklyLog weekStartStr: " + weekStartStr + " (admin: " + !!adminWeekStart + ")");

  var map = API_getHeaderMap_(log);
  var n = Math.min(Math.max(last - 1, 0), API_CFG.perf.maxLogRows);
  var data = n ? log.getRange(2, 1, n, log.getLastColumn()).getValues() : [];

  var entries = [];
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    var rCollector = String(r[map["Collector"] - 1] || "").trim();
    if (!rCollector) continue;

    var dt = r[map["Assigned Date"] - 1];
    var dateStr = "";
    if (dt instanceof Date) {
      dateStr = Utilities.formatDate(dt, API_CFG.tz, "yyyy-MM-dd");
    }
    if (!dateStr || dateStr < weekStartStr) continue;

    var taskName = API_cleanTaskName_(r[map["Task Name"] - 1]);
    if (!taskName) continue;

    entries.push({
      collector: rCollector,
      taskName: taskName,
      status: String(r[map["Assignment Status"] - 1] || "").trim() || "In Progress",
      loggedHours: API_round2_(API_toNum_(r[map["Logged Hours"] - 1], 0)),
      plannedHours: API_round2_(API_toNum_(r[map["Planned Hours"] - 1], 0)),
      assignedDate: dateStr
    });
  }
  return entries;
}

/* =========================================================================
 * GET TASK ACTUALS SHEET (all tasks with status/hours)
 * ========================================================================= */

function API_getTaskActualsSheet_(ss) {
  var ta = ss.getSheetByName(API_CFG.sheets.taskActuals);
  if (!ta) return [];
  var last = ta.getLastRow();
  if (last < 2) return [];

  var hm = API_getHeaderMap_(ta);
  var vals = ta.getRange(2, 1, last - 1, ta.getLastColumn()).getValues();
  var out = [];

  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    var taskName = API_cleanTaskName_(r[hm["Task Name"] - 1]);
    if (!taskName) continue;

    var lastRedash = "";
    if (hm["Last Redash"]) {
      var lrVal = r[hm["Last Redash"] - 1];
      if (lrVal instanceof Date) {
        lastRedash = Utilities.formatDate(lrVal, API_CFG.tz, "yyyy-MM-dd HH:mm");
      }
    }

    out.push({
      taskName: taskName,
      status: String(hm["Status"] ? r[hm["Status"] - 1] : "").trim(),
      collectedHours: hm["Collected Hours"] ? API_round2_(API_toNum_(r[hm["Collected Hours"] - 1], 0)) : 0,
      goodHours: hm["Good Hours"] ? API_round2_(API_toNum_(r[hm["Good Hours"] - 1], 0)) : 0,
      remainingHours: hm["Remaining Hours"] ? API_round2_(API_toNum_(r[hm["Remaining Hours"] - 1], 0)) : 0,
      lastRedash: lastRedash
    });
  }
  return out;
}

/* =========================================================================
 * GET ADMIN DASHBOARD DATA (summary + recollections)
 * ========================================================================= */

function API_getAdminDashboardData_(ss) {
  var recollections = API_getRecollections_(ss);
  var ta = ss.getSheetByName(API_CFG.sheets.taskActuals);

  var totalTasks = 0, completedTasks = 0, inProgressTasks = 0, recollectTasks = 0;

  if (ta) {
    var last = ta.getLastRow();
    if (last >= 2) {
      var hm = API_getHeaderMap_(ta);
      var vals = ta.getRange(2, 1, last - 1, ta.getLastColumn()).getValues();

      for (var i = 0; i < vals.length; i++) {
        var r = vals[i];
        var taskName = API_cleanTaskName_(r[hm["Task Name"] - 1]);
        if (!taskName) continue;
        totalTasks++;
        var st = String(hm["Status"] ? r[hm["Status"] - 1] : "").trim().toUpperCase();
        if (st === "DONE") completedTasks++;
        else if (st === "IN_PROGRESS") inProgressTasks++;
        else if (st === "RECOLLECT") recollectTasks++;
      }
    }
  }

  return {
    recollections: recollections,
    totalTasks: totalTasks,
    completedTasks: completedTasks,
    inProgressTasks: inProgressTasks,
    recollectTasks: recollectTasks
  };
}
