'use strict';

import BaseController from './base-controller.js';
import { 
  sleep, 
  buf2hex, 
  dec2hex, 
  dec2hex32, 
  dec2hex8, 
  format_mac_from_view, 
  reverse_str, 
  la,
} from '../utils.js';
import { l } from '../translations.js';
import { Storage } from '../storage.js';

// DS5 Button mapping configuration
const DS5_BUTTON_MAP = [
  { name: 'up', byte: 7, mask: 0x0 }, // Dpad handled separately
  { name: 'right', byte: 7, mask: 0x1 },
  { name: 'down', byte: 7, mask: 0x2 },
  { name: 'left', byte: 7, mask: 0x3 },
  { name: 'square', byte: 7, mask: 0x10, svg: 'Square' },
  { name: 'cross', byte: 7, mask: 0x20, svg: 'Cross' },
  { name: 'circle', byte: 7, mask: 0x40, svg: 'Circle' },
  { name: 'triangle', byte: 7, mask: 0x80, svg: 'Triangle' },
  { name: 'l1', byte: 8, mask: 0x01, svg: 'L1' },
  { name: 'l2', byte: 4, mask: 0xff }, // analog handled separately
  { name: 'r1', byte: 8, mask: 0x02, svg: 'R1' },
  { name: 'r2', byte: 5, mask: 0xff }, // analog handled separately
  { name: 'create', byte: 8, mask: 0x10, svg: 'Create' },
  { name: 'options', byte: 8, mask: 0x20, svg: 'Options' },
  { name: 'l3', byte: 8, mask: 0x40, svg: 'L3' },
  { name: 'r3', byte: 8, mask: 0x80, svg: 'R3' },
  { name: 'ps', byte: 9, mask: 0x01, svg: 'PS' },
  { name: 'touchpad', byte: 9, mask: 0x02, svg: 'Trackpad' },
  { name: 'mute', byte: 9, mask: 0x04, svg: 'Mute' },
];

// DS5 Input processing configuration
const DS5_INPUT_CONFIG = {
  buttonMap: DS5_BUTTON_MAP,
  dpadByte: 7,
  l2AnalogByte: 4,
  r2AnalogByte: 5,
  touchpadOffset: 32,
};

// DS5 Adaptive Trigger Effect Modes
const DS5_TRIGGER_EFFECT_MODE = {
  OFF: 0x00,           // No effect
  RESISTANCE: 0x01,    // Constant resistance
  TRIGGER: 0x02,       // Single-trigger effect with release
  AUTO_TRIGGER: 0x06,  // Automatic trigger with vibration
};

// DS5 Output Report Constants
const DS5_OUTPUT_REPORT = {
  USB_REPORT_ID: 0x02,
  BT_REPORT_ID: 0x31,
}

const DS5_VALID_FLAG0 = {
  RIGHT_VIBRATION: 0x01,  // Bit 0 for right vibration motor
  LEFT_VIBRATION: 0x02,   // Bit 1 for left vibration motor
  LEFT_TRIGGER: 0x04,     // Bit 2 for left adaptive trigger
  RIGHT_TRIGGER: 0x08,    // Bit 3 for right adaptive trigger
  HEADPHONE_VOLUME: 0x10, // Bit 4 for headphone volume control
  SPEAKER_VOLUME: 0x20,   // Bit 5 for speaker volume control
  MIC_VOLUME: 0x40,       // Bit 6 for microphone volume control
  AUDIO_CONTROL: 0x80,    // Bit 7 for audio control
};

const DS5_VALID_FLAG1 = {
  MUTE_LED: 0x01,          // Bit 0 for mute LED control
  POWER_SAVE_MUTE: 0x02,   // Bit 1 for power-save mute control
  LIGHTBAR_COLOR: 0x04,    // Bit 2 for lightbar color control
  RESERVED_BIT_3: 0x08,    // Bit 3 (reserved)
  PLAYER_INDICATOR: 0x10,  // Bit 4 for player indicator LED control
  LED_BRIGHTNESS: 0x20,    // Bit 6 for LED brightness control
  LIGHTBAR_SETUP: 0x40,    // Bit 6 for lightbar setup control
  RESERVED_BIT_7: 0x80,    // Bit 7 (reserved)
}

const DS5_VALID_FLAG2 = {
  LED_BRIGHTNESS: 0x01,         // Bit 0 for LED brightness control
  LIGHTBAR_SETUP: 0x02,         // Bit 1 for lightbar setup control
};

// Basic DS5 Output Structure for adaptive trigger control
class DS5OutputStruct {
  constructor(currentState = null) {
    // Create a 47-byte buffer for DS5 output report (USB)
    this.buffer = new ArrayBuffer(47);
    this.view = new DataView(this.buffer);

    // Control flags
    this.validFlag0 = currentState.validFlag0 || 0;
    this.validFlag1 = currentState.validFlag1 || 0;
    this.validFlag2 = currentState.validFlag2 || 0;

    // Vibration motors
    this.bcVibrationRight = currentState.bcVibrationRight || 0;
    this.bcVibrationLeft = currentState.bcVibrationLeft || 0;

    // Audio control
    this.headphoneVolume = currentState.headphoneVolume || 0;
    this.speakerVolume = currentState.speakerVolume || 0;
    this.micVolume = currentState.micVolume || 0;
    this.audioControl = currentState.audioControl || 0;
    this.audioControl2 = currentState.audioControl2 || 0;

    // LED and indicator control
    this.muteLedControl = currentState.muteLedControl || 0;
    this.powerSaveMuteControl = currentState.powerSaveMuteControl || 0;
    this.lightbarSetup = currentState.lightbarSetup || 0;
    this.ledBrightness = currentState.ledBrightness || 0;
    this.playerIndicator = currentState.playerIndicator || 0;
    this.ledCRed = currentState.ledCRed || 0;
    this.ledCGreen = currentState.ledCGreen || 0;
    this.ledCBlue = currentState.ledCBlue || 0;

    // Adaptive trigger parameters
    this.adaptiveTriggerLeftMode = currentState.adaptiveTriggerLeftMode || 0;
    this.adaptiveTriggerLeftParam0 = currentState.adaptiveTriggerLeftParam0 || 0;
    this.adaptiveTriggerLeftParam1 = currentState.adaptiveTriggerLeftParam1 || 0;
    this.adaptiveTriggerLeftParam2 = currentState.adaptiveTriggerLeftParam2 || 0;

    this.adaptiveTriggerRightMode = currentState.adaptiveTriggerRightMode || 0;
    this.adaptiveTriggerRightParam0 = currentState.adaptiveTriggerRightParam0 || 0;
    this.adaptiveTriggerRightParam1 = currentState.adaptiveTriggerRightParam1 || 0;
    this.adaptiveTriggerRightParam2 = currentState.adaptiveTriggerRightParam2 || 0;

    // Haptic feedback
    this.hapticVolume = currentState.hapticVolume || 0;
  }

  // Pack the data into the output buffer
  pack() {
    // Based on DS5 output report structure from HID descriptor
    // Byte 0-1: Control flags (16-bit little endian)
    this.view.setUint16(0, (this.validFlag1 << 8) | this.validFlag0, true);

    // Byte 2-3: Vibration motors
    this.view.setUint8(2, this.bcVibrationRight);
    this.view.setUint8(3, this.bcVibrationLeft);

    // Bytes 4-7: Audio control (reserved for now)
    this.view.setUint8(4, this.headphoneVolume);
    this.view.setUint8(5, this.speakerVolume);
    this.view.setUint8(6, this.micVolume);
    this.view.setUint8(7, this.audioControl);

    // Byte 8: Mute LED control
    this.view.setUint8(8, this.muteLedControl);

    // Byte 9: Reserved
    this.view.setUint8(9, 0);

    // Bytes 10-20: Right adaptive trigger
    this.view.setUint8(10, this.adaptiveTriggerRightMode);
    this.view.setUint8(11, this.adaptiveTriggerRightParam0);
    this.view.setUint8(12, this.adaptiveTriggerRightParam1);
    this.view.setUint8(13, this.adaptiveTriggerRightParam2);
    // Additional trigger parameters (bytes 14-20 reserved for extended params)
    for (let i = 14; i <= 20; i++) {
      this.view.setUint8(i, 0);
    }

    // Bytes 21-31: Left adaptive trigger
    this.view.setUint8(21, this.adaptiveTriggerLeftMode);
    this.view.setUint8(22, this.adaptiveTriggerLeftParam0);
    this.view.setUint8(23, this.adaptiveTriggerLeftParam1);
    this.view.setUint8(24, this.adaptiveTriggerLeftParam2);
    // Additional trigger parameters (bytes 25-31 reserved for extended params)
    for (let i = 25; i <= 31; i++) {
      this.view.setUint8(i, 0);
    }

    // Bytes 32-42: Reserved
    for (let i = 32; i <= 42; i++) {
      this.view.setUint8(i, 0);
    }

    // Byte 43: Player LED indicator
    this.view.setUint8(43, this.playerIndicator);

    // Bytes 44-46: Lightbar RGB
    this.view.setUint8(44, this.ledCRed);
    this.view.setUint8(45, this.ledCGreen);
    this.view.setUint8(46, this.ledCBlue);

    return this.buffer;
  }
}

function ds5_color(x) {
  const colorMap = {
    '00': 'White',
    '01': 'Midnight Black',
    '02': 'Cosmic Red',
    '03': 'Nova Pink',
    '04': 'Galactic Purple',
    '05': 'Starlight Blue',
    '06': 'Grey Camouflage',
    '07': 'Volcanic Red',
    '08': 'Sterling Silver',
    '09': 'Cobalt Blue',
    '10': 'Chroma Teal',
    '11': 'Chroma Indigo',
    '12': 'Chroma Pearl',
    '30': '30th Anniversary',
    'Z1': 'God of War Ragnarok',
    'Z2': 'Spider-Man 2',
    'Z3': 'Astro Bot',
    'Z4': 'Fortnite',
    'Z6': 'The Last of Us',
  };

  const colorCode = x.slice(4, 6);
  const colorName = colorMap[colorCode] || 'Unknown';
  return colorName;
}

/**
* DualSense (DS5) Controller implementation
*/
class DS5Controller extends BaseController {
  constructor(device) {
    super(device);
    this.model = "DS5";
    this.finetuneMaxValue = 65535; // 16-bit max value for DS5

    // Initialize current output state to track controller settings
    this.currentOutputState = {
      validFlag0: 0,
      validFlag1: 0,
      validFlag2: 0,
      bcVibrationRight: 0,
      bcVibrationLeft: 0,
      headphoneVolume: 0,
      speakerVolume: 0,
      micVolume: 0,
      audioControl: 0,
      audioControl2: 0,
      muteLedControl: 0,
      powerSaveMuteControl: 0,
      lightbarSetup: 0,
      ledBrightness: 0,
      playerIndicator: 0,
      ledCRed: 0,
      ledCGreen: 0,
      ledCBlue: 0,
      adaptiveTriggerLeftMode: 0,
      adaptiveTriggerLeftParam0: 0,
      adaptiveTriggerLeftParam1: 0,
      adaptiveTriggerLeftParam2: 0,
      adaptiveTriggerRightMode: 0,
      adaptiveTriggerRightParam0: 0,
      adaptiveTriggerRightParam1: 0,
      adaptiveTriggerRightParam2: 0,
      hapticVolume: 0
    };
  }

  getInputConfig() {
    return DS5_INPUT_CONFIG;
  }

  async getSerialNumber() {
    return await this.getSystemInfo(1, 19, 17);
  }

  async getInfo() {
    return this._getInfo(false);
  }

  async _getInfo(is_edge) {
    // Device-only: collect info and return a common structure; do not touch the DOM
    try {
      console.log("Fetching DS5 info...");
      const view = await this.receiveFeatureReport(0x20);
      console.log("Got DS5 info report:", buf2hex(view.buffer));
      const cmd = view.getUint8(0, true);
      if(cmd != 0x20 || view.buffer.byteLength != 64)
        return { ok: false, error: new Error("Invalid response for ds5_info") };

      const build_date = new TextDecoder().decode(view.buffer.slice(1, 1+11));
      const build_time = new TextDecoder().decode(view.buffer.slice(12, 20));

      const fwtype     = view.getUint16(20, true);
      const swseries   = view.getUint16(22, true);
      const hwinfo     = view.getUint32(24, true);
      const fwversion  = view.getUint32(28, true);

      const updversion = view.getUint16(44, true);
      const unk        = view.getUint8(46, true);

      const fwversion1 = view.getUint32(48, true);
      const fwversion2 = view.getUint32(52, true);
      const fwversion3 = view.getUint32(56, true);

      const serial_number = await this.getSystemInfo(1, 19, 17);
      const color = ds5_color(serial_number);
      const infoItems = [
        { key: l("Serial Number"), value: serial_number, cat: "hw", copyable: true },
        { key: l("MCU Unique ID"), value: await this.getSystemInfo(1, 9, 9, false), cat: "hw", isExtra: true, copyable: true },
        { key: l("PCBA ID"), value: reverse_str(await this.getSystemInfo(1, 17, 14)), cat: "hw", isExtra: true },
        { key: l("Battery Barcode"), value: await this.getSystemInfo(1, 24, 23), cat: "hw", isExtra: true, copyable: true },
        { key: l("VCM Left Barcode"), value: await this.getSystemInfo(1, 26, 16), cat: "hw", isExtra: true, copyable: true },
        { key: l("VCM Right Barcode"), value: await this.getSystemInfo(1, 28, 16), cat: "hw", isExtra: true, copyable: true },

        { key: l("Color"), value: l(color), cat: "hw", addInfoIcon: 'color', copyable: true },

        ...(is_edge ? [] : [{ key: l("Board Model"), value: this.hwToBoardModel(hwinfo), cat: "hw", addInfoIcon: 'board', copyable: true }]),

        { key: l("FW Build Date"), value: build_date + " " + build_time, cat: "fw" },
        { key: l("FW Type"), value: "0x" + dec2hex(fwtype), cat: "fw", isExtra: true },
        { key: l("FW Series"), value: "0x" + dec2hex(swseries), cat: "fw", isExtra: true },
        { key: l("HW Model"), value: "0x" + dec2hex32(hwinfo), cat: "hw", isExtra: true },
        { key: l("FW Version"), value: "0x" + dec2hex32(fwversion), cat: "fw", isExtra: true },
        { key: l("FW Update"), value: "0x" + dec2hex(updversion), cat: "fw", isExtra: true },
        { key: l("FW Update Info"), value: "0x" + dec2hex8(unk), cat: "fw", isExtra: true },
        { key: l("SBL FW Version"), value: "0x" + dec2hex32(fwversion1), cat: "fw", isExtra: true },
        { key: l("Venom FW Version"), value: "0x" + dec2hex32(fwversion2), cat: "fw", isExtra: true },
        { key: l("Spider FW Version"), value: "0x" + dec2hex32(fwversion3), cat: "fw", isExtra: true },

        { key: l("Touchpad ID"), value: await this.getSystemInfo(5, 2, 8, false), cat: "hw", isExtra: true, copyable: true },
        { key: l("Touchpad FW Version"), value: await this.getSystemInfo(5, 4, 8, false), cat: "fw", isExtra: true },
      ];

      const old_controller = build_date.search(/ 2020| 2021/);
      let disable_bits = 0;
      if(old_controller != -1) {
        la("ds5_info_error", {"r": "old"})
        disable_bits |= 2; // 2: outdated firmware
      }

      const nv = await this.queryNvStatus();
      const bd_addr = await this.getBdAddr();
      infoItems.push({ key: l("Bluetooth Address"), value: bd_addr, cat: "hw", isExtra: true });

      const pending_reboot = (nv?.status === 'pending_reboot');

      return { ok: true, infoItems, nv, disable_bits, pending_reboot };
    } catch(error) {
      la("ds5_info_error", {"r": error})
      return { ok: false, error, disable_bits: 1 };
    }
  }

  async flash(progressCallback = null) {
    la("ds5_flash");
    try {
      await this.nvsUnlock();
      const lockRes = await this.nvsLock();
      if(!lockRes.ok) throw (lockRes.error || new Error("NVS lock failed"));

      return { success: true, message: l("Changes saved successfully") };
    } catch(error) {
      throw new Error(l("Error while saving changes"), { cause: error });
    }
  }

  async reset() {
    la("ds5_reset");
    try {
      await this.sendFeatureReport(0x80, [1,1]);
    } catch(error) {
    }
  }

  async nvsLock() {
    // la("ds5_nvlock");
    try {
      await this.sendFeatureReport(0x80, [3,1]);
      await this.receiveFeatureReport(0x81);
      return { ok: true };
    } catch(error) {
      return { ok: false, error };
    }
  }

  async nvsUnlock() {
    // la("ds5_nvunlock");
    try {
      const t0 = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      await this.sendFeatureReport(0x80, [3,2, 101, 50, 64, 12]);
      const data = await this.receiveFeatureReport(0x81);
      const t1 = (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
      try { window.__uploadLogger?.logInfo?.(`NVS unlock response in ${Math.max(0, t1 - t0).toFixed(1)}ms`); } catch(_){}

      // Validate unlocked status explicitly
      await this.sendFeatureReport(0x80, [3,3]);
      await sleep(80);
      const st = await this.receiveFeatureReport(0x81);
      const ret = st.getUint32(1, false);
      if (ret !== 0x03030200) {
        throw new Error(`NVS unlock token mismatch (status=0x${ret.toString(16)})`);
      }
    } catch(error) {
      await sleep(500);
      throw new Error(l("NVS Unlock failed"), { cause: error });
    }
  }

  async getBdAddr() {
    await this.sendFeatureReport(0x80, [9,2]);
    const data = await this.receiveFeatureReport(0x81);
    return format_mac_from_view(data, 4);
  }

  async getSystemInfo(base, num, length, decode = true) {
    await this.sendFeatureReport(128, [base,num])
    const pcba_id = await this.receiveFeatureReport(129);
    if(pcba_id.getUint8(1) != base || pcba_id.getUint8(2) != num || pcba_id.getUint8(3) != 2) {
      return l("error");
    }
    if(decode)
      return new TextDecoder().decode(pcba_id.buffer.slice(4, 4+length));

    return buf2hex(pcba_id.buffer.slice(4, 4+length));
  }

  async calibrateSticksBegin() {
    la("ds5_calibrate_sticks_begin");
    try {
      // Begin
      await this.sendFeatureReport(0x82, [1,1,1]);

      // Assert
      const data = await this.receiveFeatureReport(0x83);
      if(data.getUint32(0, false) != 0x83010101) {
        const d1 = dec2hex32(data.getUint32(0, false));
        la("ds5_calibrate_sticks_begin_failed", {"d1": d1});
        throw new Error(`Stick center calibration begin failed: ${d1}`);
      }
      return { ok: true };
    } catch(error) {
      la("ds5_calibrate_sticks_begin_failed", {"r": error});
      return { ok: false, error };
    }
  }

  async calibrateSticksSample() {
    la("ds5_calibrate_sticks_sample");
    try {
      // Sample
      await this.sendFeatureReport(0x82, [3,1,1]);

      // Assert
      const data = await this.receiveFeatureReport(0x83);
      if(data.getUint32(0, false) != 0x83010101) {
        const d1 = dec2hex32(data.getUint32(0, false));
        la("ds5_calibrate_sticks_sample_failed", {"d1": d1});
        throw new Error(`Stick center calibration sample failed: ${d1}`);
      }
      return { ok: true };
    } catch(error) {
      la("ds5_calibrate_sticks_sample_failed", {"r": error});
      return { ok: false, error };
    }
  }

  async calibrateSticksEnd() {
    la("ds5_calibrate_sticks_end");
    try {
      // Write
      await this.sendFeatureReport(0x82, [2,1,1]);

      const data = await this.receiveFeatureReport(0x83);

      if(data.getUint32(0, false) != 0x83010102) {
        const d1 = dec2hex32(data.getUint32(0, false));
        la("ds5_calibrate_sticks_failed", {"s": 3, "d1": d1});
        throw new Error(`Stick center calibration end failed: ${d1}`);
      }

      return { ok: true };
    } catch(error) {
      la("ds5_calibrate_sticks_end_failed", {"r": error});
      return { ok: false, error };
    }
  }

  async calibrateRangeBegin() {
    la("ds5_calibrate_range_begin");
    try {
      // Begin
      await this.sendFeatureReport(0x82, [1,1,2]);

      // Assert
      const data = await this.receiveFeatureReport(0x83);
      if(data.getUint32(0, false) != 0x83010201) {
        const d1 = dec2hex32(data.getUint32(0, false));
        la("ds5_calibrate_range_begin_failed", {"d1": d1});
        throw new Error(`Stick range calibration begin failed: ${d1}`);
      }
      return { ok: true };
    } catch(error) {
      la("ds5_calibrate_range_begin_failed", {"r": error});
      return { ok: false, error };
    }
  }

  async calibrateRangeEnd() {
    la("ds5_calibrate_range_end");
    try {
      // Write
      await this.sendFeatureReport(0x82, [2,1,2]);

      // Assert
      const data = await this.receiveFeatureReport(0x83);

      if(data.getUint32(0, false) != 0x83010202) {
        const d1 = dec2hex32(data.getUint32(0, false));
        la("ds5_calibrate_range_end_failed", {"d1": d1});
        throw new Error(`Stick range calibration end failed: ${d1}`);
      }

      return { ok: true };
    } catch(error) {
      la("ds5_calibrate_range_end_failed", {"r": error});
      return { ok: false, error };
    }
  }

  async queryNvStatus() {
    try {
      await this.sendFeatureReport(0x80, [3,3]);
      const data = await this.receiveFeatureReport(0x81);
      const ret = data.getUint32(1, false);
      if (ret === 0x15010100) {
        return { device: 'ds5', status: 'pending_reboot', locked: null, code: 4, raw: ret };
      }
      if (ret === 0x03030201) {
        return { device: 'ds5', status: 'locked', locked: true, mode: 'temporary', code: 1, raw: ret };
      }
      if (ret === 0x03030200) {
        return { device: 'ds5', status: 'unlocked', locked: false, mode: 'permanent', code: 0, raw: ret };
      }
      if (ret === 1 || ret === 2) {
        return { device: 'ds5', status: 'unknown', locked: null, code: 2, raw: ret };
      }
      return { device: 'ds5', status: 'unknown', locked: null, code: ret, raw: ret };
    } catch (error) {
      return { device: 'ds5', status: 'error', locked: null, code: 2, error };
    }
  }

  hwToBoardModel(hw_ver) {
    const a = (hw_ver >> 8) & 0xff;
    if(a == 0x03) return "BDM-010";
    if(a == 0x04) return "BDM-020";
    if(a == 0x05) return "BDM-030";
    if(a == 0x06) return "BDM-040";
    if(a == 0x07 || a == 0x08) return "BDM-050";
    return l("Unknown");
  }

  async getInMemoryModuleData() {
    // DualSense
    await this.sendFeatureReport(0x80, [12, 2]);
    await sleep(100);
    const data = await this.receiveFeatureReport(0x81);
    const cmd = data.getUint8(0, true);
    const [p1, p2, p3] = [1, 2, 3].map(i => data.getUint8(i, true));

    if(cmd != 129 || p1 != 12 || (p2 != 2 && p2 != 4) || p3 != 2)
      return null;

    return Array.from({ length: 12 }, (_, i) => data.getUint16(4 + i * 2, true));
  }

  async writeFinetuneData(data) {
    const pkg = data.reduce((acc, val) => acc.concat([val & 0xff, val >> 8]), [12, 1]);
    await this.sendFeatureReport(0x80, pkg);
  }

  /**
   * Send output report to the DS5 controller
   * @param {ArrayBuffer} data - The output report data
   */
  async sendOutputReport(data, reason = "") {
    if (!this.device?.opened) {
      throw new Error('Device is not opened');
    }
    try {
      const hex = buf2hex(data);
      try {
        if (typeof window !== 'undefined' && window.__uploadLogger && typeof window.__uploadLogger.logOutput === 'function') {
          window.__uploadLogger.logOutput({ model: this.getModel?.(), reason, hex });
        }
      } catch (_) { /* ignore logging errors */ }
      console.log(`Sending output report${ reason ? ` to ${reason}` : '' }:`, DS5_OUTPUT_REPORT.USB_REPORT_ID, hex);
      await this.device.sendReport(DS5_OUTPUT_REPORT.USB_REPORT_ID, new Uint8Array(data));
    } catch (error) {
      throw new Error(`Failed to send output report: ${error.message}`);
    }
  }

  /**
   * Update the current output state with values from an OutputStruct
   * @param {DS5OutputStruct} outputStruct - The output structure to copy state from
   */
  updateCurrentOutputState(outputStruct) {
    this.currentOutputState = { ...outputStruct };
  }

  /**
   * Get a copy of the current output state
   * @returns {Object} A copy of the current output state
   */
  getCurrentOutputState() {
    return { ...this.currentOutputState };
  }

  /**
   * Experimental: apply deadzone to device firmware by sending a vendor-specific
   * feature report that includes the requested percent. This does not alter
   * calibration data but persists via the device's NVS lock sequence.
   * Returns a result object with success and message.
   */
  async applyDeviceDeadzone(percent) {
    const p = Math.max(0, Math.min(40, Math.round(Number(percent) || 0)));
    const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    const step = async (label, fn) => {
      const t0 = now();
      const res = await fn();
      const t1 = now();
      try { window.__uploadLogger?.logInfo?.(`${label} took ${Math.max(0, t1 - t0).toFixed(1)}ms`); } catch(_){}
      return res;
    };
    // Local helpers (scoped, minimal footprint)
    const crc8_maxim = (bytes) => {
      // CRC-8/MAXIM (Dallas/Maxim): poly=0x31 (reflected 0x8C), init=0x00, refin/refout=true, xorout=0x00
      let crc = 0x00;
      for (let b of bytes) {
        crc ^= b;
        for (let i = 0; i < 8; i++) {
          const mix = crc & 0x01;
          crc >>= 1;
          if (mix) crc ^= 0x8C; // reflected poly
        }
      }
      return crc & 0xFF;
    };
    const pollNv = async (times = 3, delayMs = 120) => {
      const out = [];
      for (let i = 0; i < times; i++) {
        try {
          const nv = await this.queryNvStatus();
          out.push(nv);
          window.__uploadLogger?.logInfo?.(`NV status[${i}]: ${nv?.status || 'unknown'} raw=${nv?.raw != null ? '0x'+nv.raw.toString(16) : ''}`);
        } catch (e) {
          window.__uploadLogger?.logInfo?.(`NV status[${i}] read failed: ${e?.message||e}`);
        }
        await sleep(delayMs);
      }
      return out;
    };
    const tryVendorReadback = async () => {
      try {
        // Probe command (speculative): AA DE — ask device for current DZ percent
        await this.sendFeatureReport(0x80, [0xAA, 0xDE]);
        await sleep(80);
        const resp = await this.receiveFeatureReport(0x81);
        const u8 = new Uint8Array(resp.buffer);
        const hex = Array.from(u8).map(b=>b.toString(16).padStart(2,'0')).join('');
        window.__uploadLogger?.logInfo?.(`readback probe RECV len=${u8.length} ${hex.substring(0, 16)}...`);
        // If response embeds a percent at a known place in future, we can parse here.
      } catch (e) {
        window.__uploadLogger?.logInfo?.(`readback probe failed: ${e?.message||e}`);
      }
    };
    try {
      await step('unlock', async () => { await this.nvsUnlock(); });
      await sleep(100);

      // Primary write (existing AA DD p), with last‑mile guard
      await step('write deadzone vendor cmd', async () => {
        window.__uploadLogger?.logInfo?.(`ENTER vendor write block p=${p}%`);
        let attempts = 0;
        try { this._pendingVendorPayload = new Uint8Array([0xAA, 0xDD, (p & 0xFF)]); } catch(_) { this._pendingVendorPayload = null; }

        // Strategy A: descriptor‑sized buffer, write at offset 0
        const payloadA = this.alloc_req(0x80, [0, 0, 0]);
        if (payloadA && payloadA.length) {
          payloadA[0] = 0xAA; payloadA[1] = 0xDD; payloadA[2] = p & 0xFF;
          try {
            const hexA = Array.from(payloadA).map(b => b.toString(16).padStart(2,'0')).join('');
            window.__uploadLogger?.logInfo?.(`pre-send A (alloc_req) FEAT 0x80: aadd${(p & 0xFF).toString(16).padStart(2,'0')} len=${payloadA.length} hex=${hexA.substring(0, 64)}...`);
          } catch(_){ }
          await this.sendFeatureReport(0x80, payloadA);
          attempts++;
          window.__uploadLogger?.logInfo?.('sent A');
          await sleep(60);
        } else {
          window.__uploadLogger?.logInfo?.('alloc_req returned empty buffer for 0x80; falling back to raw strategies');
        }

        // Optional debug sends (B/C/D)
        const debug = !!(typeof window !== 'undefined' && window.__fwDebug);
        if (debug) {
          const payloadB = [0xAA, 0xDD, (p & 0xFF)];
          window.__uploadLogger?.logInfo?.(`pre-send B (array) FEAT 0x80: aadd${(p & 0xFF).toString(16).padStart(2,'0')} len=dynamic`);
          await this.sendFeatureReport(0x80, payloadB);
          attempts++;
          window.__uploadLogger?.logInfo?.('sent B');
          await sleep(40);

          const forcedLen = 63;
          const payloadC = new Uint8Array(forcedLen);
          payloadC[0] = 0xAA; payloadC[1] = 0xDD; payloadC[2] = p & 0xFF;
          const hexC = Array.from(payloadC).map(b => b.toString(16).padStart(2,'0')).join('');
          window.__uploadLogger?.logInfo?.(`pre-send C (forced63) FEAT 0x80: aadd${(p & 0xFF).toString(16).padStart(2,'0')} len=${payloadC.length} hex=${hexC.substring(0, 64)}...`);
          await this.sendFeatureReport(0x80, payloadC);
          attempts++;
          window.__uploadLogger?.logInfo?.('sent C');

          try {
            const payloadD = this.alloc_req(0x80, new Array(63).fill(0));
            payloadD[0] = 0xAA; payloadD[1] = 0xDD; payloadD[2] = p & 0xFF;
            const hexD = Array.from(payloadD).map(b => b.toString(16).padStart(2,'0')).join('');
            window.__uploadLogger?.logInfo?.(`pre-send D (final-guard) FEAT 0x80: aadd${(p & 0xFF).toString(16).padStart(2,'0')} len=${payloadD.length} hex=${hexD.substring(0, 64)}...`);
            await this.sendFeatureReport(0x80, payloadD);
            attempts++;
            window.__uploadLogger?.logInfo?.('sent D');
          } catch(e) {
            window.__uploadLogger?.logInfo?.(`Strategy D failed: ${e?.message||e}`);
          }
        }

        window.__uploadLogger?.logInfo?.(`vendor write attempts=${attempts}`);
        try { this._pendingVendorPayload = null; } catch(_){}
      });

      // Best‑effort ack and initial NV poll
      await sleep(80);
      await step('read ack', async () => { try { await this.receiveFeatureReport(0x81); } catch(_){} });
      await pollNv(3, 120);

      // Speculative readback (probe)
      await step('readback probe', async () => { await tryVendorReadback(); });

      // Secondary variant: length+CRC envelope (speculative) — AA 01 DD 01 p CRC8
      await step('write deadzone vendor cmd (variant CRC8)', async () => {
        const body = [0x01, 0xDD, 0x01, (p & 0xFF)];
        const crc = crc8_maxim(body);
        const pkt = [0xAA, ...body, crc];
        window.__uploadLogger?.logInfo?.(`pre-send VAR (aa01dd01ppcrc) FEAT 0x80: ${pkt.map(b=>b.toString(16).padStart(2,'0')).join('')}`);
        await this.sendFeatureReport(0x80, pkt);
      });
      await sleep(100);
      await step('read ack (variant)', async () => { try { await this.receiveFeatureReport(0x81); } catch(_){} });
      const nvAfterVar = await pollNv(2, 120);

      const lockRes = await step('lock', async () => await this.nvsLock());
      await sleep(150);
      const nvFinal = await step('nv status after lock', async () => (await this.queryNvStatus()));

      if(!lockRes?.ok) throw (lockRes?.error || new Error('Lock failed'));

      // Post-lock reset to try committing changes
      await step('reset (post-lock)', async () => {
        try { window.__uploadLogger?.markCheckpoint?.('pre-reset'); } catch(_){ }
        await this.reset();
      });
      await sleep(300);

      // Best-effort finetune snapshot (post)
      try {
        const postFt = await this.getInMemoryModuleData();
        const fmtWords = (arr)=> Array.isArray(arr)? arr.map(v=> v.toString(16).padStart(4,'0')).join(' '): 'n/a';
        if (postFt) {
          window.__uploadLogger?.logInfo?.(`FINETUNE post: ${fmtWords(postFt)}`);
        }
      } catch(_) { /* ignore */ }

      // Summarize outcome
      try {
        const last = nvAfterVar?.[nvAfterVar.length-1] || nvFinal;
        const code = last?.raw != null ? '0x'+last.raw.toString(16) : String(last?.code ?? '');
        window.__uploadLogger?.logInfo?.(`SUMMARY: sent p=${p}% ; final NV status=${last?.status||'unknown'} ${code}`);
      } catch(_){ }
      return { success: true, message: `Deadzone (${p}%) sent to device (experimental).` };
    } catch (error) {
      return { success: false, message: `Failed to apply deadzone to device: ${error?.message || error}` };
    }
  }

  /**
   * Expert Plan B: Apply deadzone by rewriting Module 12 (finetune) edges (DS5/Edge only)
   * Shrinks each axis half-range by Dz% while keeping calibrated center C intact.
   * USB-only; backs up snapshot per-serial before write; verify and log.
   */
  async applyDeviceDeadzoneFinetune(percent, { dryRun = false } = {}) {
    const model = this.getModel?.();
    if (model !== 'DS5' && model !== 'DS5_Edge') {
      throw new Error(l("Finetune write is supported only on DualSense/Edge"));
    }
    if ((window.__transport || 'unknown') !== 'USB') {
      throw new Error(l("Please connect using USB to apply finetune changes"));
    }
    const p = Math.max(0, Math.min(40, Math.round(Number(percent) || 0)));
    const D = p / 100.0;

    const logInfo = (msg) => { try { window.__uploadLogger?.logInfo?.(msg); } catch(_){} };
    const now = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
    const step = async (label, fn) => { const t0 = now(); const r = await fn(); const t1 = now(); logInfo(`${label} took ${Math.max(0, t1 - t0).toFixed(1)}ms`); return r; };

    // Read current finetune (Module 12)
    const before = await step('read finetune (pre)', async () => await this.getInMemoryModuleData());
    if (!Array.isArray(before) || before.length !== 12) {
      throw new Error(l("Cannot read finetune module (12)"));
    }

    // Backup per serial
    try {
      const sn = await this.getSerialNumber();
      Storage.finetuneBackups.set(sn, before);
      logInfo(`FINETUNE backup saved for ${sn}`);
    } catch (e) { logInfo(`FINETUNE backup failed: ${e?.message||e}`); }

    // Compute new finetune array
    const idx = { LL:0, LT:1, RL:2, RT:3, LR:4, LB:5, RR:6, RB:7, LX:8, LY:9, RX:10, RY:11 };
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const computeAxis = (C, eNeg, ePos) => {
      const minE = Math.min(eNeg, ePos);
      const maxE = Math.max(eNeg, ePos);
      const Hn = Math.max(0, C - minE);
      const Hp = Math.max(0, maxE - C);
      let DzN = Math.round(D * Hn);
      let DzP = Math.round(D * Hp);
      if (DzN >= Hn && Hn > 0) DzN = Math.max(0, Hn - 1);
      if (DzP >= Hp && Hp > 0) DzP = Math.max(0, Hp - 1);
      let newMin = C - (Hn - DzN); // = min + DzN
      let newMax = C + (Hp - DzP); // = max - DzP
      newMin = clamp(newMin, minE + 1, maxE - 1);
      newMax = clamp(newMax, minE + 1, maxE - 1);
      return { newMin, newMax };
    };

    const after = before.slice();
    // Left X: LL/LR around LX
    {
      const C = before[idx.LX], neg = before[idx.LL], pos = before[idx.LR];
      const { newMin, newMax } = computeAxis(C, neg, pos);
      after[idx.LL] = Math.min(newMin, newMax);
      after[idx.LR] = Math.max(newMin, newMax);
    }
    // Left Y: LB/LT around LY
    {
      const C = before[idx.LY], neg = before[idx.LB], pos = before[idx.LT];
      const { newMin, newMax } = computeAxis(C, neg, pos);
      after[idx.LB] = Math.min(newMin, newMax);
      after[idx.LT] = Math.max(newMin, newMax);
    }
    // Right X: RL/RR around RX
    {
      const C = before[idx.RX], neg = before[idx.RL], pos = before[idx.RR];
      const { newMin, newMax } = computeAxis(C, neg, pos);
      after[idx.RL] = Math.min(newMin, newMax);
      after[idx.RR] = Math.max(newMin, newMax);
    }
    // Right Y: RB/RT around RY
    {
      const C = before[idx.RY], neg = before[idx.RB], pos = before[idx.RT];
      const { newMin, newMax } = computeAxis(C, neg, pos);
      after[idx.RB] = Math.min(newMin, newMax);
      after[idx.RT] = Math.max(newMin, newMax);
    }

    // Log preview diff
    const hex16 = (n)=> Number(n & 0xffff).toString(16).padStart(4,'0');
    const names = ['LL','LT','RL','RT','LR','LB','RR','RB','LX','LY','RX','RY'];
    let changes = 0;
    for (let i=0;i<12;i++) {
      if (before[i] !== after[i]) {
        changes++;
        logInfo(`FINETUNE DIFF [${names[i]} @${i}] ${before[i]}(0x${hex16(before[i])}) -> ${after[i]}(0x${hex16(after[i])})`);
      }
    }

    if (dryRun || (typeof window !== 'undefined' && window.__fwDebug)) {
      logInfo(`FINETUNE dry-run: p=${p}% changes=${changes}`);
      return { success: true, message: `Dry-run: ${changes} finetune words would change for ${p}%` };
    }

    await step('unlock', async () => { await this.nvsUnlock(); });
    await sleep(80);
    await step('write finetune', async () => { await this.writeFinetuneData(after); });
    await sleep(120);
    const readBack = await step('read finetune (post-write)', async () => await this.getInMemoryModuleData());
    let verifyOk = Array.isArray(readBack) && readBack.length===12 && readBack.every((v,i)=>v===after[i]);
    if (!verifyOk) logInfo('WARN: post-write readback does not fully match intended values');
    const lockRes = await step('lock', async () => await this.nvsLock());
    if(!lockRes?.ok) throw (lockRes?.error || new Error('Lock failed'));
    await step('reset (post-lock)', async () => { try { window.__uploadLogger?.markCheckpoint?.('pre-reset'); } catch(_){} await this.reset(); });
    await sleep(250);

    const final = await step('read finetune (final)', async () => await this.getInMemoryModuleData());
    let finalOk = Array.isArray(final) && final.length===12 && final.every((v,i)=>v===after[i]);
    logInfo(`SUMMARY: finetune write p=${p}% wordsChanged=${changes} verify=${finalOk?'ok':'mismatch'}`);
    return { success: true, message: `Finetune deadzone (${p}%) applied. Changed ${changes} words.` };
  }

  /** Restore last finetune backup for this controller (per-serial) */
  async restoreFinetuneBackup() {
    const model = this.getModel?.();
    if (model !== 'DS5' && model !== 'DS5_Edge') {
      throw new Error(l("Restore is supported only on DualSense/Edge"));
    }
    const sn = await this.getSerialNumber();
    const backup = Storage.finetuneBackups.get(sn);
    if (!Array.isArray(backup) || backup.length !== 12) {
      throw new Error(l("No finetune backup available for this device"));
    }
    const logInfo = (msg) => { try { window.__uploadLogger?.logInfo?.(msg); } catch(_){} };
    logInfo(`FINETUNE restore invoked for ${sn}`);
    await this.nvsUnlock();
    await sleep(60);
    await this.writeFinetuneData(backup);
    await sleep(120);
    await this.nvsLock();
    await sleep(150);
    await this.reset();
    const post = await this.getInMemoryModuleData();
    const ok = Array.isArray(post) && post.length===12 && post.every((v,i)=>v===backup[i]);
    logInfo(`SUMMARY: restore ${ok?'ok':'mismatch'}`);
    return { success: ok, message: ok ? l("Finetune restored from backup") : l("Restore completed with mismatches; see log") };
  }

  /**
   * Initialize the current output state when the controller is first connected.
   * Since DS5 controllers don't provide a way to read the current output state,
   * this method sets up reasonable defaults and attempts to detect any current settings.
   */
  async initializeCurrentOutputState() {
    try {
      // Reset all output state to known defaults
      this.currentOutputState = {
        ...this.getCurrentOutputState(),
        validFlag1: 0b1111_0111,
        ledCRed: 0,
        ledCGreen: 0,
        ledCBlue: 255,
      };

      // Send a "reset" output report to ensure the controller is in a known state
      // This will turn off any existing effects and set the controller to defaults
      const resetOutputStruct = new DS5OutputStruct(this.currentOutputState);
      await this.sendOutputReport(resetOutputStruct.pack(), 'init default states');

      // Update our state to reflect what we just sent
      this.updateCurrentOutputState(resetOutputStruct);
    } catch (error) {
      console.warn("Failed to initialize DS5 output state:", error);
      // Even if the reset fails, we still have the default state initialized
    }
  }

  /**
   * Set left adaptive trigger to single-trigger mode
   */
  async setAdaptiveTrigger(left, right) {
    try {
      const modeMap = {
        'off': DS5_TRIGGER_EFFECT_MODE.OFF,
        'single': DS5_TRIGGER_EFFECT_MODE.TRIGGER,
        'auto': DS5_TRIGGER_EFFECT_MODE.AUTO_TRIGGER,
        'resistance': DS5_TRIGGER_EFFECT_MODE.RESISTANCE,
      }

      // Create output structure with current controller state
      const { validFlag0 } = this.currentOutputState;
      const outputStruct = new DS5OutputStruct({
        ...this.currentOutputState,
        adaptiveTriggerLeftMode: modeMap[left.mode],
        adaptiveTriggerLeftParam0: left.start,
        adaptiveTriggerLeftParam1: left.end,
        adaptiveTriggerLeftParam2: left.force,

        adaptiveTriggerRightMode: modeMap[right.mode],
        adaptiveTriggerRightParam0: right.start,
        adaptiveTriggerRightParam1: right.end,
        adaptiveTriggerRightParam2: right.force,

        validFlag0: validFlag0 | DS5_VALID_FLAG0.LEFT_TRIGGER | DS5_VALID_FLAG0.RIGHT_TRIGGER,
      });
      await this.sendOutputReport(outputStruct.pack(), 'set adaptive trigger mode');
      outputStruct.validFlag0 &= ~(DS5_VALID_FLAG0.LEFT_TRIGGER | DS5_VALID_FLAG0.RIGHT_TRIGGER);

      // Update current state to reflect the changes
      this.updateCurrentOutputState(outputStruct);

      return { success: true };
    } catch (error) {
      throw new Error("Failed to set left adaptive trigger mode", { cause: error });
    }
  }

  /**
   * Set vibration motors for haptic feedback
   * @param {number} heavyLeft - Left motor intensity (0-255)
   * @param {number} lightRight - Right motor intensity (0-255)
   */
  async setVibration(heavyLeft = 0, lightRight = 0) {
    try {
      const { validFlag0 } = this.currentOutputState;
      const outputStruct = new DS5OutputStruct({
        ...this.currentOutputState,
        bcVibrationLeft: Math.max(0, Math.min(255, heavyLeft)),
        bcVibrationRight: Math.max(0, Math.min(255, lightRight)),
        validFlag0: validFlag0 | DS5_VALID_FLAG0.LEFT_VIBRATION | DS5_VALID_FLAG0.RIGHT_VIBRATION, // Update both vibration motors
      });
      await this.sendOutputReport(outputStruct.pack(), 'set vibration');
      outputStruct.validFlag0 &= ~(DS5_VALID_FLAG0.LEFT_VIBRATION | DS5_VALID_FLAG0.RIGHT_VIBRATION);

      // Update current state to reflect the changes
      this.updateCurrentOutputState(outputStruct);
    } catch (error) {
      throw new Error("Failed to set vibration", { cause: error });
    }
  }

  /**
   * Test speaker tone by controlling speaker volume and audio settings
   * This creates a brief audio feedback through the controller's speaker or headphones
   * @param {string} output - Audio output destination: "speaker" (default) or "headphones"
   */
  async setSpeakerTone(output = "speaker") {
    try {
      const { validFlag0 } = this.currentOutputState;
      const outputStruct = new DS5OutputStruct({
        ...this.currentOutputState,
        speakerVolume: 85,
        headphoneVolume: 55,
        validFlag0: validFlag0 | DS5_VALID_FLAG0.HEADPHONE_VOLUME | DS5_VALID_FLAG0.SPEAKER_VOLUME | DS5_VALID_FLAG0.AUDIO_CONTROL,
      });
      await this.sendOutputReport(outputStruct.pack(), output === "headphones" ? 'play headphone tone' : 'play speaker tone');
      outputStruct.validFlag0 &= ~(DS5_VALID_FLAG0.HEADPHONE_VOLUME | DS5_VALID_FLAG0.SPEAKER_VOLUME | DS5_VALID_FLAG0.AUDIO_CONTROL);

      // Send feature reports to enable audio
      if (output === "headphones") {
        // Audio configuration command for headphones
        await this.sendFeatureReport(128, [6, 4, 0, 0, 0, 0, 4, 0, 6]);
        // Enable headphone tone
        await this.sendFeatureReport(128, [6, 2, 1, 1, 0]);
      } else {
        // Audio configuration command for speakers
        await this.sendFeatureReport(128, [6, 4, 0, 0, 8]);
        // Enable speaker tone
        await this.sendFeatureReport(128, [6, 2, 1, 1, 0]);
      }

      // Update current state to reflect the changes
      this.updateCurrentOutputState(outputStruct);
    } catch (error) {
      throw new Error("Failed to set speaker tone", { cause: error });
    }
  }

  /**
   * Reset speaker settings to default (turn off speaker)
   */
  async resetSpeakerSettings() {
    try {
      // Disable speaker tone first via feature report
      await this.sendFeatureReport(128, [6, 2, 0, 1, 0]);

      const { validFlag0 } = this.currentOutputState;
      const outputStruct = new DS5OutputStruct({
        ...this.currentOutputState,
        speakerVolume: 0,
        validFlag0: validFlag0 | DS5_VALID_FLAG0.SPEAKER_VOLUME | DS5_VALID_FLAG0.AUDIO_CONTROL,
      });
      // outputStruct.audioControl = 0x00;
      await this.sendOutputReport(outputStruct.pack(), 'stop speaker tone');
      outputStruct.validFlag0 &= ~(DS5_VALID_FLAG0.SPEAKER_VOLUME | DS5_VALID_FLAG0.AUDIO_CONTROL);

      // Update current state to reflect the changes
      this.updateCurrentOutputState(outputStruct);
    } catch (error) {
      throw new Error("Failed to reset speaker settings", { cause: error });
    }
  }

  /**
   * Set lightbar color
   * @param {number} red - Red component (0-255)
   * @param {number} green - Green component (0-255)
   * @param {number} blue - Blue component (0-255)
   */
  async setLightbarColor(red = 0, green = 0, blue = 0) {
    try {
      const { validFlag1 } = this.currentOutputState;
      const outputStruct = new DS5OutputStruct({
        ...this.currentOutputState,
        ledCRed: Math.max(0, Math.min(255, red)),
        ledCGreen: Math.max(0, Math.min(255, green)),
        ledCBlue: Math.max(0, Math.min(255, blue)),
        validFlag1: validFlag1 | DS5_VALID_FLAG1.LIGHTBAR_COLOR,
      });
      await this.sendOutputReport(outputStruct.pack(), 'set lightbar color');
      outputStruct.validFlag1 &= ~DS5_VALID_FLAG1.LIGHTBAR_COLOR;

      // Update current state to reflect the changes
      this.updateCurrentOutputState(outputStruct);
    } catch (error) {
      throw new Error("Failed to set lightbar color", { cause: error });
    }
  }

  /**
   * Set player indicator lights
   * @param {number} pattern - Player indicator pattern (0-31, each bit represents a light)
   */
  async setPlayerIndicator(pattern = 0) {
    try {
      const { validFlag1 } = this.currentOutputState;
      const outputStruct = new DS5OutputStruct({
        ...this.currentOutputState,
        playerIndicator: Math.max(0, Math.min(31, pattern)),
        validFlag1: validFlag1 | DS5_VALID_FLAG1.PLAYER_INDICATOR,
      });
      await this.sendOutputReport(outputStruct.pack(), 'set player indicator');
      outputStruct.validFlag1 &= ~DS5_VALID_FLAG1.PLAYER_INDICATOR;

      // Update current state to reflect the changes
      this.updateCurrentOutputState(outputStruct);
    } catch (error) {
      throw new Error("Failed to set player indicator", { cause: error });
    }
  }

  /**
   * Reset lights to default state (turn off)
   */
  async resetLights() {
    try {
      await this.setLightbarColor(0, 0, 0);
      await this.setPlayerIndicator(0);
      await this.setMuteLed(0);
    } catch (error) {
      throw new Error("Failed to reset lights", { cause: error });
    }
  }

  /**
   * Set mute button LED state
   * @param {number} state - Mute LED state (0 = off, 1 = solid, 2 = pulsing)
   */
  async setMuteLed(state = 0) {
    try {
      const { validFlag1 } = this.currentOutputState;
      const outputStruct = new DS5OutputStruct({
        ...this.currentOutputState,
        muteLedControl: Math.max(0, Math.min(2, state)),
        validFlag1: validFlag1 | DS5_VALID_FLAG1.MUTE_LED,
      });
      await this.sendOutputReport(outputStruct.pack(), 'set mute LED');
      outputStruct.validFlag1 &= ~DS5_VALID_FLAG1.MUTE_LED;

      // Update current state to reflect the changes
      this.updateCurrentOutputState(outputStruct);
    } catch (error) {
      throw new Error("Failed to set mute LED", { cause: error });
    }
  }

  getNumberOfSticks() {
    return 2;
  }

  /**
  * Parse DS5 battery status from input data
  */
  parseBatteryStatus(data) {
    const bat = data.getUint8(52); // DS5 battery byte is at position 52

    // DS5: bat_charge = low 4 bits, bat_status = high 4 bits
    const bat_charge = bat & 0x0f;
    const bat_status = bat >> 4;

    let charge_level = 0;
    let cable_connected = false;
    let is_charging = false;
    let is_error = false;

    switch (bat_status) {
      case 0:
        // On battery power
        charge_level = Math.min(bat_charge * 10 + 5, 100);
        break;
      case 1:
        // Charging
        charge_level = Math.min(bat_charge * 10 + 5, 100);
        is_charging = true;
        cable_connected = true;
        break;
      case 2:
        // Fully charged
        charge_level = 100;
        cable_connected = true;
        break;
      case 15:
        // Battery is flat
        charge_level = 0;
        is_charging = true;
        cable_connected = true;
        break;
      case 11: // not sure yet what this error means
      default:
        // Error state
        is_error = true;
        break;
    }

    return { charge_level, cable_connected, is_charging, is_error };
  }
}

export default DS5Controller;
