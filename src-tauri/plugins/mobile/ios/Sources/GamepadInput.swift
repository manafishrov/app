import CoreHaptics
import GameController
import Tauri

struct GamepadButton: Encodable {
  let pressed: Bool
  let value: Float
}

struct VibrationActuator: Encodable {
  let type: String
}

/// Mirrors the desktop SDL `gamepad_event` payload.
struct GamepadSnapshot: Encodable {
  let id: String
  let index: Int
  let connected: Bool
  let mapping: String
  let axes: [Float]
  let buttons: [GamepadButton]
  let timestamp: Int64
  let vibrationActuator: VibrationActuator?

  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(id, forKey: .id)
    try container.encode(index, forKey: .index)
    try container.encode(connected, forKey: .connected)
    try container.encode(mapping, forKey: .mapping)
    try container.encode(axes, forKey: .axes)
    try container.encode(buttons, forKey: .buttons)
    try container.encode(timestamp, forKey: .timestamp)
    // The frontend expects an explicit null when rumble is unsupported.
    try container.encode(vibrationActuator, forKey: .vibrationActuator)
  }

  enum CodingKeys: String, CodingKey {
    case id, index, connected, mapping, axes, buttons, timestamp, vibrationActuator
  }
}

/// Streams game controllers from the GameController framework. Runs on the
/// main queue.
final class GamepadInput {
  private var channel: Channel?
  // Delivering to the WebView needs the main thread, so sending from it would
  // deadlock; a serial queue keeps snapshots in order.
  private let sender = DispatchQueue(label: "com.manafishrov.mobile.gamepad")
  private var indices: [ObjectIdentifier: Int] = [:]
  private var hapticEngines: [String: CHHapticEngine] = [:]
  private var observers: [NSObjectProtocol] = []

  func start(channel: Channel) {
    self.channel = channel
    if observers.isEmpty {
      let center = NotificationCenter.default
      observers = [
        center.addObserver(forName: .GCControllerDidConnect, object: nil, queue: .main) {
          [weak self] notification in
          guard let controller = notification.object as? GCController else { return }
          self?.connect(controller)
        },
        center.addObserver(forName: .GCControllerDidDisconnect, object: nil, queue: .main) {
          [weak self] notification in
          guard let controller = notification.object as? GCController else { return }
          self?.disconnect(controller)
        },
      ]
    }
    GCController.controllers().forEach(connect)
  }

  func vibrate(index: Int, lowFreq: Float, highFreq: Float, durationMs: Int) {
    guard
      durationMs > 0,
      let controller = GCController.controllers().first(where: {
        indices[ObjectIdentifier($0)] == index
      }),
      let haptics = controller.haptics
    else { return }
    let localities = haptics.supportedLocalities
    let motors: [(GCHapticsLocality, Float)] =
      localities.contains(.leftHandle) && localities.contains(.rightHandle)
      ? [(.leftHandle, lowFreq), (.rightHandle, highFreq)]
      : [(.default, max(lowFreq, highFreq))]
    for (locality, intensity) in motors where intensity > 0 {
      guard let engine = engine(for: controller, index: index, locality: locality) else {
        continue
      }
      let event = CHHapticEvent(
        eventType: .hapticContinuous,
        parameters: [
          CHHapticEventParameter(parameterID: .hapticIntensity, value: min(intensity, 1))
        ],
        relativeTime: 0,
        duration: TimeInterval(durationMs) / 1000)
      do {
        try engine.start()
        let player = try engine.makePlayer(with: CHHapticPattern(events: [event], parameters: []))
        try player.start(atTime: CHHapticTimeImmediate)
      } catch {
        Logger.error("Gamepad rumble failed: \(error)")
      }
    }
  }

  private func engine(for controller: GCController, index: Int, locality: GCHapticsLocality)
    -> CHHapticEngine?
  {
    let key = "\(index)-\(locality.rawValue)"
    if let engine = hapticEngines[key] {
      return engine
    }
    let engine = controller.haptics?.createEngine(withLocality: locality)
    hapticEngines[key] = engine
    return engine
  }

  private func connect(_ controller: GCController) {
    guard let gamepad = controller.extendedGamepad else { return }
    let key = ObjectIdentifier(controller)
    if indices[key] == nil {
      let used = Set(indices.values)
      indices[key] = (0...).first { !used.contains($0) }
    }
    gamepad.valueChangedHandler = { [weak self, weak controller] _, _ in
      guard let controller else { return }
      self?.send(controller, connected: true)
    }
    send(controller, connected: true)
  }

  private func disconnect(_ controller: GCController) {
    let key = ObjectIdentifier(controller)
    send(controller, connected: false)
    if let index = indices.removeValue(forKey: key) {
      hapticEngines = hapticEngines.filter { !$0.key.hasPrefix("\(index)-") }
    }
  }

  private func send(_ controller: GCController, connected: Bool) {
    guard
      let channel,
      let index = indices[ObjectIdentifier(controller)],
      let gamepad = controller.extendedGamepad
    else { return }
    // W3C "standard" gamepad button order, matching the desktop SDL stream.
    let buttons: [GCControllerButtonInput?] = [
      gamepad.buttonA, gamepad.buttonB, gamepad.buttonX, gamepad.buttonY,
      gamepad.leftShoulder, gamepad.rightShoulder, gamepad.leftTrigger, gamepad.rightTrigger,
      gamepad.buttonOptions, gamepad.buttonMenu,
      gamepad.leftThumbstickButton, gamepad.rightThumbstickButton,
      gamepad.dpad.up, gamepad.dpad.down, gamepad.dpad.left, gamepad.dpad.right,
      gamepad.buttonHome,
    ]
    // GameController reports up as positive Y; the standard layout uses down.
    let snapshot = GamepadSnapshot(
      id: controller.vendorName ?? "Gamepad",
      index: index,
      connected: connected,
      mapping: "standard",
      axes: [
        gamepad.leftThumbstick.xAxis.value, -gamepad.leftThumbstick.yAxis.value,
        gamepad.rightThumbstick.xAxis.value, -gamepad.rightThumbstick.yAxis.value,
      ],
      buttons: buttons.map { button in
        GamepadButton(pressed: button?.isPressed ?? false, value: button?.value ?? 0)
      },
      timestamp: Int64(Date().timeIntervalSince1970 * 1000),
      vibrationActuator: controller.haptics == nil ? nil : VibrationActuator(type: "dual-rumble"))
    sender.async {
      do {
        try channel.send(snapshot)
      } catch {
        Logger.error("Failed to send gamepad snapshot: \(error)")
      }
    }
  }
}
