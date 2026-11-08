package com.manafishrov.mobile

import android.app.Activity
import android.content.Intent
import android.content.pm.ActivityInfo
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebView
import androidx.activity.result.ActivityResult
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.core.view.updateLayoutParams
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Channel
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.File
import kotlin.concurrent.thread
import org.json.JSONObject

@InvokeArg
class GamepadStreamArgs {
  lateinit var channel: Channel
}

@InvokeArg
class VibrateGamepadArgs {
  var index: Int = 0
  var lowFreq: Float = 0f
  var highFreq: Float = 0f
  var durationMs: Long = 0
}

@InvokeArg
class RovAddressArgs {
  lateinit var address: String
}

@InvokeArg
class DirectoryArgs {
  lateinit var directory: String
}

@InvokeArg
class SaveToDirectoryArgs {
  lateinit var source: String
  lateinit var directory: String
  lateinit var fileName: String
  lateinit var mimeType: String
}

@InvokeArg
class ExportFileArgs {
  lateinit var source: String
  lateinit var fileName: String
  lateinit var mimeType: String
}

@InvokeArg
class ImportFileArgs {
  lateinit var mimeTypes: Array<String>
}

@TauriPlugin
class MobilePlugin(private val activity: Activity) : Plugin(activity) {
  private val gamepads = GamepadInput(activity)
  private val rovNetwork = RovNetwork(activity)
  private val storage = DocumentStorage(activity)

  override fun load(webView: WebView) {
    val window = activity.window
    // The ROV stops its thrusters when control input stops, so the screen
    // must not sleep while piloting.
    window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    activity.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
    hideSystemBars()
    // Keep the web content clear of camera cutouts, bars the user swipes in
    // and the on-screen keyboard, so the UI never needs to know about Android
    // insets. Edge-to-edge windows do not resize for the keyboard by themselves.
    ViewCompat.setOnApplyWindowInsetsListener(webView) { view, insets ->
      val covered =
        insets.getInsets(
          WindowInsetsCompat.Type.systemBars() or
            WindowInsetsCompat.Type.displayCutout() or
            WindowInsetsCompat.Type.ime()
        )
      view.updateLayoutParams<ViewGroup.MarginLayoutParams> {
        setMargins(covered.left, covered.top, covered.right, covered.bottom)
      }
      WindowInsetsCompat.CONSUMED
    }
    gamepads.attach(window)
  }

  override fun onResume() {
    FilePickerService.stop(activity)
    hideSystemBars()
  }

  override fun onDestroy() {
    gamepads.detach()
    rovNetwork.release()
  }

  private fun hideSystemBars() {
    val window = activity.window
    WindowCompat.getInsetsController(window, window.decorView).apply {
      systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
      hide(WindowInsetsCompat.Type.systemBars())
    }
  }

  @Command
  fun startGamepadStream(invoke: Invoke) {
    val args = invoke.parseArgs(GamepadStreamArgs::class.java)
    activity.runOnUiThread { gamepads.start(args.channel) }
    invoke.resolve()
  }

  @Command
  fun vibrateGamepad(invoke: Invoke) {
    val args = invoke.parseArgs(VibrateGamepadArgs::class.java)
    gamepads.vibrate(args.index, args.lowFreq, args.highFreq, args.durationMs)
    invoke.resolve()
  }

  @Command
  fun setRovAddress(invoke: Invoke) {
    val args = invoke.parseArgs(RovAddressArgs::class.java)
    rovNetwork.setAddress(args.address)
    invoke.resolve()
  }

  @Command
  fun pickDirectory(invoke: Invoke) {
    val intent =
      Intent(Intent.ACTION_OPEN_DOCUMENT_TREE).addFlags(
        Intent.FLAG_GRANT_READ_URI_PERMISSION or
          Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
          Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
      )
    pick(invoke, intent, "pickDirectoryResult")
  }

  @ActivityCallback
  fun pickDirectoryResult(invoke: Invoke, result: ActivityResult) {
    val tree = result.data?.data
    if (result.resultCode != Activity.RESULT_OK || tree == null) {
      invoke.resolve(JSObject().put("directory", JSONObject.NULL))
      return
    }
    runCatchingInto(invoke) {
      val directory = JSObject()
      directory.put("directory", storage.retainDirectory(tree))
      directory.put("name", storage.describeDirectory(tree.toString()))
      JSObject().put("directory", directory)
    }
  }

  @Command
  fun describeDirectory(invoke: Invoke) {
    val args = invoke.parseArgs(DirectoryArgs::class.java)
    runCatchingInto(invoke) {
      JSObject().put("name", storage.describeDirectory(args.directory))
    }
  }

  @Command
  fun saveToDirectory(invoke: Invoke) {
    val args = invoke.parseArgs(SaveToDirectoryArgs::class.java)
    runCatchingInto(invoke) {
      val location =
        storage.saveToDirectory(File(args.source), args.directory, args.fileName, args.mimeType)
      JSObject().put("location", location)
    }
  }

  @Command
  fun exportFile(invoke: Invoke) {
    val args = invoke.parseArgs(ExportFileArgs::class.java)
    val intent =
      Intent(Intent.ACTION_CREATE_DOCUMENT)
        .addCategory(Intent.CATEGORY_OPENABLE)
        .setType(args.mimeType)
        .putExtra(Intent.EXTRA_TITLE, args.fileName)
    pick(invoke, intent, "exportFileResult")
  }

  @ActivityCallback
  fun exportFileResult(invoke: Invoke, result: ActivityResult) {
    val target = result.data?.data
    if (result.resultCode != Activity.RESULT_OK || target == null) {
      invoke.resolve(JSObject().put("saved", false))
      return
    }
    val args = invoke.parseArgs(ExportFileArgs::class.java)
    runCatchingInto(invoke) {
      storage.copyTo(File(args.source), target)
      JSObject().put("saved", true)
    }
  }

  @Command
  fun importFile(invoke: Invoke) {
    val args = invoke.parseArgs(ImportFileArgs::class.java)
    val intent =
      Intent(Intent.ACTION_OPEN_DOCUMENT)
        .addCategory(Intent.CATEGORY_OPENABLE)
        .setType("*/*")
        .putExtra(Intent.EXTRA_MIME_TYPES, args.mimeTypes)
    pick(invoke, intent, "importFileResult")
  }

  @ActivityCallback
  fun importFileResult(invoke: Invoke, result: ActivityResult) {
    val source = result.data?.data
    if (result.resultCode != Activity.RESULT_OK || source == null) {
      invoke.resolve(JSObject().put("path", JSONObject.NULL))
      return
    }
    runCatchingInto(invoke) {
      JSObject().put("path", storage.importToCache(source).absolutePath)
    }
  }

  private fun pick(invoke: Invoke, intent: Intent, callback: String) {
    FilePickerService.start(activity)
    startActivityForResult(invoke, intent, callback)
  }

  // File copies can be large recordings, so keep them off the UI thread.
  private fun runCatchingInto(invoke: Invoke, block: () -> JSObject) {
    thread {
      try {
        invoke.resolve(block())
      } catch (error: Exception) {
        invoke.reject(error.message ?: error.toString())
      }
    }
  }
}
