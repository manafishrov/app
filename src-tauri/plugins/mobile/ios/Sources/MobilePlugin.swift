import Tauri
import UIKit
import UniformTypeIdentifiers
import WebKit

struct GamepadStreamArgs: Decodable {
  let channel: Channel
}

struct VibrateGamepadArgs: Decodable {
  let index: Int
  let lowFreq: Float
  let highFreq: Float
  let durationMs: Int
}

struct DirectoryArgs: Decodable {
  let directory: String
}

struct SaveToDirectoryArgs: Decodable {
  let source: String
  let directory: String
  let fileName: String
  let mimeType: String
}

struct ExportFileArgs: Decodable {
  let source: String
  let fileName: String
  let mimeType: String
}

struct ImportFileArgs: Decodable {
  let mimeTypes: [String]
}

struct PickedDirectory: Encodable {
  let directory: String
  let name: String
}

struct PickDirectoryResponse: Encodable {
  let directory: PickedDirectory?
}

struct NameResponse: Encodable {
  let name: String
}

struct LocationResponse: Encodable {
  let location: String
}

struct SavedResponse: Encodable {
  let saved: Bool
}

struct ImportFileResponse: Encodable {
  let path: String?
}

class MobilePlugin: Plugin {
  private let gamepads = GamepadInput()
  private let storage = DocumentStorage()
  // UIDocumentPickerViewController holds its delegate weakly.
  private var pickerDelegate: DocumentPickerDelegate?

  @objc public override func load(webview: WKWebView) {
    // The ROV stops its thrusters when control input stops, so the screen
    // must not lock while piloting.
    DispatchQueue.main.async {
      UIApplication.shared.isIdleTimerDisabled = true
    }
  }

  @objc public func startGamepadStream(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(GamepadStreamArgs.self)
    DispatchQueue.main.async {
      self.gamepads.start(channel: args.channel)
    }
    invoke.resolve()
  }

  @objc public func vibrateGamepad(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(VibrateGamepadArgs.self)
    DispatchQueue.main.async {
      self.gamepads.vibrate(
        index: args.index, lowFreq: args.lowFreq, highFreq: args.highFreq,
        durationMs: args.durationMs)
    }
    invoke.resolve()
  }

  // iOS routes a directly connected subnet over its own interface, so the
  // ethernet tether needs no binding.
  @objc public func setRovAddress(_ invoke: Invoke) throws {
    invoke.resolve()
  }

  @objc public func pickDirectory(_ invoke: Invoke) throws {
    present(
      UIDocumentPickerViewController(forOpeningContentTypes: [.folder]),
      onPick: { urls in
        guard let url = urls.first else {
          invoke.resolve(PickDirectoryResponse(directory: nil))
          return
        }
        do {
          let directory = try self.storage.retainDirectory(url)
          invoke.resolve(
            PickDirectoryResponse(
              directory: PickedDirectory(directory: directory, name: url.lastPathComponent)))
        } catch {
          invoke.reject(error.localizedDescription)
        }
      },
      onCancel: { invoke.resolve(PickDirectoryResponse(directory: nil)) })
  }

  @objc public func describeDirectory(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(DirectoryArgs.self)
    let name = try storage.describeDirectory(args.directory)
    invoke.resolve(NameResponse(name: name))
  }

  @objc public func saveToDirectory(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(SaveToDirectoryArgs.self)
    // Recordings can be large, so copy off the main thread.
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let location = try self.storage.saveToDirectory(
          source: URL(fileURLWithPath: args.source), directory: args.directory,
          fileName: args.fileName)
        invoke.resolve(LocationResponse(location: location))
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func exportFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ExportFileArgs.self)
    let source = URL(fileURLWithPath: args.source)
    present(
      UIDocumentPickerViewController(forExporting: [source], asCopy: true),
      onPick: { _ in invoke.resolve(SavedResponse(saved: true)) },
      onCancel: { invoke.resolve(SavedResponse(saved: false)) })
  }

  @objc public func importFile(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ImportFileArgs.self)
    let types = args.mimeTypes.compactMap { mimeType in
      mimeType == "*/*" ? UTType.item : UTType(mimeType: mimeType)
    }
    present(
      UIDocumentPickerViewController(
        forOpeningContentTypes: types.isEmpty ? [.item] : types, asCopy: true),
      onPick: { urls in invoke.resolve(ImportFileResponse(path: urls.first?.path)) },
      onCancel: { invoke.resolve(ImportFileResponse(path: nil)) })
  }

  private func present(
    _ picker: UIDocumentPickerViewController, onPick: @escaping ([URL]) -> Void,
    onCancel: @escaping () -> Void
  ) {
    DispatchQueue.main.async {
      let delegate = DocumentPickerDelegate(
        onPick: { urls in
          self.pickerDelegate = nil
          onPick(urls)
        },
        onCancel: {
          self.pickerDelegate = nil
          onCancel()
        })
      self.pickerDelegate = delegate
      picker.delegate = delegate
      picker.modalPresentationStyle = .fullScreen
      self.manager.viewController?.present(picker, animated: true)
    }
  }
}

final class DocumentPickerDelegate: NSObject, UIDocumentPickerDelegate {
  private let onPick: ([URL]) -> Void
  private let onCancel: () -> Void

  init(onPick: @escaping ([URL]) -> Void, onCancel: @escaping () -> Void) {
    self.onPick = onPick
    self.onCancel = onCancel
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL])
  {
    onPick(urls)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    onCancel()
  }
}

@_cdecl("init_plugin_manafish_mobile")
func initPlugin() -> Plugin {
  return MobilePlugin()
}
