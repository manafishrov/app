{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
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
      webkitWithWebRTC = pkgs.webkitgtk_4_1.override {enableExperimental = true;};
      gstPlugins = with pkgs.gst_all_1; [
        gstreamer
        gst-plugins-base
        gst-plugins-good
        gst-plugins-bad
        gst-plugins-ugly
        gst-libav
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
    });
  };
}
