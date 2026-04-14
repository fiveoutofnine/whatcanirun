#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOCAL_BIN="${HOME}/.local/bin"
LOCAL_SRC="${HOME}/.local/src"
LLAMA_DIR="${WCIR_LLAMA_CPP_DIR:-${LOCAL_SRC}/llama.cpp}"
LLAMA_BUILD_DIR="${WCIR_LLAMA_CPP_BUILD_DIR:-${LLAMA_DIR}/build}"
BUN_BIN=""

log() {
  printf '==> %s\n' "$*"
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

run_privileged() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
  elif need_cmd sudo; then
    sudo "$@"
  else
    die "Need root privileges to run: $*"
  fi
}

install_system_packages() {
  if need_cmd apt-get; then
    log "Installing system packages with apt-get"
    run_privileged apt-get update
    run_privileged apt-get install -y \
      build-essential \
      ca-certificates \
      cmake \
      curl \
      git \
      pkg-config \
      python3 \
      unzip \
      zip
    return
  fi

  if need_cmd dnf; then
    log "Installing system packages with dnf"
    run_privileged dnf install -y \
      ca-certificates \
      cmake \
      curl \
      gcc \
      gcc-c++ \
      git \
      make \
      pkgconf-pkg-config \
      python3 \
      unzip \
      zip
    return
  fi

  if need_cmd yum; then
    log "Installing system packages with yum"
    run_privileged yum install -y \
      ca-certificates \
      cmake \
      curl \
      gcc \
      gcc-c++ \
      git \
      make \
      pkgconfig \
      python3 \
      unzip \
      zip
    return
  fi

  if need_cmd pacman; then
    log "Installing system packages with pacman"
    run_privileged pacman -Sy --noconfirm \
      base-devel \
      ca-certificates \
      cmake \
      curl \
      git \
      pkgconf \
      python \
      unzip \
      zip
    return
  fi

  if need_cmd brew; then
    log "Installing system packages with brew"
    brew install cmake git pkg-config unzip || true
    return
  fi

  die "Unsupported package manager. Install cmake, git, curl, python3, unzip, zip, and compiler toolchain manually."
}

ensure_bun() {
  if need_cmd bun; then
    return
  fi

  log "Installing Bun"
  curl -fsSL https://bun.sh/install | bash
}

prepend_local_path() {
  mkdir -p "${LOCAL_BIN}" "${LOCAL_SRC}"
  export PATH="${HOME}/.bun/bin:${LOCAL_BIN}:${PATH}"
}

resolve_bun_bin() {
  BUN_BIN="$(command -v bun || true)"
  [ -n "${BUN_BIN}" ] || die "bun is still not on PATH after installation"
}

ensure_nvidia_smi() {
  if need_cmd nvidia-smi; then
    log "nvidia-smi detected"
    nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader || true
    return
  fi

  die "nvidia-smi is missing. This bootstrap script does not install NVIDIA drivers; use a GPU host image or provider runtime where the NVIDIA driver stack is already available."
}

install_repo_dependencies() {
  log "Installing repo dependencies"
  (cd "${REPO_ROOT}" && "${BUN_BIN}" install --frozen-lockfile)
}

build_cli() {
  log "Building CLI"
  (cd "${REPO_ROOT}/apps/cli" && "${BUN_BIN}" run build)
}

install_wcir_wrapper() {
  log "Installing local wcir wrapper"
  mkdir -p "${LOCAL_BIN}"

  cat > "${LOCAL_BIN}/wcir" <<EOF
#!/usr/bin/env bash
exec "${BUN_BIN}" "${REPO_ROOT}/apps/cli/dist/cli.js" "\$@"
EOF
  chmod +x "${LOCAL_BIN}/wcir"
  ln -sf "${LOCAL_BIN}/wcir" "${LOCAL_BIN}/whatcanirun"
}

build_llama_cpp() {
  local nproc
  nproc="$(getconf _NPROCESSORS_ONLN 2>/dev/null || echo 8)"

  if [ ! -d "${LLAMA_DIR}/.git" ]; then
    log "Cloning llama.cpp"
    git clone --depth=1 https://github.com/ggml-org/llama.cpp "${LLAMA_DIR}"
  else
    log "Updating llama.cpp"
    git -C "${LLAMA_DIR}" pull --ff-only
  fi

  log "Building llama.cpp with CUDA"
  cmake -S "${LLAMA_DIR}" -B "${LLAMA_BUILD_DIR}" -DGGML_CUDA=ON -DCMAKE_BUILD_TYPE=Release
  cmake --build "${LLAMA_BUILD_DIR}" --config Release --target llama-cli llama-bench -j"${nproc}"

  ln -sf "${LLAMA_BUILD_DIR}/bin/llama-cli" "${LOCAL_BIN}/llama-cli"
  ln -sf "${LLAMA_BUILD_DIR}/bin/llama-bench" "${LOCAL_BIN}/llama-bench"
}

main() {
  install_system_packages
  ensure_bun
  prepend_local_path
  resolve_bun_bin
  ensure_nvidia_smi
  install_repo_dependencies
  build_cli
  install_wcir_wrapper
  build_llama_cpp

  log "Bootstrap complete"
  log "Add this to PATH if needed: export PATH=\"${HOME}/.bun/bin:${LOCAL_BIN}:\$PATH\""
  log "Try: wcir show runtime llama.cpp"
}

main "$@"
