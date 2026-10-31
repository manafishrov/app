import Foundation

enum DocumentStorageError: LocalizedError {
  case inaccessibleDirectory

  var errorDescription: String? {
    switch self {
    case .inaccessibleDirectory:
      return "The selected folder is no longer accessible. Choose it again in settings."
    }
  }
}

/// File access for folders picked in the Files app. A directory token is a
/// base64 bookmark of a picked folder, or empty for the app's Documents
/// folder, which the Files app shows under "On My iPhone/iPad > Manafish".
final class DocumentStorage {
  private let fileManager = FileManager.default

  func retainDirectory(_ url: URL) throws -> String {
    let accessing = url.startAccessingSecurityScopedResource()
    defer {
      if accessing {
        url.stopAccessingSecurityScopedResource()
      }
    }
    return try url.bookmarkData().base64EncodedString()
  }

  func describeDirectory(_ directory: String) throws -> String {
    if directory.isEmpty {
      return "Manafish"
    }
    return try resolve(directory).lastPathComponent
  }

  /// Copies `source` into the directory and returns where it was saved.
  func saveToDirectory(source: URL, directory: String, fileName: String) throws -> String {
    let folder = try directory.isEmpty ? documentsDirectory() : resolve(directory)
    let accessing = folder.startAccessingSecurityScopedResource()
    defer {
      if accessing {
        folder.stopAccessingSecurityScopedResource()
      }
    }
    let target = availableURL(in: folder, fileName: fileName)
    try fileManager.copyItem(at: source, to: target)
    return "\(folder.lastPathComponent)/\(target.lastPathComponent)"
  }

  private func documentsDirectory() throws -> URL {
    try fileManager.url(
      for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
  }

  private func resolve(_ directory: String) throws -> URL {
    guard let bookmark = Data(base64Encoded: directory) else {
      throw DocumentStorageError.inaccessibleDirectory
    }
    var stale = false
    return try URL(resolvingBookmarkData: bookmark, bookmarkDataIsStale: &stale)
  }

  private func availableURL(in folder: URL, fileName: String) -> URL {
    let candidate = folder.appendingPathComponent(fileName)
    if !fileManager.fileExists(atPath: candidate.path) {
      return candidate
    }
    let base = candidate.deletingPathExtension().lastPathComponent
    let ext = candidate.pathExtension
    var number = 1
    while true {
      let name = ext.isEmpty ? "\(base) (\(number))" : "\(base) (\(number)).\(ext)"
      let next = folder.appendingPathComponent(name)
      if !fileManager.fileExists(atPath: next.path) {
        return next
      }
      number += 1
    }
  }
}
