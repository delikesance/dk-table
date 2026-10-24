# Dev image: Node LTS + Rust stable + Tauri v2 Linux build deps.
FROM node:22-bookworm

ENV DEBIAN_FRONTEND=noninteractive

# Tauri v2 Linux system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      curl \
      wget \
      file \
      xdg-utils \
      libssl-dev \
      libwebkit2gtk-4.1-dev \
      libayatana-appindicator3-dev \
      librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Non-root user (reuse the base image's 'node' user, uid 1000)
USER node
ENV HOME=/home/node \
    RUSTUP_HOME=/home/node/.rustup \
    CARGO_HOME=/home/node/.cargo \
    PATH=/home/node/.cargo/bin:$PATH

# Rust stable, minimal profile + clippy and rustfmt
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs \
    | sh -s -- -y --profile minimal --default-toolchain stable \
    && rustup component add clippy rustfmt

WORKDIR /workspace
EXPOSE 1420
CMD ["bash"]
