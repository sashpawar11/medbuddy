/**
 * electron-builder afterPack hook to strip unused native binaries,
 * non-target platform binaries, and heavy GPU runtime libraries (CUDA/TensorRT)
 * that MedBuddy does not use (MedBuddy runs PP-OCR on CPU).
 */

const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  const appOutDir = context.appOutDir;
  console.log('\n[pruneRelease] Optimizing packaged binaries in:', appOutDir);
  const unpackedDir = path.join(appOutDir, 'resources', 'app.asar.unpacked');

  if (!fs.existsSync(unpackedDir)) {
    console.log('[pruneRelease] No app.asar.unpacked directory found, skipping.');
    return;
  }

  let totalBytesSaved = 0;

  function safeRemove(filePath, description) {
    if (fs.existsSync(filePath)) {
      try {
        const stat = fs.statSync(filePath);
        const size = stat.isDirectory()
          ? getDirSize(filePath)
          : stat.size;
        fs.rmSync(filePath, { recursive: true, force: true });
        totalBytesSaved += size;
        const mb = (size / (1024 * 1024)).toFixed(1);
        console.log(`[pruneRelease] Pruned ${description} (${mb} MB): ${path.basename(filePath)}`);
      } catch (err) {
        console.warn(`[pruneRelease] Warning removing ${filePath}:`, err.message);
      }
    }
  }

  function getDirSize(dir) {
    let size = 0;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fp = path.join(dir, file);
        const stat = fs.statSync(fp);
        size += stat.isDirectory() ? getDirSize(fp) : stat.size;
      }
    } catch {
      // ignore
    }
    return size;
  }

  // 1. Strip non-target platform and unused GPU libraries from onnxruntime-node
  const onnxBinDir = path.join(unpackedDir, 'node_modules', 'onnxruntime-node', 'bin', 'napi-v6');
  if (fs.existsSync(onnxBinDir)) {
    const targetPlatform = context.electronPlatformName || process.platform;

    for (const p of ['darwin', 'win32', 'linux']) {
      if (p !== targetPlatform) {
        safeRemove(path.join(onnxBinDir, p), `cross-platform ONNX binaries for ${p}`);
      }
    }

    if (targetPlatform === 'linux') {
      // Remove ARM64 binaries on x64 builds
      safeRemove(path.join(onnxBinDir, 'linux', 'arm64'), 'Linux ARM64 ONNX binaries');

      // Remove CUDA and TensorRT shared libraries (PP-OCR uses CPU provider)
      safeRemove(
        path.join(onnxBinDir, 'linux', 'x64', 'libonnxruntime_providers_cuda.so'),
        'CUDA execution provider library'
      );
      safeRemove(
        path.join(onnxBinDir, 'linux', 'x64', 'libonnxruntime_providers_tensorrt.so'),
        'TensorRT execution provider library'
      );
    } else if (targetPlatform === 'win32') {
      // Remove ARM64 binaries on x64 builds
      safeRemove(path.join(onnxBinDir, 'win32', 'arm64'), 'Windows ARM64 ONNX binaries');
    }
  }

  // 2. Strip unused @napi-rs canvas platform binaries
  const napiDir = path.join(unpackedDir, 'node_modules', '@napi-rs');
  if (fs.existsSync(napiDir)) {
    const targetPlatform = context.electronPlatformName || process.platform;
    if (targetPlatform === 'linux') {
      safeRemove(path.join(napiDir, 'canvas-linux-x64-musl'), '@napi-rs musl canvas binary');
    } else if (targetPlatform === 'win32') {
      safeRemove(path.join(napiDir, 'canvas-linux-x64-musl'), '@napi-rs musl canvas binary');
      safeRemove(path.join(napiDir, 'canvas-linux-x64-gnu'), '@napi-rs linux canvas binary');
    }
  }

  console.log(`[pruneRelease] Optimization complete. Saved ${(totalBytesSaved / (1024 * 1024)).toFixed(1)} MB from final package.\n`);
};
