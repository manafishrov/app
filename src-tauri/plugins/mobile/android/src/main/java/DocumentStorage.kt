package com.manafishrov.mobile

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.provider.DocumentsContract
import android.provider.MediaStore
import android.provider.OpenableColumns
import java.io.File
import java.io.IOException

private const val DEFAULT_FOLDER = "Manafish"

/**
 * File access through the Storage Access Framework. A directory token is the
 * URI of a folder the user picked (with persisted access), or empty for the
 * default shared folder (Movies/Manafish or Download/Manafish, by type).
 */
internal class DocumentStorage(private val context: Context) {
  private val resolver = context.contentResolver

  fun retainDirectory(tree: Uri): String {
    resolver.takePersistableUriPermission(
      tree,
      Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
    )
    return tree.toString()
  }

  fun describeDirectory(directory: String): String {
    if (directory.isEmpty()) {
      return "${Environment.DIRECTORY_MOVIES}/$DEFAULT_FOLDER"
    }
    val tree = Uri.parse(directory)
    return displayName(treeDocument(tree)) ?: tree.lastPathSegment ?: directory
  }

  /** Copies [source] into the directory and returns where it was saved. */
  fun saveToDirectory(source: File, directory: String, fileName: String, mimeType: String): String {
    if (directory.isEmpty()) {
      return saveToSharedFolder(source, fileName, mimeType)
    }
    val tree = Uri.parse(directory)
    val document =
      DocumentsContract.createDocument(resolver, treeDocument(tree), mimeType, fileName)
        ?: throw IOException("Could not create $fileName in the selected folder")
    copyTo(source, document)
    return "${describeDirectory(directory)}/${displayName(document) ?: fileName}"
  }

  fun copyTo(source: File, target: Uri) {
    val output =
      resolver.openOutputStream(target, "wt") ?: throw IOException("Could not open $target")
    output.use { stream -> source.inputStream().use { it.copyTo(stream) } }
  }

  /** Copies a picked document into the cache so Rust can read it by path. */
  fun importToCache(source: Uri): File {
    val name = (displayName(source) ?: "import").replace('/', '_')
    val directory = File(context.cacheDir, "imports").apply { mkdirs() }
    val target = File(directory, name)
    val input = resolver.openInputStream(source) ?: throw IOException("Could not open $source")
    input.use { stream -> target.outputStream().use { stream.copyTo(it) } }
    return target
  }

  private fun saveToSharedFolder(source: File, fileName: String, mimeType: String): String {
    val video = mimeType.startsWith("video/")
    val folder =
      if (video) Environment.DIRECTORY_MOVIES else Environment.DIRECTORY_DOWNLOADS
    val collection =
      if (video) MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      else MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    val values =
      ContentValues().apply {
        put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
        put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
        put(MediaStore.MediaColumns.RELATIVE_PATH, "$folder/$DEFAULT_FOLDER")
        put(MediaStore.MediaColumns.IS_PENDING, 1)
      }
    val item = resolver.insert(collection, values) ?: throw IOException("Could not create $fileName")
    try {
      copyTo(source, item)
    } catch (error: IOException) {
      resolver.delete(item, null, null)
      throw error
    }
    resolver.update(
      item,
      ContentValues().apply { put(MediaStore.MediaColumns.IS_PENDING, 0) },
      null,
      null
    )
    return "$folder/$DEFAULT_FOLDER/${displayName(item) ?: fileName}"
  }

  private fun treeDocument(tree: Uri): Uri =
    DocumentsContract.buildDocumentUriUsingTree(tree, DocumentsContract.getTreeDocumentId(tree))

  private fun displayName(uri: Uri): String? =
    resolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { cursor ->
      if (cursor.moveToFirst()) cursor.getString(0) else null
    }
}
