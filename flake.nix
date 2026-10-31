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
      # `nix develop .#mobile` for `tauri ios` and `tauri android`. On macOS
      # there is no C toolchain from nixpkgs: Xcode provides one, and the
      # nixpkgs wrapper would point Xcode at its own SDK. Linux needs it for
      # build scripts.
      mobile = let
        inherit (pkgs.stdenv) isDarwin;
        androidPkgs = import nixpkgs {
          inherit system;
          config = {
            allowUnfree = true;
            android_sdk.accept_license = true;
          };
        };
        android = androidPkgs.androidenv.composeAndroidPackages {
          # The app targets 37; the tauri-android library still compiles against 36.
          platformVersions = ["36" "37"];
          buildToolsVersions = ["36.0.0"];
          includeNDK = true;
          ndkVersions = ["28.2.13676358"];
        };
        androidSdk = "${android.androidsdk}/libexec/android-sdk";
        fenixPkgs = fenix.packages.${system};
        # Every target `tauri ios|android init` checks for; it calls rustup,
        # which this toolchain does not have, when one is missing.
        mobileTargets =
          [
            "aarch64-linux-android"
            "armv7-linux-androideabi"
            "i686-linux-android"
            "x86_64-linux-android"
          ]
          ++ pkgs.lib.optionals isDarwin [
            "aarch64-apple-ios"
            "aarch64-apple-ios-sim"
            "x86_64-apple-ios"
          ];
        mobileRustToolchain = fenixPkgs.combine (
          [
            (fenixPkgs.stable.withComponents ["cargo" "clippy" "rustfmt" "rust-src" "rustc"])
          ]
          ++ map (target: fenixPkgs.targets.${target}.stable.rust-std) mobileTargets
        );
      in
        (if isDarwin then pkgs.mkShellNoCC else pkgs.mkShell) {
          packages =
            [
              mobileRustToolchain
              unstable.bun
              pkgs.jdk17
              android.androidsdk
            ]
            ++ pkgs.lib.optionals isDarwin (with pkgs; [cocoapods libimobiledevice xcodegen]);
          ANDROID_HOME = androidSdk;
          ANDROID_SDK_ROOT = androidSdk;
          NDK_HOME = "${androidSdk}/ndk/28.2.13676358";
          JAVA_HOME = pkgs.jdk17.home;
          # Gradle's bundled aapt2 is dynamically linked against a glibc
          # nixpkgs does not provide; use the SDK's patched one instead.
          GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${androidSdk}/build-tools/36.0.0/aapt2";
        };
    });
  };
}
