package com.manafishrov.mobile

import android.content.Context
import android.hardware.input.InputManager
import android.os.Build
import android.os.CombinedVibration
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.view.InputDevice
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.Window
import app.tauri.plugin.Channel
import app.tauri.plugin.JSArray
import app.tauri.plugin.JSObject
import kotlin.math.abs
import kotlin.math.max
import java.util.concurrent.Executors
import kotlin.math.roundToInt

private const val BUTTON_COUNT = 17
private const val TRIGGER_THRESHOLD = 0.1f

// W3C "standard" gamepad button order, matching the desktop SDL stream.
private val BUTTON_INDEX =
  mapOf(
    KeyEvent.KEYCODE_BUTTON_A to 0,
    KeyEvent.KEYCODE_BUTTON_B to 1,
    KeyEvent.KEYCODE_BUTTON_X to 2,
    KeyEvent.KEYCODE_BUTTON_Y to 3,
    KeyEvent.KEYCODE_BUTTON_L1 to 4,
    KeyEvent.KEYCODE_BUTTON_R1 to 5,
    KeyEvent.KEYCODE_BUTTON_L2 to 6,
    KeyEvent.KEYCODE_BUTTON_R2 to 7,
    KeyEvent.KEYCODE_BUTTON_SELECT to 8,
    KeyEvent.KEYCODE_BACK to 8,
    KeyEvent.KEYCODE_BUTTON_START to 9,
    KeyEvent.KEYCODE_BUTTON_THUMBL to 10,
    KeyEvent.KEYCODE_BUTTON_THUMBR to 11,
    KeyEvent.KEYCODE_DPAD_UP to 12,
    KeyEvent.KEYCODE_DPAD_DOWN to 13,
    KeyEvent.KEYCODE_DPAD_LEFT to 14,
    KeyEvent.KEYCODE_DPAD_RIGHT to 15,
    KeyEvent.KEYCODE_BUTTON_MODE to 16,
  )

private class Gamepad(val index: Int, val device: InputDevice) {
  val axes = FloatArray(4)
  // Triggers and the d-pad hat can arrive as axes or as key events.
  val axisButtons = FloatArray(BUTTON_COUNT)
  val keyButtons = FloatArray(BUTTON_COUNT)
}

/**
 * Reads game controllers from the activity's input events and streams
 * snapshots shaped like the desktop SDL `gamepad_event` payload.
 */
internal class GamepadInput(context: Context) : InputManager.InputDeviceListener {
  private val inputManager = context.getSystemService(InputManager::class.java)
  private val gamepads = mutableMapOf<Int, Gamepad>()
  private var channel: Channel? = null
  // Delivering to the WebView needs the UI thread, so sending from it would
  // deadlock; a single thread keeps snapshots in order.
  private val sender = Executors.newSingleThreadExecutor()
  private var window: Window? = null
  private var originalCallback: Window.Callback? = null

  /** Sees controller events before the WebView, which would otherwise treat B as back. */
  fun attach(window: Window) {
    val original = window.callback
    this.window = window
    originalCallback = original
    window.callback =
      object : Window.Callback by original {
        override fun dispatchKeyEvent(event: KeyEvent): Boolean =
          onKeyEvent(event) || original.dispatchKeyEvent(event)

        override fun dispatchGenericMotionEvent(event: MotionEvent): Boolean =
          onMotionEvent(event) || original.dispatchGenericMotionEvent(event)
      }
  }

  fun detach() {
    originalCallback?.let { window?.callback = it }
    inputManager.unregisterInputDeviceListener(this)
    channel = null
    sender.shutdown()
  }

  fun start(channel: Channel) {
    val restarting = this.channel != null
    this.channel = channel
    if (!restarting) {
      inputManager.registerInputDeviceListener(this, Handler(Looper.getMainLooper()))
    }
    inputManager.inputDeviceIds.forEach(::onInputDeviceAdded)
    gamepads.values.forEach { send(it, connected = true) }
  }

  fun vibrate(index: Int, lowFreq: Float, highFreq: Float, durationMs: Long) {
    val device = gamepads.values.firstOrNull { it.index == index }?.device ?: return
    if (durationMs <= 0 || (lowFreq <= 0f && highFreq <= 0f)) {
      return
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val manager = device.vibratorManager
      val ids = manager.vibratorIds
      if (ids.isEmpty()) {
        return
      }
      val vibration =
        if (ids.size >= 2) {
          CombinedVibration.startParallel()
            .addVibrator(ids[0], oneShot(durationMs, lowFreq))
            .addVibrator(ids[1], oneShot(durationMs, highFreq))
            .combine()
        } else {
          CombinedVibration.createParallel(oneShot(durationMs, max(lowFreq, highFreq)))
        }
      manager.vibrate(vibration)
    } else {
      @Suppress("DEPRECATION")
      val vibrator = device.vibrator
      if (vibrator.hasVibrator()) {
        vibrator.vibrate(oneShot(durationMs, max(lowFreq, highFreq)))
      }
    }
  }

  override fun onInputDeviceAdded(deviceId: Int) {
    if (gamepads.containsKey(deviceId)) {
      return
    }
    val device = InputDevice.getDevice(deviceId) ?: return
    if (device.isVirtual || !isGamepad(device.sources)) {
      return
    }
    val used = gamepads.values.map { it.index }.toSet()
    val gamepad = Gamepad(generateSequence(0) { it + 1 }.first { it !in used }, device)
    gamepads[deviceId] = gamepad
    send(gamepad, connected = true)
  }

  override fun onInputDeviceRemoved(deviceId: Int) {
    gamepads.remove(deviceId)?.let { send(it, connected = false) }
  }

  override fun onInputDeviceChanged(deviceId: Int) {}

  private fun onKeyEvent(event: KeyEvent): Boolean {
    if (channel == null || !isGamepad(event.source)) {
      return false
    }
    val gamepad = gamepads[event.deviceId] ?: return false
    val button = BUTTON_INDEX[event.keyCode] ?: return false
    when (event.action) {
      KeyEvent.ACTION_DOWN -> gamepad.keyButtons[button] = 1f
      KeyEvent.ACTION_UP -> gamepad.keyButtons[button] = 0f
      else -> return true
    }
    if (event.repeatCount == 0) {
      send(gamepad, connected = true)
    }
    return true
  }

  private fun onMotionEvent(event: MotionEvent): Boolean {
    if (
      channel == null ||
        (event.source and InputDevice.SOURCE_JOYSTICK) != InputDevice.SOURCE_JOYSTICK ||
        event.action != MotionEvent.ACTION_MOVE
    ) {
      return false
    }
    val gamepad = gamepads[event.deviceId] ?: return false
    val device = gamepad.device
    val rightX = if (device.getMotionRange(MotionEvent.AXIS_Z) != null) MotionEvent.AXIS_Z else MotionEvent.AXIS_RX
    val rightY = if (device.getMotionRange(MotionEvent.AXIS_RZ) != null) MotionEvent.AXIS_RZ else MotionEvent.AXIS_RY
    gamepad.axes[0] = axis(event, device, MotionEvent.AXIS_X)
    gamepad.axes[1] = axis(event, device, MotionEvent.AXIS_Y)
    gamepad.axes[2] = axis(event, device, rightX)
    gamepad.axes[3] = axis(event, device, rightY)
    gamepad.axisButtons[6] =
      max(axis(event, device, MotionEvent.AXIS_LTRIGGER), axis(event, device, MotionEvent.AXIS_BRAKE))
    gamepad.axisButtons[7] =
      max(axis(event, device, MotionEvent.AXIS_RTRIGGER), axis(event, device, MotionEvent.AXIS_GAS))
    val hatX = axis(event, device, MotionEvent.AXIS_HAT_X)
    val hatY = axis(event, device, MotionEvent.AXIS_HAT_Y)
    gamepad.axisButtons[12] = if (hatY < -0.5f) 1f else 0f
    gamepad.axisButtons[13] = if (hatY > 0.5f) 1f else 0f
    gamepad.axisButtons[14] = if (hatX < -0.5f) 1f else 0f
    gamepad.axisButtons[15] = if (hatX > 0.5f) 1f else 0f
    send(gamepad, connected = true)
    return true
  }

  private fun send(gamepad: Gamepad, connected: Boolean) {
    val channel = channel ?: return
    val buttons = JSArray()
    for (index in 0 until BUTTON_COUNT) {
      val value = max(gamepad.keyButtons[index], gamepad.axisButtons[index])
      buttons.put(JSObject().put("pressed", value > TRIGGER_THRESHOLD).put("value", value.toDouble()))
    }
    val axes = JSArray()
    gamepad.axes.forEach { axes.put(it.toDouble()) }
    val payload =
      JSObject()
        .put("id", gamepad.device.name)
        .put("index", gamepad.index)
        .put("connected", connected)
        .put("mapping", "standard")
        .put("axes", axes)
        .put("buttons", buttons)
        .put("timestamp", System.currentTimeMillis())
        .put(
          "vibrationActuator",
          if (hasVibrator(gamepad.device)) JSObject().put("type", "dual-rumble")
          else org.json.JSONObject.NULL,
        )
    sender.execute { channel.send(payload) }
  }

  private fun hasVibrator(device: InputDevice): Boolean =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      device.vibratorManager.vibratorIds.isNotEmpty()
    } else {
      @Suppress("DEPRECATION") device.vibrator.hasVibrator()
    }
}

private fun isGamepad(sources: Int): Boolean =
  (sources and InputDevice.SOURCE_GAMEPAD) == InputDevice.SOURCE_GAMEPAD ||
    (sources and InputDevice.SOURCE_JOYSTICK) == InputDevice.SOURCE_JOYSTICK

/** Axis value with the device's centre dead zone (its flat range) removed. */
private fun axis(event: MotionEvent, device: InputDevice, axis: Int): Float {
  val range = device.getMotionRange(axis, event.source) ?: return 0f
  val value = event.getAxisValue(axis)
  return if (abs(value) > range.flat) value else 0f
}

private fun oneShot(durationMs: Long, strength: Float): VibrationEffect {
  val amplitude = (strength.coerceIn(0f, 1f) * 255).roundToInt()
  return if (amplitude == 0) {
    VibrationEffect.createWaveform(longArrayOf(durationMs), intArrayOf(0), -1)
  } else {
    VibrationEffect.createOneShot(durationMs, amplitude)
  }
}
