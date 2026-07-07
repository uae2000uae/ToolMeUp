'use strict';

import { draw_stick_dial } from '../stick-renderer.js';
import { float_to_str, applyRadialDeadzone } from '../utils.js';
import { Storage } from '../storage.js';

// Local alert helpers to avoid relying on globals from core.js
function _pushAlert(message, type = 'info', duration = 0) {
  try {
    const container = document.getElementById('alert-container');
    if (!container) {
      // Fallback if alert container is not present
      console[type === 'danger' ? 'error' : (type === 'warning' ? 'warn' : 'log')](message);
      return null;
    }
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.setAttribute('role', 'alert');
    alertDiv.innerHTML = `${message}<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    container.appendChild(alertDiv);
    if (duration > 0) {
      setTimeout(() => {
        try { new bootstrap.Alert(alertDiv).close(); } catch(_) { alertDiv.remove(); }
      }, duration);
    }
    return alertDiv.id || null;
  } catch (e) {
    console.warn('Failed to show alert:', e);
    return null;
  }
}
function infoAlert(message, duration = 5000) { return _pushAlert(message, 'info', duration); }
function errorAlert(message, duration = 15000) { return _pushAlert(message, 'danger', duration); }

let _controller = null;
let _dzPercent = 10; // default
let _rafId = null;
let _expert = false;
// Cached finetune (in-memory module) data for DS5/Edge to enrich Expert preview
let _ftLoaded = false;
let _ft = null; // { LL, LT, LR, LB, RL, RT, RR, RB, LX, LY, RX, RY }

async function readStoredPercent(controller) {
  try {
    const serial = controller?.currentSerialNumber || null;
    if (serial) {
      const per = Storage.deadzoneBySerial.get(serial);
      if (per !== null && per !== undefined && !Number.isNaN(per)) {
        return Math.max(0, Math.min(40, Number(per)));
      }
    }
  } catch (_) {}
  const p = Math.max(0, Math.min(40, Number(Storage.getNumber(Storage.STORAGE_KEYS.STICK_DEADZONE_PERCENT, 10)) || 0));
  return p;
}

function setLabel() {
  const lbl = document.getElementById('deadzonePercentLabel');
  if (lbl) lbl.textContent = `${_dzPercent}%`;
}

function getCanvases() {
  return {
    L: document.getElementById('deadzoneStickCanvasL'),
    R: document.getElementById('deadzoneStickCanvasR'),
  };
}

function toHexByte(n) { return Number(n & 0xff).toString(16).padStart(2, '0'); }
function bytesToHex(arr) { return Array.from(arr, toHexByte).join(''); }
const toHex16 = (n) => Number(n & 0xffff).toString(16).padStart(4, '0');

async function loadFinetuneIfPossible(controller) {
  if (_ftLoaded) return;
  try {
    const model = controller?.getModel?.();
    if (model !== 'DS5' && model !== 'DS5_Edge') { _ftLoaded = true; _ft = null; return; }
    const mod = await controller.getInMemoryModuleData?.();
    if (Array.isArray(mod) && mod.length === 12) {
      // Map using FINETUNE_INPUT_SUFFIXES order from finetune-modal.js
      const [LL, LT, RL, RT, LR, LB, RR, RB, LX, LY, RX, RY] = mod;
      _ft = { LL, LT, RL, RT, LR, LB, RR, RB, LX, LY, RX, RY };
    } else {
      _ft = null;
    }
  } catch(_) {
    _ft = null;
  } finally {
    _ftLoaded = true;
  }
}

function renderAffectedParams() {
  const panel = document.getElementById('deadzoneExpertPanel');
  const pre = document.getElementById('deadzoneAffectedParams');
  if (!panel || !pre) return;
  panel.style.display = _expert ? 'block' : 'none';
  if (!_expert) { pre.textContent = ''; return; }

  const model = _controller?.getModel?.() || 'Unknown';
  const p = Math.max(0, Math.min(40, Math.round(Number(_dzPercent) || 0)));
  const D = (p / 100);
  const lines = [];
  lines.push(`Device: ${model}`);
  lines.push(`Deadzone percent: ${p}%  (D=${D.toFixed(2)})`);
  lines.push('');

  if (model === 'DS5' || model === 'DS5_Edge') {
    // Preview of feature reports that will be sent when clicking "Apply to device (experimental)"
    const unlock = [0x03, 0x02, 0x65, 0x32, 0x40, 0x0c];
    const write = [0xaa, 0xdd, p & 0xff];
    const lock = [0x03, 0x01];
    lines.push('Feature report preview (id 0x80 unless noted):');
    lines.push(`  0x80: ${bytesToHex(unlock)}   ; NVS unlock`);
    // Detailed breakdown of the vendor command
    lines.push(`  0x80: ${bytesToHex(write)}      ; Vendor deadzone write`);
    lines.push(`        byte0=0xaa (vendor cmd), byte1=0xdd (deadzone op), byte2=0x${toHexByte(p)} (${p} dec)`);
    lines.push(`  0x81: (read) ....               ; Ack/response`);
    lines.push(`  0x80: ${bytesToHex(lock)}         ; NVS lock`);
    lines.push('');

    // Derived thresholds from current finetune (if available)
    if (_ftLoaded && _ft) {
      lines.push('Estimated affected parameters (derived thresholds in ADC counts):');
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const addAxis = (name, C, negEdge, posEdge) => {
        const hasEdges = (typeof negEdge === 'number') && (typeof posEdge === 'number');
        const minEdge = hasEdges ? Math.min(negEdge, posEdge) : C;
        const maxEdge = hasEdges ? Math.max(negEdge, posEdge) : C;
        const labelsSwapped = hasEdges ? (negEdge > posEdge) : false;

        // Half-ranges computed from numeric ordering (min/max), not labels
        const Hneg = Math.max(0, C - minEdge);
        const Hpos = Math.max(0, maxEdge - C);

        // Deadzone distance per side
        const DzNeg = Math.round(D * Hneg);
        const DzPos = Math.round(D * Hpos);

        // Thresholds before clamping
        let thrNeg = Math.round(C - DzNeg);
        let thrPos = Math.round(C + DzPos);

        // Clamp thresholds strictly inside [minEdge, maxEdge]
        if (hasEdges && maxEdge > minEdge) {
          thrNeg = clamp(thrNeg, minEdge + 1, maxEdge - 1);
          thrPos = clamp(thrPos, minEdge + 1, maxEdge - 1);
        }

        const consumeNeg = (Hneg <= 0) || (DzNeg >= Hneg);
        const consumePos = (Hpos <= 0) || (DzPos >= Hpos);

        const swappedTxt = labelsSwapped ? ' [labels were swapped → using numeric min/max]' : '';
        lines.push(`  ${name}: center=${C} (0x${toHex16(C)}), min=${minEdge} (0x${toHex16(minEdge)}), max=${maxEdge} (0x${toHex16(maxEdge)})${swappedTxt}`);
        lines.push(`       H-=${Hneg}, H+=${Hpos}; D-=${DzNeg}, D+=${DzPos}`);
        let note = '';
        if (consumeNeg || consumePos) {
          const parts = [];
          if (consumeNeg) parts.push('negative side consumed');
          if (consumePos) parts.push('positive side consumed');
          note = `  [${parts.join(' & ')} at ${Math.round(D*100)}%]`;
        }
        lines.push(`       deadzone thresholds => negative: ${thrNeg} (0x${toHex16(thrNeg)}), positive: ${thrPos} (0x${toHex16(thrPos)})${note}`);
      };
      // Left stick X: LL (left), LR (right), center LX
      addAxis('LX', _ft.LX, _ft.LL, _ft.LR);
      // Left stick Y: LB (bottom), LT (top), center LY
      addAxis('LY', _ft.LY, _ft.LB, _ft.LT);
      // Right stick X: RL (left), RR (right), center RX
      addAxis('RX', _ft.RX, _ft.RL, _ft.RR);
      // Right stick Y: RB (bottom), RT (top), center RY
      addAxis('RY', _ft.RY, _ft.RB, _ft.RT);
      lines.push('');
      lines.push('Note: These are host-side estimates based on current in-memory finetune values.');
      lines.push('The vendor write encodes only the percentage; the device applies it relative to its calibrated center and half-ranges.');
    } else if (_ftLoaded) {
      lines.push('Finetune module data not available; showing command bytes only.');
    } else {
      lines.push('Loading finetune module data...');
    }

    lines.push('App-level processing (already active):');
    lines.push('  Per-axis center deadzone with rescale:');
    lines.push('  if |a| <= D: out = 0; else out = sign(a) * (|a|-D)/(1-D)');
  } else if (model === 'DS4') {
    lines.push('Firmware write not available for DS4 in this build.');
    lines.push('App-level processing: if |a| <= D: out = 0; else out = sign(a) * (|a|-D)/(1-D)');
  } else {
    lines.push('Firmware write path is not defined for this model.');
  }

  pre.textContent = lines.join('\n');
}

function drawOnce() {
  if (!_controller) return;
  const { left, right } = _controller.button_states.sticks;
  const { L, R } = getCanvases();
  const DEADZONE = _dzPercent / 100.0;

  if (L) {
    const ctx = L.getContext('2d');
    ctx.clearRect(0,0,L.width,L.height);
    const sz = (Math.min(L.width, L.height) / 2) - 8;
    const cx = L.width / 2, cy = L.height / 2;

    const filteredL = applyRadialDeadzone(left.x, left.y, DEADZONE);
    draw_stick_dial(ctx, cx, cy, sz, filteredL.x, filteredL.y, { deadzone_radius: DEADZONE });

    const lxEl = document.getElementById('dz-lx'); if (lxEl) lxEl.textContent = float_to_str(filteredL.x, 3);
    const lyEl = document.getElementById('dz-ly'); if (lyEl) lyEl.textContent = float_to_str(filteredL.y, 3);
  }

  if (R) {
    const ctx = R.getContext('2d');
    ctx.clearRect(0,0,R.width,R.height);
    const sz = (Math.min(R.width, R.height) / 2) - 8;
    const cx = R.width / 2, cy = R.height / 2;

    const filteredR = applyRadialDeadzone(right.x, right.y, DEADZONE);
    draw_stick_dial(ctx, cx, cy, sz, filteredR.x, filteredR.y, { deadzone_radius: DEADZONE });

    const rxEl = document.getElementById('dz-rx'); if (rxEl) rxEl.textContent = float_to_str(filteredR.x, 3);
    const ryEl = document.getElementById('dz-ry'); if (ryEl) ryEl.textContent = float_to_str(filteredR.y, 3);
  }
}

function startLoop() {
  stopLoop();
  const loop = () => { drawOnce(); _rafId = requestAnimationFrame(loop); };
  _rafId = requestAnimationFrame(loop);
}

function stopLoop() {
  if (_rafId) cancelAnimationFrame(_rafId);
  _rafId = null;
}

export function show_deadzone_modal(controller, expert = false) {
  _controller = controller;
  _expert = !!expert;

  // Kick off finetune fetch (for DS5/Edge) to enrich Expert preview
  _ftLoaded = false; _ft = null;
  loadFinetuneIfPossible(_controller).then(() => { try { renderAffectedParams(); } catch(_){} });

  // Initialize per-device value if available (fallback to global)
  readStoredPercent(controller).then((p) => {
    _dzPercent = p;
    setLabel();
    const rangeEl = document.getElementById('deadzoneRange');
    if (rangeEl) rangeEl.value = String(_dzPercent);
    drawOnce();
    renderAffectedParams();
  });

  const range = document.getElementById('deadzoneRange');
  if (range) {
    range.value = String(_dzPercent);
    range.oninput = (e) => {
      _dzPercent = Math.max(0, Math.min(40, Number(e.target.value) || 0));
      setLabel();
      drawOnce();
      renderAffectedParams();
    };
  }

  const resetBtn = document.getElementById('deadzoneResetBtn');
  if (resetBtn) {
    resetBtn.onclick = () => {
      _dzPercent = 0; setLabel(); if (range) range.value = '0'; drawOnce(); renderAffectedParams();
    };
  }

  const applyBtn = document.getElementById('deadzoneApplyBtn');
  if (applyBtn) {
    applyBtn.onclick = async () => {
      // Persist globally for UI rendering (fallback for older versions)
      Storage.setNumber(Storage.STORAGE_KEYS.STICK_DEADZONE_PERCENT, _dzPercent);

      // Persist per-device (device-level persistence by serial)
      try {
        const serial = _controller?.currentSerialNumber || null;
        if (serial) {
          Storage.deadzoneBySerial.set(serial, _dzPercent);
        }
      } catch (_) { /* ignore */ }

      // Also mark this change as part of the main modification parameters so it is saved with others
      try {
        // If we have a controller manager instance, mark pending changes
        if (_controller && typeof _controller.setHasChangesToWrite === 'function') {
          _controller.setHasChangesToWrite(true);
        }
      } catch (_) { /* ignore */ }

      const modalEl = document.getElementById('deadzoneModal');
      const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
      modal.hide();
      // Trigger a refresh on main screen if available
      if (window.refresh_stick_pos) try { window.refresh_stick_pos(); } catch(_) {}
    };
  }

  const applyToDeviceBtn = document.getElementById('deadzoneApplyToDeviceBtn');
  if (applyToDeviceBtn) {
    applyToDeviceBtn.onclick = async () => {
      if (!_controller || typeof _controller.applyDeadzoneToDevice !== 'function') {
        errorAlert('Device-level write is not available for this controller.');
        return;
      }
      const { success, message } = await _controller.applyDeadzoneToDevice(_dzPercent);
      if (success) {
        infoAlert(message || 'Deadzone sent to device.', 3000);
      } else {
        errorAlert(message || 'Failed to apply deadzone to device.', 12000);
      }
    };
  }

  // Expert Plan B: apply via finetune (Module 12)
  const applyFinetuneBtn = document.getElementById('deadzoneApplyFinetuneBtn');
  if (applyFinetuneBtn) {
    applyFinetuneBtn.style.display = _expert ? '' : 'none';
    applyFinetuneBtn.onclick = async () => {
      try {
        if (!_controller || typeof _controller.applyDeadzoneToDeviceFinetune !== 'function') {
          errorAlert('Finetune write is not available for this controller.');
          return;
        }
        // Simple confirmation with a summary line from the expert panel
        const proceed = confirm('Apply deadzone via finetune (Module 12) with backup and verify?');
        if (!proceed) return;
        const { success, message } = await _controller.applyDeadzoneToDeviceFinetune(_dzPercent);
        success ? infoAlert(message || 'Finetune written.') : errorAlert(message || 'Finetune write failed.');
      } catch (e) {
        errorAlert(e?.message || String(e));
      }
    };
  }

  // Restore last backup (Expert)
  const restoreBtn = document.getElementById('deadzoneRestoreBackupBtn');
  if (restoreBtn) {
    restoreBtn.style.display = _expert ? '' : 'none';
    restoreBtn.onclick = async () => {
      try {
        if (!_controller || typeof _controller.restoreFinetuneBackup !== 'function') {
          errorAlert('Restore is not available for this controller.');
          return;
        }
        const ok = confirm('Restore last finetune backup for this device?');
        if (!ok) return;
        const { success, message } = await _controller.restoreFinetuneBackup();
        success ? infoAlert(message || 'Backup restored.') : errorAlert(message || 'Restore failed.');
      } catch (e) {
        errorAlert(e?.message || String(e));
      }
    };
  }

  const modalEl = document.getElementById('deadzoneModal');
  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  // Ensure expert panel visibility is synced before showing
  renderAffectedParams();
  modal.show();

  modalEl.addEventListener('hidden.bs.modal', () => {
    stopLoop();
  }, { once: true });

  // kick things off
  drawOnce();
  startLoop();
}

export function isDeadzoneVisible() {
  const modal = document.getElementById('deadzoneModal');
  if (!modal) return false;
  return modal.classList.contains('show');
}

export function deadzone_handle_controller_input(/*changes*/) {
  // nothing special to do — we redraw on animation frame using controller state
}
