// swift-tools-version:5.3

import PackageDescription

let package = Package(
  name: "tauri-plugin-manafish-mobile",
  platforms: [
    .iOS(.v14)
  ],
  products: [
    .library(
      name: "tauri-plugin-manafish-mobile",
      type: .static,
      targets: ["tauri-plugin-manafish-mobile"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-manafish-mobile",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
