package com.manafishrov.mobile

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder

private const val CHANNEL_ID = "file-picker"
private const val NOTIFICATION_ID = 1

/**
 * Keeps the app in the foreground while a system file picker covers it.
 * From Android 15 an app in the background loses network access a few
 * seconds after its activity stops, which would drop the ROV connection while
 * the user picks a file. Short services stop themselves after three minutes.
 */
class FilePickerService : Service() {
  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    getSystemService(NotificationManager::class.java)
      .createNotificationChannel(
        NotificationChannel(CHANNEL_ID, "File picker", NotificationManager.IMPORTANCE_MIN)
      )
    val notification =
      Notification.Builder(this, CHANNEL_ID)
        .setSmallIcon(applicationInfo.icon)
        .setContentTitle("Keeping the ROV connected")
        .build()
    startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE)
    return START_NOT_STICKY
  }

  override fun onTimeout(startId: Int) {
    stopSelf()
  }

  companion object {
    fun start(context: Context) {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
        context.startForegroundService(Intent(context, FilePickerService::class.java))
      }
    }

    fun stop(context: Context) {
      context.stopService(Intent(context, FilePickerService::class.java))
    }
  }
}
