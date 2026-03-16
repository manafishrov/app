{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-25.11";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = {
    nixpkgs,
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
      rustToolchain = fenix.packages.${system}.latest.withComponents [
        "cargo"
        "clippy"
        "rust-src"
        "rustc"
        "rust-analyzer"
      ];
      nightlyRustfmt = fenix.packages.${system}.complete.withComponents [
        "rustfmt"
      ];
    in {
      default = pkgs.mkShell {
        buildInputs = with pkgs; [
          rustToolchain
          nightlyRustfmt
          cmake
          pkg-config
          bun
          ffmpeg
        ];
        CMAKE_POLICY_VERSION_MINIMUM = "3.5";
      };
    });
  };
}
