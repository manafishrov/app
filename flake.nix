{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
    nixpkgs-unstable.url = "github:NixOS/nixpkgs/nixos-unstable";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    nixpkgs,
    nixpkgs-unstable,
    fenix,
    ...
  }: let
    supportedSystems = [
      "x86_64-linux"
      "aarch64-linux"
      "aarch64-darwin"
    ];
    forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
  in {
    devShells = forAllSystems (system: let
      pkgs = nixpkgs.legacyPackages.${system};
      unstable = nixpkgs-unstable.legacyPackages.${system};
      inherit (pkgs.stdenv) isLinux;
      rustToolchain = fenix.packages.${system}.stable.withComponents [
        "cargo"
        "clippy"
        "rustfmt"
        "rust-src"
        "rustc"
        "rust-analyzer"
      ];
      # The Android SDK is unfree and needs its license accepted, so only the
      # android shell pulls it in.
      androidPkgs = import nixpkgs {
        inherit system;
        config = {
          allowUnfree = true;
          android_sdk.accept_license = true;
        };
      };
      androidSdk =
        (androidPkgs.androidenv.composeAndroidPackages {
          platformVersions = ["36"];
          buildToolsVersions = ["35.0.0"];
          includeNDK = true;
        }).androidsdk;
      androidHome = "${androidSdk}/libexec/android-sdk";
      # Experimental features pull in the WebRTC dependencies, but since
      # WebKitGTK 2.54 they no longer turn ENABLE_WEB_RTC on, so it is set
      # explicitly. The librice ICE agent needs a newer librice than nixpkgs
      # ships, so webrtcbin's libnice agent is used instead. Experimental
      # features also enable Vulkan, which needs volk that nixpkgs does not
      # provide here.
      webkitWithWebRTC = (pkgs.webkitgtk_4_1.override {enableExperimental = true;}).overrideAttrs (old: {
        cmakeFlags = old.cmakeFlags ++ ["-DENABLE_WEB_RTC=ON" "-DUSE_LIBRICE=OFF" "-DUSE_VULKAN=OFF"];
      });
      gstPlugins = with pkgs.gst_all_1; [
        gstreamer
        gst-plugins-base
        gst-plugins-good
        gst-plugins-bad
        gst-plugins-ugly
        gst-libav
        gst-plugins-rs
      ];
      # libnice provides webrtcbin's ICE agent; its plugin is in the `out` output.
      gstPluginPath =
        pkgs.lib.makeSearchPathOutput "lib" "lib/gstreamer-1.0" gstPlugins
        + ":${pkgs.libnice.out}/lib/gstreamer-1.0";
      linuxLibs = with pkgs; [
        glib
        gtk3
        cairo
        pango
        gdk-pixbuf
        atk
        webkitWithWebRTC
        libsoup_3
        dbus
        openssl
        librsvg
        SDL2
      ];
    in {
      default = pkgs.mkShell {
        nativeBuildInputs =
          [pkgs.pkg-config]
          ++ pkgs.lib.optionals isLinux [pkgs.wrapGAppsHook3];
        buildInputs =
          (with pkgs; [
            rustToolchain
            cmake
            pkg-config
            unstable.bun
            ffmpeg
            python3
          ])
          ++ pkgs.lib.optionals isLinux linuxLibs;
        CMAKE_POLICY_VERSION_MINIMUM = "3.5";
        LIBCLANG_PATH = "${pkgs.libclang.lib}/lib";
        BINDGEN_EXTRA_CLANG_ARGS = pkgs.lib.optionalString isLinux (
          builtins.concatStringsSep " " [
            "-isystem ${pkgs.glibc.dev}/include"
            "-isystem ${pkgs.libclang.lib}/lib/clang/${pkgs.lib.versions.major pkgs.libclang.version}/include"
          ]
        );
        env =
          pkgs.lib.optionalAttrs isLinux {
            LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath ([pkgs.ffmpeg] ++ linuxLibs);
            GST_PLUGIN_SYSTEM_PATH_1_0 = gstPluginPath;
          };
      };
      android = pkgs.mkShell {
        # The Tauri CLI installs the Android Rust targets through rustup.
        buildInputs = with pkgs; [
          rustup
          androidSdk
          jdk17
          unstable.bun
          python3
        ];
        RUSTUP_TOOLCHAIN = "stable";
        ANDROID_HOME = androidHome;
        NDK_HOME = "${androidHome}/ndk-bundle";
        JAVA_HOME = pkgs.jdk17.home;
        # Gradle otherwise downloads its own aapt2, which cannot run on NixOS.
        GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${androidHome}/build-tools/35.0.0/aapt2";
      };
    });
  };
}
