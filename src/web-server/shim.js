/**
 * shim.js — injected into index.html before </head>
 * Replaces window.electronAPI with a WebSocket proxy so the renderer
 * runs in a browser without any code changes.
 *
 * Protocol:
 *   Browser → Server (request):  { id, type, payload }
 *   Server → Browser (response): { id, type: 'response', payload }
 *   Server → Browser (error):    { id, type: 'error', payload: { message } }
 *   Server → Browser (push):     { type: 'push', event, payload }
 */
(function () {
  'use strict';

  var wsUrl = 'ws://' + location.host + '/ws';
  var ws = new WebSocket(wsUrl);

  var pending = new Map();        // id → { resolve, reject }
  var pushListeners = new Map();  // event → Set<callback>
  var messageQueue = [];          // queued while ws not yet open
  var ready = false;

  ws.addEventListener('open', function () {
    ready = true;
    messageQueue.forEach(function (msg) { ws.send(msg); });
    messageQueue = [];
  });

  ws.addEventListener('message', function (evt) {
    var msg;
    try { msg = JSON.parse(evt.data); } catch (e) { return; }

    if (msg.type === 'push') {
      var listeners = pushListeners.get(msg.event);
      if (listeners) {
        listeners.forEach(function (cb) { try { cb(msg.payload); } catch (e) { console.error('[shim push]', e); } });
      }
      return;
    }

    var entry = pending.get(msg.id);
    if (!entry) return;
    pending.delete(msg.id);
    if (msg.type === 'error') {
      entry.reject(new Error(msg.payload && msg.payload.message ? msg.payload.message : 'Unknown error'));
    } else {
      entry.resolve(msg.payload);
    }
  });

  ws.addEventListener('error', function (e) {
    console.error('[shim] WebSocket error', e);
  });

  function invoke(type, payload) {
    return new Promise(function (resolve, reject) {
      var id = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      pending.set(id, { resolve: resolve, reject: reject });
      var raw = JSON.stringify({ id: id, type: type, payload: payload !== undefined ? payload : {} });
      if (ready) {
        ws.send(raw);
      } else {
        messageQueue.push(raw);
      }
    });
  }

  function addPushListener(event, cb) {
    if (!pushListeners.has(event)) pushListeners.set(event, new Set());
    pushListeners.get(event).add(cb);
    return function () {
      var s = pushListeners.get(event);
      if (s) s.delete(cb);
    };
  }

  // Prompt-based directory selection (fallback for browser environment)
  function promptForDirectory(title) {
    var dirPath = window.prompt(title || '请输入目录路径：');
    return dirPath ? dirPath.trim() : null;
  }

  window.electronAPI = {
    // --- Editor ---
    loadAllEditors: function () {
      return invoke('editor:load-all', {});
    },

    saveEditor: function (editor) {
      return invoke('editor:save', editor);
    },

    saveAllEditors: function (editors) {
      return invoke('editor:save-all', editors);
    },

    renameEditor: function (id, newName) {
      return invoke('editor:rename', { id: id, newName: newName });
    },

    deleteEditor: function (id) {
      return invoke('editor:delete', { id: id });
    },

    saveOrder: function (order) {
      return invoke('editor:save-order', { order: order });
    },

    getNextIndex: function () {
      return invoke('editor:get-next-index', {});
    },

    incrementNextIndex: function () {
      return invoke('editor:increment-next-index', {});
    },

    // --- Terminal ---
    createTerminal: function (sessionId, cwdOrOptions) {
      return invoke('terminal:create', { sessionId: sessionId, cwdOrOptions: cwdOrOptions });
    },

    writeTerminal: function (sessionId, data) {
      return invoke('terminal:write', { sessionId: sessionId, data: data });
    },

    runTerminalCommand: function (sessionId, command) {
      return invoke('terminal:run-command', { sessionId: sessionId, command: command });
    },

    resizeTerminal: function (sessionId, cols, rows) {
      return invoke('terminal:resize', { sessionId: sessionId, cols: cols, rows: rows });
    },

    killTerminal: function (sessionId) {
      return invoke('terminal:kill', { sessionId: sessionId });
    },

    onTerminalData: function (sessionId, callback) {
      return addPushListener('terminal:data-' + sessionId, callback);
    },

    onTerminalExit: function (sessionId, callback) {
      // once-only: auto-remove after first fire
      var unsub;
      var wrapped = function (data) {
        if (unsub) unsub();
        callback(data.exitCode, data.signal);
      };
      unsub = addPushListener('terminal:exit-' + sessionId, wrapped);
      return unsub;
    },

    // --- GitHub ---
    importGithubRepo: function (repoUrl, summarizeSpecs) {
      return invoke('github:clone-and-process', { repoUrl: repoUrl, summarizeSpecs: summarizeSpecs });
    },

    onGithubProgress: function (callback) {
      return addPushListener('github:progress', callback);
    },

    // --- Config ---
    loadConfig: function () {
      return invoke('config:load', {});
    },

    saveConfig: function (config) {
      return invoke('config:save', config);
    },

    // --- FS ---
    readFile: function (filePath) {
      return invoke('fs:readFile', { filePath: filePath });
    },

    writeFile: function (filePath, content) {
      return invoke('fs:writeFile', { filePath: filePath, content: content });
    },

    selectDirectory: function () {
      var dirPath = promptForDirectory('请输入目录路径：');
      if (!dirPath) return Promise.resolve({ success: false, error: 'No directory selected' });
      return invoke('fs:selectDirectory', { path: dirPath });
    },

    readDirectory: function (dirPath) {
      return invoke('fs:readDirectory', { dirPath: dirPath });
    },

    createProject: function () {
      var dirPath = promptForDirectory('请输入新项目的目录路径：');
      if (!dirPath) return Promise.resolve({ success: false, error: 'No directory selected' });
      return invoke('project:create', { path: dirPath });
    },

    deleteFile: function (filePath) {
      return invoke('fs:deleteFile', { filePath: filePath });
    },

    deleteFolder: function (folderPath) {
      return invoke('fs:deleteFolder', { folderPath: folderPath });
    },

    createDirectory: function (dirPath) {
      return invoke('fs:createDirectory', { dirPath: dirPath });
    },

    pathExists: function (p) {
      return invoke('fs:exists', { path: p });
    },

    renamePath: function (oldPath, newPath) {
      return invoke('fs:rename', { oldPath: oldPath, newPath: newPath });
    },

    revealInFinder: function (filePath) {
      window.alert('文件路径: ' + filePath);
      return Promise.resolve({ success: true });
    },

    copyPath: function (filePath) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(filePath).then(function () { return { success: true }; });
      }
      // Fallback: show in prompt so user can copy manually
      window.prompt('复制路径：', filePath);
      return Promise.resolve({ success: true });
    },
  };

  console.log('[shim] electronAPI injected, connecting to', wsUrl);
})();
