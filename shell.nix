{ pkgs ? import <nixpkgs> {} }:
pkgs.mkShell {
  buildInputs = with pkgs; [ nodejs ];
  shellHook =
    ''
        echo npx expo start
    '';
}
