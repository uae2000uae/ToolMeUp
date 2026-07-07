'use strict';

// Instrumentation helpers (timing + env-aware logging)
const __nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const __toHex = (u8) => {
  try { if (u8 && u8.buffer) u8 = new Uint8Array(u8.buffer || u8); } catch(_){}
  let s = '';
  for (let i = 0; i < (u8?.length||0); i++) s += u8[i].toString(16).padStart(2, '0');
  return s;
};
function __logFeature(ctx, payload) {
  try {
    const ul = (typeof window !== 'undefined') ? window.__uploadLogger : null;
    const env = (typeof window !== 'undefined' && typeof window.__envSnapshot === 'function') ? window.__envSnapshot() : {};
    const data = { model: ctx?.getModel?.(), env, ...payload };
    if (ul && typeof ul.logFeature === 'function' && payload?.dir === 'send') ul.logFeature(data);
    if (ul && typeof ul.logReceive === 'function' && payload?.dir === 'recv') ul.logReceive(data);
    if (ul && !ul.logReceive && payload?.dir === 'recv' && typeof ul.logFeature === 'function') ul.logFeature(data);
  } catch(_){}
}

/**
* Base Controller class that provides common functionality for all controller types
*/
class BaseController {
  constructor(device) {
    this.device = device;
    this.model = "undefined"; // to be set by subclasses
    this.finetuneMaxValue; // to be set by subclasses
  }

  getModel() {
    return this.model;
  }

  /**
  * Get the underlying HID device
  * @returns {HIDDevice} The HID device
  */
  getDevice() {
    return this.device;
  }

  getInputConfig() {
    throw new Error('getInputConfig() must be implemented by subclass');
  }

  /**
  * Get the maximum value for finetune data
  * @returns {number} Maximum value for finetune adjustments
  */
  getFinetuneMaxValue() {
    if(!this.finetuneMaxValue) throw new Error('getFinetuneMaxValue() must be implemented by subclass');
    return this.finetuneMaxValue;
  }

  getNumberOfSticks() {
    return 0;
  }

  /**
  * Set input report handler
  * @param {Function} handler Input report handler function
  */
  setInputReportHandler(handler) {
    this.device.oninputreport = handler;
  }

  /**
  * Allocate request buffer with proper size based on device feature reports
  * @param {number} id Report ID
  * @param {Array} data Data array to include in the request
  * @returns {Uint8Array} Allocated request buffer
  */
  alloc_req(id, data = []) {
    try {
      const collections = this.device?.collections || [];
      const featureReports = collections[0]?.featureReports || [];
      const rep = featureReports.find(r => r.reportId === id);
      let totalBits = 0;
      if (rep && Array.isArray(rep.items) && rep.items.length) {
        for (const it of rep.items) {
          const size = Number(it?.reportSize) || 0;   // bits per field
          const count = Number(it?.reportCount) || 0; // number of fields
          totalBits += size * count;
        }
      }
      // Compute payload byte length for this reportId (WebHID excludes reportId byte)
      let totalBytes = totalBits > 0 ? Math.ceil(totalBits / 8) : 0;
      // Fallbacks: some user agents don’t expose sizes clearly
      if (!totalBytes || !Number.isFinite(totalBytes)) {
        // Most DS4/DS5 feature reports are 64 bytes; ensure at least data length
        totalBytes = Math.max(64, data.length);
      } else {
        totalBytes = Math.max(totalBytes, data.length);
      }
      const out = new Uint8Array(totalBytes);
      // Zero-filled by default; copy user payload at offset 0
      const len = Math.min(data.length, totalBytes);
      if (len > 0) out.set(data.slice(0, len), 0);
      return out;
    } catch (_) {
      // Absolute fallback: just return a copy of the input as Uint8Array
      const out = new Uint8Array(data.length || 0);
      if (data.length) out.set(data);
      return out;
    }
  }

  // Simple hex converter to avoid importing utils here
  _bytesToHex(u8) {
    if (!u8) return '';
    if (u8.buffer) u8 = new Uint8Array(u8.buffer || u8);
    let s = '';
    for (let i = 0; i < u8.length; i++) {
      const b = u8[i].toString(16).padStart(2, '0');
      s += b;
    }
    return s;
  }

  /**
  * Send feature report to device
  * @param {number} reportId Report ID
  * @param {ArrayBuffer|Array} data Data to send (if Array, will be processed through allocReq)
  */
  async sendFeatureReport(reportId, data) {
    // If data is an array, use allocReq to create proper buffer
    if (Array.isArray(data)) {
      data = this.alloc_req(reportId, data);
    }

    // Last-mile guard: if the controller published a pending vendor payload for report 0x80,
    // ensure the first bytes match [AA, DD, p]. If not, rewrite and log a WARN.
    try {
      if (reportId === 0x80 && this && this._pendingVendorPayload instanceof Uint8Array) {
        const needed = this._pendingVendorPayload.length;
        const u8 = (data instanceof Uint8Array) ? data : new Uint8Array(data);
        if (u8.length >= needed) {
          let mismatch = false;
          for (let i = 0; i < needed; i++) {
            if (u8[i] !== this._pendingVendorPayload[i]) { mismatch = true; break; }
          }
          if (mismatch) {
            for (let i = 0; i < needed; i++) u8[i] = this._pendingVendorPayload[i];
            data = u8; // ensure we pass the corrected buffer
            try {
              const ul = (typeof window !== 'undefined') ? window.__uploadLogger : null;
              ul?.logInfo?.(`WARN: corrected first ${needed} bytes for FEAT 0x80 to ${__toHex(this._pendingVendorPayload)}`);
            } catch(_){}
          }
        }
      }
    } catch(_){}

    const t0 = __nowMs();
    const bytes = new Uint8Array(data);
    try {
      // Pre-log send with timestamp
      try {
        __logFeature(this, { dir: 'send', reportId, hex: __toHex(bytes), tStart: t0, tEnd: t0, durationMs: 0 });
      } catch(_){}

      const res = await this.device.sendFeatureReport(reportId, data);
      const t1 = __nowMs();
      try { __logFeature(this, { dir: 'send', reportId, hex: __toHex(bytes), tStart: t0, tEnd: t1, durationMs: (t1 - t0) }); } catch(_){}
      return res;
    } catch (error) {
      // HID doesn't throw proper Errors with stack (stack is "name: message") so generate a new stack here
      throw new Error(error.stack);
    }
  }

  /**
  * Receive feature report from device
  * @param {number} reportId Report ID
  */
  async receiveFeatureReport(reportId) {
    const t0 = __nowMs();
    const view = await this.device.receiveFeatureReport(reportId);
    const t1 = __nowMs();
    try {
      __logFeature(this, { dir: 'recv', reportId, hex: __toHex(new Uint8Array(view.buffer)), tStart: t0, tEnd: t1, durationMs: (t1 - t0) });
    } catch(_){}
    return view;
  }

  /**
  * Close the HID device connection
  */
  async close() {
    if (this.device?.opened) {
      await this.device.close();
    }
  }

  /**
  * Get the serial number of the device
  * @returns {Promise<string>} The device serial number
  */
  async getSerialNumber() {
    throw new Error('getSerialNumber() must be implemented by subclass');
  }

  // Abstract methods that must be implemented by subclasses
  async getInfo() {
    throw new Error('getInfo() must be implemented by subclass');
  }

  async flash(progressCallback = null) {
    throw new Error('flash() must be implemented by subclass');
  }

  async reset() {
    throw new Error('reset() must be implemented by subclass');
  }

  async nvsLock() {
    throw new Error('nvsLock() must be implemented by subclass');
  }

  async nvsUnlock() {
    throw new Error('nvsUnlock() must be implemented by subclass');
  }

  async calibrateSticksBegin() {
    throw new Error('calibrateSticksBegin() must be implemented by subclass');
  }

  async calibrateSticksEnd() {
    throw new Error('calibrateSticksEnd() must be implemented by subclass');
  }

  async calibrateSticksSample() {
    throw new Error('calibrateSticksSample() must be implemented by subclass');
  }

  async calibrateRangeBegin() {
    throw new Error('calibrateRangeBegin() must be implemented by subclass');
  }

  async calibrateRangeEnd() {
    throw new Error('calibrateRangeEnd() must be implemented by subclass');
  }

  parseBatteryStatus(data) {
    throw new Error('parseBatteryStatus() must be implemented by subclass');
  }
  
  async setAdaptiveTrigger(left, right) {
    // Default no-op implementation for controllers that don't support adaptive triggers
    return { success: true, message: "This controller does not support adaptive triggers" };
  }

  async setVibration(heavyLeft = 0, lightRight = 0) {
    // Default no-op implementation for controllers that don't support vibration
    return { success: true, message: "This controller does not support vibration" };
  }

  async setAdaptiveTriggerPreset(config) {
    // Default no-op implementation for controllers that don't support adaptive trigger presets
    return { success: true, message: "This controller does not support adaptive trigger presets" };
  }

  async setSpeakerTone(output = 'speaker') {
    // Default no-op implementation for controllers that don't support speaker audio
    if (callback) callback({ success: true, message: "This controller does not support speaker audio" });
    return { success: true, message: "This controller does not support speaker audio" };
  }

  async resetLights() {
    // Default no-op implementation for controllers that don't support controllable lights
    return { success: true, message: "This controller does not support controllable lights" };
  }

  async setMuteLed(mode) {
    // Default no-op implementation for controllers that don't support mute LED
    return { success: true, message: "This controller does not support mute LED" };
  }

  async setLightbarColor(r, g, b) {
    // Default no-op implementation for controllers that don't support lightbar colors
    return { success: true, message: "This controller does not support lightbar colors" };
  }

  async setPlayerIndicator(pattern) {
    // Default no-op implementation for controllers that don't support player indicators
    return { success: true, message: "This controller does not support player indicators" };
  }

  /**
   * Get the list of supported quick tests for this controller
   * @returns {Array<string>} Array of supported test types
   */
  getSupportedQuickTests() {
    // Default implementation - supports all tests
    return ['usb', 'buttons', 'adaptive', 'haptic', 'lights', 'speaker', 'headphone', 'microphone'];
  }
}

export default BaseController;
