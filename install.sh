#!/usr/bin/env bash
#
# MedBuddy Installer Script
# https://github.com/sashpawar11/medbuddy
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/sashpawar11/medbuddy/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/sashpawar11/medbuddy/main/install.sh | bash -s -- --uninstall
#   curl -fsSL https://raw.githubusercontent.com/sashpawar11/medbuddy/main/install.sh | bash -s -- --version
#
set -euo pipefail

SCRIPT_VERSION="1.0.2"
REPO="${MEDBUDDY_REPO:-sashpawar11/medbuddy}"
APP_NAME="MedBuddy"
APP_BIN="medbuddy"
DESKTOP_WM_CLASS="medbuddy"

# Global temporary directory cleanup
TMP_CLEANUP_DIRS=()
cleanup() {
  for d in "${TMP_CLEANUP_DIRS[@]:-}"; do
    if [ -n "$d" ] && [ -d "$d" ]; then
      rm -rf "$d" 2>/dev/null || true
    fi
  done
}
trap cleanup EXIT

# Color support
if [ -t 1 ]; then
  BOLD=$'\033[1m'
  GREEN=$'\033[32m'
  BLUE=$'\033[34m'
  CYAN=$'\033[36m'
  YELLOW=$'\033[33m'
  RED=$'\033[31m'
  DIM=$'\033[2m'
  RESET=$'\033[0m'
else
  BOLD=""
  GREEN=""
  BLUE=""
  CYAN=""
  YELLOW=""
  RED=""
  DIM=""
  RESET=""
fi

log_info() {
  printf "${BLUE}ℹ${RESET} %b\n" "$*"
}

log_success() {
  printf "${GREEN}✔${RESET} %b\n" "$*"
}

log_warn() {
  printf "${YELLOW}⚠${RESET} %b\n" "$*"
}

log_error() {
  printf "${RED}✖${RESET} %b\n" "$*" >&2
}

log_step() {
  printf "${BOLD}${CYAN}➜${RESET} %b\n" "$*"
}

# Print banner
print_banner() {
  printf "${BOLD}${CYAN}"
  cat << "EOF"
  __  __          _ ____            _     _       
 |  \/  | ___  __| | __ ) _   _  __| | __| |_   _ 
 | |\/| |/ _ \/ _` |  _ \| | | |/ _` |/ _` | | | |
 | |  | |  __/ (_| | |_) | |_| | (_| | (_| | |_| |
 |_|  |_|\___|\__,_|____/ \__,_|\__,_|\__,_|\__, |
                                            |___/ 
EOF
  printf "${RESET}"
  printf "${DIM}  Personal family medical vault with local AI analysis${RESET}\n\n"
}

# Usage / Help
show_help() {
  cat << EOF
MedBuddy Installer & Manager (v${SCRIPT_VERSION})

Usage:
  install.sh [options]
  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash -s -- [options]

Options:
  -h, --help               Show this help message and exit
  -v, --version            Display current version and latest available release
  -u, --uninstall          Completely uninstall MedBuddy from this system
  --target-version <ver>   Install a specific release version (e.g. v1.0.1)
  --platform <os>          Override OS detection ('linux', 'windows', or 'macos')
  --install-dir <path>     Custom directory to install the application
  --bin-dir <path>         Custom directory for executable link (e.g. ~/.local/bin)
  --skip-checksum          Skip SHA checksum verification
  --prerelease             Allow downloading pre-releases

Examples:
  # Install latest release on Linux, macOS, or Windows (via Git Bash / WSL)
  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash

  # Windows Native PowerShell installation
  irm https://raw.githubusercontent.com/${REPO}/main/install.ps1 | iex

  # Uninstall MedBuddy
  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash -s -- --uninstall

  # Check latest release version
  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash -s -- --version
EOF
}

# Dependencies check (curl or wget)
fetch_url() {
  local url="$1"
  local dest="${2:-}"

  if command -v curl >/dev/null 2>&1; then
    if [ -n "$dest" ]; then
      curl -fSL "$url" -o "$dest"
    else
      curl -fsSL "$url" 2>/dev/null
    fi
  elif command -v wget >/dev/null 2>&1; then
    if [ -n "$dest" ]; then
      wget -qO "$dest" "$url"
    else
      wget -qO- "$url" 2>/dev/null
    fi
  else
    log_error "Neither curl nor wget was found. Please install either curl or wget to continue."
    exit 1
  fi
}

# Detect platform
detect_os() {
  # Allow manual override via environment variable or CLI flag
  if [ -n "${MEDBUDDY_TARGET_OS:-}" ]; then
    echo "$MEDBUDDY_TARGET_OS"
    return 0
  fi

  local os
  os="$(uname -s 2>/dev/null | tr '[:upper:]' '[:lower:]' || echo "unknown")"

  # 1. Direct Windows environments (Git Bash, MSYS2, Cygwin)
  case "$os" in
    msys*|mingw*|cygwin*)
      echo "windows"
      return 0
      ;;
  esac

  if [ "${OS:-}" = "Windows_NT" ]; then
    echo "windows"
    return 0
  fi

  # 2. Check for WSL (Windows Subsystem for Linux)
  # When executed from Windows CMD or PowerShell via 'curl ... | bash',
  # Windows launches WSL bash. If Windows cmd.exe / powershell.exe is accessible,
  # the host machine is Windows and the user intends to install on Windows.
  local is_wsl=0
  if [ -f /proc/version ] && grep -qiE "(microsoft|wsl)" /proc/version 2>/dev/null; then
    is_wsl=1
  elif uname -r 2>/dev/null | grep -qiE "(microsoft|wsl)"; then
    is_wsl=1
  elif [ -n "${WSL_DISTRO_NAME:-}" ] || [ -n "${WSL_INTEROP:-}" ]; then
    is_wsl=1
  fi

  if [ $is_wsl -eq 1 ]; then
    if command -v cmd.exe >/dev/null 2>&1 || command -v powershell.exe >/dev/null 2>&1 || [ -x "/mnt/c/Windows/System32/cmd.exe" ]; then
      echo "windows"
      return 0
    fi
  fi

  # 3. macOS
  case "$os" in
    darwin*)
      echo "macos"
      return 0
      ;;
  esac

  # 4. Standard Linux
  case "$os" in
    linux*)
      echo "linux"
      return 0
      ;;
  esac

  echo "unsupported"
}

detect_arch() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64|amd64)
      echo "x64"
      ;;
    aarch64|arm64)
      echo "arm64"
      ;;
    armv7l|armhf)
      echo "armv7l"
      ;;
    *)
      echo "$arch"
      ;;
  esac
}

# Fetch release info from GitHub
get_release_info() {
  local target_ver="${1:-latest}"
  local api_url

  if [ "$target_ver" = "latest" ]; then
    api_url="https://api.github.com/repos/${REPO}/releases/latest"
  else
    api_url="https://api.github.com/repos/${REPO}/releases/tags/${target_ver}"
  fi

  local json_data=""
  json_data="$(fetch_url "$api_url" || true)"

  # If API succeeded and returned JSON containing tag_name
  if echo "$json_data" | grep -q '"tag_name":'; then
    echo "$json_data"
    return 0
  fi

  # Fallback for rate limits or empty response: resolve tag via redirect
  local tag=""
  if [ "$target_ver" = "latest" ]; then
    if command -v curl >/dev/null 2>&1; then
      local loc
      loc="$(curl -sIL "https://github.com/${REPO}/releases/latest" 2>/dev/null | grep -i '^location:' | tr -d '\r' | awk '{print $2}' | tail -n 1 || true)"
      if [[ "$loc" =~ /releases/tag/([^/?#]+) ]]; then
        tag="${BASH_REMATCH[1]}"
      fi
    fi
  else
    tag="$target_ver"
  fi

  if [ -n "$tag" ]; then
    # Construct minimal release JSON
    printf '{"tag_name": "%s", "fallback": true}' "$tag"
    return 0
  fi

  return 1
}

extract_json_val() {
  local key="$1"
  grep -o "\"$key\": *\"[^\"]*\"" | head -n 1 | sed -e "s/\"$key\": *\"//" -e 's/"$//'
}

# Version command
handle_version() {
  print_banner
  printf "${BOLD}Installer Version:${RESET} %s\n" "$SCRIPT_VERSION"

  local installed_ver="Not installed"
  local installed_appimage="${HOME}/.local/share/${APP_BIN}/${APP_BIN}.AppImage"
  if [ -x "$installed_appimage" ]; then
    installed_ver="Installed at $installed_appimage"
  elif command -v "$APP_BIN" >/dev/null 2>&1; then
    installed_ver="Installed ($(command -v "$APP_BIN"))"
  fi
  printf "${BOLD}Local Status:${RESET}      %s\n" "$installed_ver"

  log_step "Checking latest available release on GitHub (${REPO})..."
  local rel_info
  if rel_info="$(get_release_info "latest")"; then
    local latest_tag
    latest_tag="$(echo "$rel_info" | extract_json_val "tag_name")"
    if [ -n "$latest_tag" ]; then
      printf "${BOLD}Latest Release:${RESET}    ${GREEN}%s${RESET}\n" "$latest_tag"
      return 0
    fi
  fi
  log_warn "Could not retrieve latest release from GitHub API (rate-limited or no release published yet)."
}

# Uninstall routine
handle_uninstall() {
  print_banner
  log_step "Uninstalling ${APP_NAME}..."

  local os
  os="$(detect_os)"

  local removed_anything=0

  if [ "$os" = "linux" ]; then
    local install_dir="${HOME}/.local/share/${APP_BIN}"
    local desktop_file="${HOME}/.local/share/applications/${APP_BIN}.desktop"
    local bin_links=(
      "${HOME}/.local/bin/${APP_BIN}"
      "/usr/local/bin/${APP_BIN}"
    )
    local icon_files=(
      "${HOME}/.local/share/icons/hicolor/512x512/apps/${APP_BIN}.png"
      "${HOME}/.local/share/icons/hicolor/256x256/apps/${APP_BIN}.png"
      "${HOME}/.local/share/icons/hicolor/128x128/apps/${APP_BIN}.png"
      "${HOME}/.local/share/icons/hicolor/64x64/apps/${APP_BIN}.png"
      "${HOME}/.local/share/icons/hicolor/32x32/apps/${APP_BIN}.png"
    )

    # Remove application directory and AppImage
    if [ -d "$install_dir" ]; then
      rm -rf "$install_dir"
      log_success "Removed installation directory: $install_dir"
      removed_anything=1
    fi

    # Remove desktop entry
    if [ -f "$desktop_file" ]; then
      rm -f "$desktop_file"
      log_success "Removed desktop launcher: $desktop_file"
      removed_anything=1
    fi

    # Remove icons
    for icon in "${icon_files[@]}"; do
      if [ -f "$icon" ]; then
        rm -f "$icon"
        removed_anything=1
      fi
    done
    if [ $removed_anything -eq 1 ]; then
      log_success "Removed application icons"
    fi

    # Remove CLI commands
    for bl in "${bin_links[@]}"; do
      if [ -L "$bl" ] || [ -f "$bl" ]; then
        rm -f "$bl" 2>/dev/null || sudo rm -f "$bl" 2>/dev/null || true
        log_success "Removed CLI command: $bl"
        removed_anything=1
      fi
    done

    # Refresh desktop database
    if command -v update-desktop-database >/dev/null 2>&1; then
      update-desktop-database "${HOME}/.local/share/applications" 2>/dev/null || true
    fi
    if command -v gtk-update-icon-cache >/dev/null 2>&1; then
      gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" 2>/dev/null || true
    fi

  elif [ "$os" = "macos" ]; then
    local mac_dirs=(
      "/Applications/${APP_NAME}.app"
      "${HOME}/Applications/${APP_NAME}.app"
    )
    for md in "${mac_dirs[@]}"; do
      if [ -d "$md" ]; then
        rm -rf "$md"
        log_success "Removed: $md"
        removed_anything=1
      fi
    done

    local mac_bin_links=(
      "${HOME}/.local/bin/${APP_BIN}"
      "/usr/local/bin/${APP_BIN}"
    )
    for bl in "${mac_bin_links[@]}"; do
      if [ -L "$bl" ] || [ -f "$bl" ]; then
        rm -f "$bl" 2>/dev/null || true
        log_success "Removed CLI command: $bl"
        removed_anything=1
      fi
    done
  elif [ "$os" = "windows" ]; then
    log_info "Uninstalling ${APP_NAME} from Windows..."
    local ps_cmd=""
    if command -v powershell.exe >/dev/null 2>&1; then
      ps_cmd="powershell.exe"
    elif [ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]; then
      ps_cmd="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
    elif command -v cmd.exe >/dev/null 2>&1; then
      ps_cmd="cmd.exe /c powershell"
    fi

    if [ -n "$ps_cmd" ]; then
      $ps_cmd -NoProfile -ExecutionPolicy Bypass -Command "
        \$uninst = \"\$env:LOCALAPPDATA\\Programs\\${APP_NAME}\\Uninstall ${APP_NAME}.exe\"
        if (Test-Path \$uninst) {
          Start-Process -FilePath \$uninst -ArgumentList '/S' -Wait
        }
        \$installDir = \"\$env:LOCALAPPDATA\\Programs\\${APP_NAME}\"
        if (Test-Path \$installDir) { Remove-Item -Recurse -Force \$installDir -ErrorAction SilentlyContinue }
        \$startMenu = \"\$([Environment]::GetFolderPath('Programs'))\\${APP_NAME}.lnk\"
        if (Test-Path \$startMenu) { Remove-Item -Force \$startMenu -ErrorAction SilentlyContinue }
        \$desktop = \"\$([Environment]::GetFolderPath('Desktop'))\\${APP_NAME}.lnk\"
        if (Test-Path \$desktop) { Remove-Item -Force \$desktop -ErrorAction SilentlyContinue }
        \$cmd = \"\$env:LOCALAPPDATA\\Microsoft\\WindowsApps\\${APP_BIN}.cmd\"
        if (Test-Path \$cmd) { Remove-Item -Force \$cmd -ErrorAction SilentlyContinue }
      "
      removed_anything=1
      log_success "Removed Windows application directory, Start Menu shortcut, and Desktop shortcut."
    fi
  fi

  if [ $removed_anything -eq 1 ]; then
    printf "\n"
    log_success "${APP_NAME} was successfully uninstalled from your system."
    printf "${DIM}Note: Your personal medical vault & config (${HOME}/.config/${APP_BIN}) were preserved.${RESET}\n"
    printf "${DIM}To delete your local vault data permanently, you can manually run:${RESET}\n"
    printf "${DIM}  rm -rf \"${HOME}/.config/${APP_BIN}\"${RESET}\n\n"
  else
    log_info "No installation of ${APP_NAME} was found to remove."
  fi
}

# Verify checksum
verify_checksum() {
  local target_file="$1"
  local target_filename
  target_filename="$(basename "$target_file")"
  local release_tag="$2"
  local tmp_dir="$3"

  log_step "Verifying download integrity and checksum..."

  # Attempt 1: Check SHA256SUMS.txt
  local sha256_url="https://github.com/${REPO}/releases/download/${release_tag}/SHA256SUMS.txt"
  local sha256_file="${tmp_dir}/SHA256SUMS.txt"

  if fetch_url "$sha256_url" "$sha256_file" 2>/dev/null && [ -s "$sha256_file" ]; then
    if grep -q "$target_filename" "$sha256_file"; then
      local expected_hash
      expected_hash="$(grep "$target_filename" "$sha256_file" | awk '{print $1}' | head -n 1)"
      local actual_hash=""
      if command -v sha256sum >/dev/null 2>&1; then
        actual_hash="$(sha256sum "$target_file" | awk '{print $1}')"
      elif command -v shasum >/dev/null 2>&1; then
        actual_hash="$(shasum -a 256 "$target_file" | awk '{print $1}')"
      fi

      if [ -n "$actual_hash" ]; then
        if [ "$actual_hash" = "$expected_hash" ]; then
          log_success "SHA-256 Checksum verified: ${actual_hash:0:16}..."
          return 0
        else
          log_error "Checksum verification failed!"
          log_error "Expected: $expected_hash"
          log_error "Actual:   $actual_hash"
          return 1
        fi
      fi
    fi
  fi

  # Attempt 2: Check latest-linux.yml (SHA512)
  local yml_url="https://github.com/${REPO}/releases/download/${release_tag}/latest-linux.yml"
  local yml_file="${tmp_dir}/latest-linux.yml"

  if fetch_url "$yml_url" "$yml_file" 2>/dev/null && [ -s "$yml_file" ]; then
    local expected_sha512
    expected_sha512="$(grep -A 2 "$target_filename" "$yml_file" | grep 'sha512:' | awk '{print $2}' | head -n 1 || true)"
    if [ -n "$expected_sha512" ] && command -v sha512sum >/dev/null 2>&1; then
      local actual_sha512_b64
      actual_sha512_b64="$(sha512sum "$target_file" | awk '{print $1}' | xxd -r -p 2>/dev/null | base64 2>/dev/null || true)"
      if [ -n "$actual_sha512_b64" ] && [ "$actual_sha512_b64" = "$expected_sha512" ]; then
        log_success "SHA-512 Checksum verified against latest-linux.yml!"
        return 0
      fi
    fi
  fi

  log_warn "Checksum file not available in release assets. Proceeding with downloaded binary."
  return 0
}

# Linux Installation
install_linux() {
  local target_ver="$1"
  local install_dir="${2:-${HOME}/.local/share/${APP_BIN}}"
  local bin_dir="${3:-${HOME}/.local/bin}"
  local skip_checksum="$4"
  local local_file="${5:-}"

  local arch
  arch="$(detect_arch)"
  log_info "Detected Linux architecture: ${BOLD}${arch}${RESET}"

  if [ "$arch" != "x64" ] && [ "$arch" != "arm64" ]; then
    log_warn "Architecture '${arch}' may not have prebuilt binaries. Standard builds support x86_64 (x64) and arm64."
  fi

  local version="1.0.0"
  local tag_name="v1.0.0"
  local tmp_dir=""
  local downloaded_file=""

  if [ -n "$local_file" ] && [ -f "$local_file" ]; then
    log_info "Using local AppImage file: ${BOLD}${local_file}${RESET}"
    downloaded_file="$local_file"
  else
    log_step "Fetching latest release information from GitHub..."
    local rel_info
    rel_info="$(get_release_info "$target_ver")" || {
      log_error "Could not fetch release information for '${target_ver}' from ${REPO}."
      exit 1
    }

    tag_name="$(echo "$rel_info" | extract_json_val "tag_name")"
    if [ -z "$tag_name" ]; then
      log_error "Could not find release tag name in response."
      exit 1
    fi
    version="${tag_name#v}"
    log_info "Installing MedBuddy ${BOLD}v${version}${RESET} (${tag_name})..."

    # Determine asset filename
    local asset_name=""
    if [ "$arch" = "arm64" ]; then
      asset_name="${APP_NAME}-${version}-arm64.AppImage"
    else
      asset_name="${APP_NAME}-${version}.AppImage"
    fi

    # Check if asset exists in JSON or construct standard download URL
    local download_url=""
    if echo "$rel_info" | grep -q "\"browser_download_url\": *\"[^\"]*${asset_name}\""; then
      download_url="$(echo "$rel_info" | grep -o "\"browser_download_url\": *\"[^\"]*${asset_name}\"" | head -n 1 | sed 's/.*"browser_download_url": *"//' | sed 's/"$//')"
    else
      download_url="https://github.com/${REPO}/releases/download/${tag_name}/${asset_name}"
    fi

    tmp_dir="$(mktemp -d -t medbuddy-install-XXXXXX)"
    TMP_CLEANUP_DIRS+=("$tmp_dir")

    downloaded_file="${tmp_dir}/${asset_name}"
    log_step "Downloading ${asset_name}..."
    log_info "URL: ${DIM}${download_url}${RESET}"
    
    if ! fetch_url "$download_url" "$downloaded_file"; then
      # Fallback try generic AppImage name if versioned asset name failed
      local fallback_name="${APP_NAME}.AppImage"
      log_warn "Versioned asset failed, attempting fallback: ${fallback_name}"
      download_url="https://github.com/${REPO}/releases/download/${tag_name}/${fallback_name}"
      downloaded_file="${tmp_dir}/${fallback_name}"
      fetch_url "$download_url" "$downloaded_file" || {
        log_error "Failed to download AppImage asset from release ${tag_name}."
        log_error "Please check available assets at https://github.com/${REPO}/releases/tag/${tag_name}"
        exit 1
      }
    fi

    # Checksum verification
    if [ "$skip_checksum" = "false" ]; then
      verify_checksum "$downloaded_file" "$tag_name" "$tmp_dir"
    fi
  fi

  # Setup target install directory
  log_step "Installing AppImage..."
  mkdir -p "$install_dir"
  local target_appimage="${install_dir}/${APP_BIN}.AppImage"
  cp "$downloaded_file" "$target_appimage"
  chmod +x "$target_appimage"
  log_success "Installed AppImage to: ${target_appimage}"

  # Extract or install icon
  log_step "Configuring application icons..."
  local icon_dest_dir="${HOME}/.local/share/icons/hicolor/512x512/apps"
  mkdir -p "$icon_dest_dir"
  local installed_icon="${icon_dest_dir}/${APP_BIN}.png"
  local local_icon="${install_dir}/icon.png"

  # Download icon from repo raw url as high-res fallback or extract
  local icon_raw_url="https://raw.githubusercontent.com/${REPO}/main/build/icon.png"
  if fetch_url "$icon_raw_url" "$installed_icon" 2>/dev/null && [ -s "$installed_icon" ]; then
    cp "$installed_icon" "$local_icon"
    log_success "Installed 512x512 application icon"
  else
    # Generate simple fallback icon if needed
    log_info "Using AppImage embedded icon"
  fi

  # Create .desktop file
  log_step "Creating desktop launcher and menu integration..."
  local desktop_dir="${HOME}/.local/share/applications"
  mkdir -p "$desktop_dir"
  local desktop_file="${desktop_dir}/${APP_BIN}.desktop"

  cat > "$desktop_file" << EOF
[Desktop Entry]
Name=${APP_NAME}
Comment=Personal family medical vault with local AI analysis
Exec=${install_dir}/${APP_BIN} %U
Icon=${APP_BIN}
Terminal=false
Type=Application
Categories=Office;Medical;Utility;Database;
StartupWMClass=${DESKTOP_WM_CLASS}
MimeType=application/pdf;image/png;image/jpeg;
Keywords=medical;vault;health;ai;records;
EOF
  chmod 644 "$desktop_file"
  log_success "Created desktop entry: ${desktop_file}"

  # Update desktop / icon databases
  if command -v update-desktop-database >/dev/null 2>&1; then
    update-desktop-database "$desktop_dir" 2>/dev/null || true
  fi
  if command -v gtk-update-icon-cache >/dev/null 2>&1; then
    gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" 2>/dev/null || true
  fi

  # Create CLI command wrapper inside install_dir and link to bin_dir
  log_step "Creating CLI command..."
  mkdir -p "$bin_dir"
  local install_cli="${install_dir}/${APP_BIN}"
  local cli_script="${bin_dir}/${APP_BIN}"

  cat > "$install_cli" << EOF
#!/usr/bin/env bash
# MedBuddy CLI Launcher
set -e

APP_DIR="${install_dir}"
APPIMAGE="\${APP_DIR}/${APP_BIN}.AppImage"

if [ ! -f "\$APPIMAGE" ]; then
  echo "MedBuddy AppImage not found at \$APPIMAGE" >&2
  exit 1
fi

# Handle CLI flags
if [ "\${1:-}" = "--uninstall" ]; then
  exec bash "\${APP_DIR}/uninstall.sh"
fi

if [ "\${1:-}" = "--version" ] || [ "\${1:-}" = "-v" ]; then
  echo "${APP_NAME} v${version}"
  exit 0
fi

if [ "\${1:-}" = "--help" ] || [ "\${1:-}" = "-h" ]; then
  echo "${APP_NAME} v${version} - Personal family medical vault with local AI analysis"
  echo ""
  echo "Usage:"
  echo "  ${APP_BIN} [options] [files...]"
  echo ""
  echo "Options:"
  echo "  -v, --version      Display version"
  echo "  -h, --help         Display this help message"
  echo "  --uninstall        Uninstall ${APP_NAME} from this system"
  echo ""
  exit 0
fi

# Robust FUSE check:
# Modern distributions often lack libfuse2 or sandbox FUSE mounting.
# Probe if mounting works, otherwise fall back to --appimage-extract-and-run cleanly!
use_extract_and_run=0
if [ ! -r /dev/fuse ] 2>/dev/null; then
  use_extract_and_run=1
elif command -v timeout >/dev/null 2>&1; then
  rc=0
  timeout 0.3s "\$APPIMAGE" --appimage-mount >/dev/null 2>&1 || rc=\$?
  if [ "\$rc" -ne 124 ]; then
    use_extract_and_run=1
  fi
fi

if [ "\$use_extract_and_run" -eq 1 ]; then
  export APPIMAGE_SILENT=1
  exec "\$APPIMAGE" --appimage-extract-and-run "\$@"
else
  exec "\$APPIMAGE" "\$@"
fi
EOF
  chmod +x "$install_cli"
  ln -sf "$install_cli" "$cli_script"
  log_success "Created CLI command: ${cli_script}"

  # Create self-contained uninstaller script in install_dir
  local uninstaller_script="${install_dir}/uninstall.sh"
  cat > "$uninstaller_script" << EOF
#!/usr/bin/env bash
set -e
echo "Uninstalling MedBuddy..."
rm -rf "${install_dir}"
rm -f "${desktop_file}"
rm -f "${cli_script}"
rm -f "${installed_icon}"
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "${desktop_dir}" 2>/dev/null || true
fi
echo "MedBuddy uninstalled successfully."
echo "Your personal medical vault in ~/.config/medbuddy was preserved."
EOF
  chmod +x "$uninstaller_script"

  # Path advisory
  printf "\n"
  log_success "🎉 ${BOLD}${APP_NAME} v${version} installed successfully!${RESET}"
  printf "\n"
  printf "  ${BOLD}Desktop App:${RESET}  Available in your Application Menu (under Medical/Office)\n"
  printf "  ${BOLD}CLI Command:${RESET}  Run ${GREEN}${APP_BIN}${RESET} from terminal\n"
  printf "  ${BOLD}Uninstall:${RESET}    Run ${YELLOW}${APP_BIN} --uninstall${RESET}\n"

  if [[ ":$PATH:" != *":${bin_dir}:"* ]]; then
    printf "\n"
    log_warn "Note: ${bin_dir} is not in your current PATH."
    printf "  To run '${APP_BIN}' directly from any terminal, add this to your ~/.bashrc or ~/.zshrc:\n"
    printf "    ${BOLD}export PATH=\"\$HOME/.local/bin:\$PATH\"${RESET}\n"
  fi
  printf "\n"
}

# macOS Installation
install_macos() {
  local target_ver="$1"
  local skip_checksum="$2"

  local arch
  arch="$(detect_arch)"
  log_info "Detected macOS architecture: ${BOLD}${arch}${RESET}"

  log_step "Fetching latest macOS release from GitHub..."
  local rel_info
  rel_info="$(get_release_info "$target_ver")" || {
    log_error "Could not fetch release info for ${REPO}."
    exit 1
  }

  local tag_name
  tag_name="$(echo "$rel_info" | extract_json_val "tag_name")"
  local version="${tag_name#v}"
  log_info "Installing MedBuddy ${BOLD}v${version}${RESET} (${tag_name}) on macOS..."

  local dmg_name="${APP_NAME}-${version}.dmg"
  local download_url="https://github.com/${REPO}/releases/download/${tag_name}/${dmg_name}"

  local tmp_dir
  tmp_dir="$(mktemp -d -t medbuddy-mac-XXXXXX)"
  TMP_CLEANUP_DIRS+=("$tmp_dir")

  local dmg_file="${tmp_dir}/${dmg_name}"
  log_step "Downloading macOS disk image (${dmg_name})..."
  fetch_url "$download_url" "$dmg_file" || {
    # Fallback to zip if dmg isn't found
    local zip_name="${APP_NAME}-${version}-mac.zip"
    download_url="https://github.com/${REPO}/releases/download/${tag_name}/${zip_name}"
    dmg_file="${tmp_dir}/${zip_name}"
    fetch_url "$download_url" "$dmg_file" || {
      log_error "Failed to download macOS asset. Check https://github.com/${REPO}/releases/tag/${tag_name}"
      exit 1
    }
  }

  if [ "$skip_checksum" = "false" ]; then
    verify_checksum "$dmg_file" "$tag_name" "$tmp_dir"
  fi

  log_step "Mounting and installing MedBuddy.app to /Applications..."
  local mount_point="${tmp_dir}/mnt"
  mkdir -p "$mount_point"
  hdiutil attach "$dmg_file" -nobrowse -mountpoint "$mount_point" -quiet

  local app_src="${mount_point}/${APP_NAME}.app"
  local app_dest="/Applications/${APP_NAME}.app"

  if [ -d "$app_dest" ]; then
    log_info "Updating existing installation in /Applications..."
    rm -rf "$app_dest"
  fi

  cp -R "$app_src" "/Applications/"
  hdiutil detach "$mount_point" -quiet

  # Create CLI symlink
  mkdir -p "${HOME}/.local/bin"
  local cli_link="${HOME}/.local/bin/${APP_BIN}"
  ln -sf "/Applications/${APP_NAME}.app/Contents/MacOS/${APP_NAME}" "$cli_link"

  printf "\n"
  log_success "🎉 ${BOLD}${APP_NAME} v${version} installed successfully!${RESET}"
  printf "  ${BOLD}Location:${RESET}     /Applications/${APP_NAME}.app\n"
  printf "  ${BOLD}CLI Command:${RESET}  ${cli_link}\n\n"
}

# Windows installation routine (Git Bash, MSYS, Cygwin, or WSL host)
install_windows() {
  local target_ver="$1"
  local skip_checksum="${2:-false}"
  local local_file="${3:-}"

  local arch
  arch="$(detect_arch)"
  log_info "Detected Windows environment (${arch})"

  # Find PowerShell executable (native or via WSL path)
  local ps_cmd=""
  if command -v powershell.exe >/dev/null 2>&1; then
    ps_cmd="powershell.exe"
  elif [ -x "/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]; then
    ps_cmd="/mnt/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
  elif [ -x "/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe" ]; then
    ps_cmd="/c/Windows/System32/WindowsPowerShell/v1.0/powershell.exe"
  elif command -v cmd.exe >/dev/null 2>&1; then
    ps_cmd="cmd.exe /c powershell"
  fi

  run_ps() {
    local cmd="$1"
    if [ -n "$ps_cmd" ]; then
      $ps_cmd -NoProfile -ExecutionPolicy Bypass -Command "$cmd"
    else
      return 1
    fi
  }

  to_win_path() {
    local p="$1"
    if command -v wslpath >/dev/null 2>&1; then
      wslpath -w "$p" 2>/dev/null || echo "$p"
    elif command -v cygpath >/dev/null 2>&1; then
      cygpath -w "$p" 2>/dev/null || echo "$p"
    else
      echo "$p"
    fi
  }

  log_step "Fetching latest Windows release info from GitHub..."
  local rel_info
  rel_info="$(get_release_info "$target_ver")" || {
    log_error "Could not fetch release info for ${REPO}."
    exit 1
  }

  local tag_name
  tag_name="$(echo "$rel_info" | extract_json_val "tag_name")"
  if [ -z "$tag_name" ]; then
    log_error "Could not find release tag name in response."
    exit 1
  fi
  local version="${tag_name#v}"
  log_info "Installing MedBuddy ${BOLD}v${version}${RESET} (${tag_name}) on Windows..."

  local tmp_dir
  tmp_dir="$(mktemp -d -t medbuddy-win-XXXXXX)"
  TMP_CLEANUP_DIRS+=("$tmp_dir")

  local candidate_assets=(
    "${APP_NAME}-Setup-${version}.exe"
    "${APP_NAME} Setup ${version}.exe"
    "${APP_NAME}-${version}-win.zip"
    "${APP_NAME}-${version}.zip"
    "${APP_NAME}-Portable-${version}.exe"
    "${APP_NAME}-${version}.exe"
  )

  local downloaded_file=""
  local chosen_asset=""
  local download_url=""

  if [ -n "$local_file" ] && [ -f "$local_file" ]; then
    log_info "Using local file: ${BOLD}${local_file}${RESET}"
    downloaded_file="$local_file"
    chosen_asset="$(basename "$local_file")"
  else
    for candidate in "${candidate_assets[@]}"; do
      local encoded_cand="${candidate// /%20}"
      local target_dest="${tmp_dir}/${candidate}"

      # Check if asset URL is available in release JSON
      if echo "$rel_info" | grep -Fq "$encoded_cand"; then
        download_url="$(echo "$rel_info" | grep -o "\"browser_download_url\": *\"[^\"]*${encoded_cand}\"" | head -n 1 | sed 's/.*"browser_download_url": *"//' | sed 's/"$//')"
      elif echo "$rel_info" | grep -Fq "$candidate"; then
        download_url="$(echo "$rel_info" | grep -o "\"browser_download_url\": *\"[^\"]*${candidate}\"" | head -n 1 | sed 's/.*"browser_download_url": *"//' | sed 's/"$//')"
      else
        download_url="https://github.com/${REPO}/releases/download/${tag_name}/${encoded_cand}"
      fi

      log_step "Checking release asset: ${candidate}..."
      if fetch_url "$download_url" "$target_dest" 2>/dev/null && [ -s "$target_dest" ]; then
        downloaded_file="$target_dest"
        chosen_asset="$candidate"
        log_success "Downloaded: ${candidate}"
        break
      fi
    done

    if [ -z "$downloaded_file" ]; then
      log_error "Could not find a downloadable Windows release asset for ${tag_name}."
      log_info "Please check available assets at https://github.com/${REPO}/releases/tag/${tag_name}"
      exit 1
    fi

    if [ "$skip_checksum" = "false" ]; then
      verify_checksum "$downloaded_file" "$tag_name" "$tmp_dir"
    fi
  fi

  local win_file
  win_file="$(to_win_path "$downloaded_file")"

  log_step "Installing MedBuddy on Windows..."

  # Case A: NSIS setup installer (.exe with 'Setup' or standard installer)
  if [[ "$chosen_asset" =~ [sS]etup.*\.exe$ ]] || [[ "$chosen_asset" =~ \.exe$ && ! "$chosen_asset" =~ [pP]ortable ]]; then
    log_info "Running NSIS installer in silent mode (/S)..."
    if [ -n "$ps_cmd" ]; then
      run_ps "
        \$p = Start-Process -FilePath '$win_file' -ArgumentList '/S' -Wait -PassThru
        if (\$p.ExitCode -ne 0) {
          Start-Process -FilePath '$win_file' -Wait
        }
      " || true
    elif command -v cmd.exe >/dev/null 2>&1; then
      cmd.exe /c start /wait "" "$win_file" /S || cmd.exe /c start "" "$win_file"
    fi

  # Case B: ZIP package (extract to %LOCALAPPDATA%\Programs\MedBuddy)
  elif [[ "$chosen_asset" =~ \.zip$ ]]; then
    log_info "Unpacking ZIP archive into %LOCALAPPDATA%\\Programs\\${APP_NAME}..."
    if [ -n "$ps_cmd" ]; then
      run_ps "
        \$destDir = \"\$env:LOCALAPPDATA\\Programs\\${APP_NAME}\"
        if (!(Test-Path \$destDir)) { New-Item -ItemType Directory -Path \$destDir -Force | Out-Null }
        Expand-Archive -Path '$win_file' -DestinationPath \$destDir -Force
      "
    fi

  # Case C: Portable exe
  else
    log_info "Installing portable executable into %LOCALAPPDATA%\\Programs\\${APP_NAME}..."
    if [ -n "$ps_cmd" ]; then
      run_ps "
        \$destDir = \"\$env:LOCALAPPDATA\\Programs\\${APP_NAME}\"
        if (!(Test-Path \$destDir)) { New-Item -ItemType Directory -Path \$destDir -Force | Out-Null }
        Copy-Item -Path '$win_file' -Destination \"\$destDir\\${APP_NAME}.exe\" -Force
      "
    fi
  fi

  # Configure Windows Start Menu, Desktop shortcuts, and CLI command
  log_step "Configuring Windows Start Menu and Desktop shortcuts..."
  if [ -n "$ps_cmd" ]; then
    run_ps "
      \$installDir = \"\$env:LOCALAPPDATA\\Programs\\${APP_NAME}\"
      \$targetExe = \"\$installDir\\${APP_NAME}.exe\"

      if (!(Test-Path \$targetExe)) {
        \$found = Get-ChildItem -Path \$installDir -Filter '${APP_NAME}.exe' -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
        if (\$found) { \$targetExe = \$found.FullName; \$installDir = \$found.DirectoryName }
      }

      if (Test-Path \$targetExe) {
        \$wshell = New-Object -ComObject WScript.Shell

        # 1. Start Menu shortcut
        \$startMenuDir = [Environment]::GetFolderPath('Programs')
        \$startShortcut = \"\$startMenuDir\\${APP_NAME}.lnk\"
        if (!(Test-Path \$startShortcut)) {
          \$s = \$wshell.CreateShortcut(\$startShortcut)
          \$s.TargetPath = \$targetExe
          \$s.WorkingDirectory = \$installDir
          \$s.IconLocation = \"\$targetExe,0\"
          \$s.Description = 'MedBuddy - Personal family medical vault'
          \$s.Save()
        }

        # 2. Desktop shortcut
        \$desktopDir = [Environment]::GetFolderPath('Desktop')
        \$desktopShortcut = \"\$desktopDir\\${APP_NAME}.lnk\"
        if (!(Test-Path \$desktopShortcut)) {
          \$d = \$wshell.CreateShortcut(\$desktopShortcut)
          \$d.TargetPath = \$targetExe
          \$d.WorkingDirectory = \$installDir
          \$d.IconLocation = \"\$targetExe,0\"
          \$d.Description = 'MedBuddy - Personal family medical vault'
          \$d.Save()
        }

        # 3. CLI command in %LOCALAPPDATA%\Microsoft\WindowsApps
        \$cliDir = \"\$env:LOCALAPPDATA\\Microsoft\\WindowsApps\"
        if (Test-Path \$cliDir) {
          \$cmdFile = \"\$cliDir\\${APP_BIN}.cmd\"
          Set-Content -Path \$cmdFile -Value \"@start `\"`\" `\"\$targetExe`\" %*\" -Force
        }
      }
    "
  fi

  printf "\n"
  log_success "🎉 ${BOLD}${APP_NAME} v${version} installed successfully on Windows!${RESET}\n"
  printf "  ${BOLD}Start Menu:${RESET}   Search or click ${GREEN}${APP_NAME}${RESET} in your Windows Start Menu\n"
  printf "  ${BOLD}Desktop App:${RESET}  Shortcut created on your Desktop\n"
  printf "  ${BOLD}Location:${RESET}     %%LOCALAPPDATA%%\\Programs\\${APP_NAME}\\${APP_NAME}.exe\n"
  printf "  ${BOLD}CLI Command:${RESET}  Run ${GREEN}${APP_BIN}${RESET} from Command Prompt or PowerShell\n\n"
}

# Main routing
main() {
  local target_ver="latest"
  local install_dir=""
  local bin_dir=""
  local skip_checksum="false"
  local local_file=""
  local action="install"

  while [ $# -gt 0 ]; do
    case "$1" in
      -h|--help)
        show_help
        exit 0
        ;;
      -v|--version)
        action="version"
        shift
        ;;
      -u|--uninstall)
        action="uninstall"
        shift
        ;;
      --target-version)
        target_ver="$2"
        shift 2
        ;;
      --platform)
        export MEDBUDDY_TARGET_OS="$2"
        shift 2
        ;;
      --install-dir)
        install_dir="$2"
        shift 2
        ;;
      --bin-dir)
        bin_dir="$2"
        shift 2
        ;;
      --skip-checksum)
        skip_checksum="true"
        shift
        ;;
      --local-file)
        local_file="$2"
        shift 2
        ;;
      --prerelease)
        shift
        ;;
      *)
        log_warn "Unknown option: $1"
        shift
        ;;
    esac
  done

  if [ "$action" = "version" ]; then
    handle_version
    exit 0
  fi

  if [ "$action" = "uninstall" ]; then
    handle_uninstall
    exit 0
  fi

  print_banner

  local os
  os="$(detect_os)"

  case "$os" in
    linux)
      install_linux "$target_ver" "${install_dir:-${HOME}/.local/share/${APP_BIN}}" "${bin_dir:-${HOME}/.local/bin}" "$skip_checksum" "${local_file:-}"
      ;;
    macos)
      install_macos "$target_ver" "$skip_checksum"
      ;;
    windows)
      install_windows "$target_ver" "$skip_checksum" "${local_file:-}"
      ;;
    *)
      log_error "Unsupported operating system: $(uname -s)"
      log_info "Please visit https://github.com/${REPO}/releases for manual installation options."
      exit 1
      ;;
  esac
}

main "$@"
