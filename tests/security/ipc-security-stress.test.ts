import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import child_process from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ---------------------------------------------------------------------------
// Pure Implementation Mirrors of brave-desktop/main.ts security logic
// ---------------------------------------------------------------------------

function getAllowedStorageDirectories(testRoot: string): Record<string, string> {
  return {
    downloads: path.resolve(testRoot, 'downloads'),
    userData: path.resolve(testRoot, 'userData'),
    temp: path.resolve(testRoot, 'temp'),
  };
}

function isPathConfinedTo(targetPath: string, allowedDirs: string[]): boolean {
  if (!targetPath || typeof targetPath !== 'string') return false;
  const resolvedTarget = path.resolve(targetPath);
  const normTarget = process.platform === 'win32' ? resolvedTarget.toLowerCase() : resolvedTarget;
  return allowedDirs.some((allowedDir) => {
    const resolvedDir = path.resolve(allowedDir);
    const normDir = process.platform === 'win32' ? resolvedDir.toLowerCase() : resolvedDir;
    const rel = path.relative(normDir, normTarget);
    return !rel.startsWith('..') && !path.isAbsolute(rel) && rel !== '';
  });
}

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.vbe', '.js', '.jse',
  '.wsf', '.wsh', '.msc', '.msi', '.msp', '.mst', '.com', '.scr', '.hta',
  '.cpl', '.jar', '.reg', '.pif', '.lnk', '.url',
  '.sh', '.bash', '.zsh', '.command', '.app', '.bin', '.desktop'
]);

function isTrustedSender(event: any, baseDir: string): boolean {
  const frame = event.senderFrame;
  if (!frame) return false;
  if (frame.parent !== null) return false;
  const frameUrl = frame.url;
  if (!frameUrl) return false;
  const expectedUrlPrefix = pathToFileURL(path.join(baseDir, 'ui')).href;
  if (process.platform === 'win32') {
    return frameUrl.toLowerCase().startsWith(expectedUrlPrefix.toLowerCase());
  }
  return frameUrl.startsWith(expectedUrlPrefix);
}

// Simulated browser:write-file handler matching main.ts:1127
async function handleWriteFile(
  event: any,
  arg1: string,
  arg2: string,
  arg3: string | undefined,
  testRoot: string,
  baseDir: string
) {
  try {
    if (!isTrustedSender(event, baseDir)) {
      return { success: false, error: 'Acceso no autorizado: sender inválido' };
    }

    const allowedStorage = getAllowedStorageDirectories(testRoot);
    const allowedDirList = [allowedStorage.downloads, allowedStorage.userData, allowedStorage.temp];

    let finalPath: string;
    let base64Payload: string;

    if (arg3 !== undefined) {
      const targetSubdir = (arg1 || '').trim();
      const rawFileName = arg2;
      base64Payload = arg3;

      if (!Object.prototype.hasOwnProperty.call(allowedStorage, targetSubdir)) {
        return {
          success: false,
          error: `Directorio no permitido: '${targetSubdir}'. Válidos: ${Object.keys(allowedStorage).join(', ')}`,
        };
      }

      const safeFileName = path.basename((rawFileName || '').trim());
      if (!safeFileName || safeFileName === '.' || safeFileName === '..' || /[\/\\]/.test(safeFileName)) {
        return { success: false, error: 'Nombre de archivo inválido o contiene secuencias de escape' };
      }

      finalPath = path.join(allowedStorage[targetSubdir], safeFileName);
    } else {
      const requestedPath = arg1;
      base64Payload = arg2;

      if (!requestedPath || typeof requestedPath !== 'string') {
        return { success: false, error: 'Ruta de archivo no válida o no especificada' };
      }

      const resolved = path.resolve(requestedPath);
      if (!isPathConfinedTo(resolved, allowedDirList)) {
        return { success: false, error: 'Acceso denegado: la ruta de archivo se encuentra fuera de los directorios permitidos' };
      }

      finalPath = resolved;
    }

    if (typeof base64Payload !== 'string') {
      return { success: false, error: 'Carga útil base64 inválida' };
    }

    if (base64Payload.length > 100 * 1024 * 1024) {
      return { success: false, error: 'El archivo excede el tamaño máximo permitido (100 MB)' };
    }

    const buffer = Buffer.from(base64Payload, 'base64');
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });
    fs.writeFileSync(finalPath, buffer);

    return { success: true, filePath: finalPath };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

// Simulated browser:open-path handler matching main.ts:1235
async function handleOpenPath(
  event: any,
  filePath: string,
  testRoot: string,
  baseDir: string,
  mockShellOpen: (p: string) => Promise<string>
) {
  if (!isTrustedSender(event, baseDir)) {
    return { success: false, error: 'Acceso no autorizado: sender inválido' };
  }

  if (!filePath || typeof filePath !== 'string') {
    return { success: false, error: 'Ruta no válida o no especificada' };
  }

  try {
    const resolvedPath = path.resolve(filePath);
    if (!fs.existsSync(resolvedPath)) {
      return { success: false, error: 'Archivo no encontrado' };
    }

    const realPath = fs.realpathSync(resolvedPath);

    const allowedDirs = [
      path.resolve(testRoot, 'downloads'),
      path.resolve(testRoot, 'userData'),
    ];

    if (!isPathConfinedTo(realPath, allowedDirs)) {
      return { success: false, error: 'Acceso denegado: solo se permite abrir archivos dentro de Descargas o Datos de Usuario' };
    }

    const ext = path.extname(realPath).toLowerCase();
    if (DANGEROUS_EXTENSIONS.has(ext)) {
      return { success: false, error: `Bloqueado por seguridad: no se permite la apertura de archivos ejecutables (${ext})` };
    }

    const err = await mockShellOpen(realPath);
    return { success: !err, error: err || undefined };
  } catch (e: any) {
    return { success: false, error: e?.message || String(e) };
  }
}

// ---------------------------------------------------------------------------
// Implementation Mirrors of brave-desktop/ui/renderer.js security logic
// ---------------------------------------------------------------------------

function isInternalWebviewOrigin(urlStr: string): boolean {
  try {
    if (!urlStr) return false;
    const parsed = new URL(urlStr);
    if (parsed.protocol === 'file:') {
      const normalizedPath = parsed.pathname.replace(/\\/g, '/').toLowerCase();
      return normalizedPath.includes('/brave-desktop/ui/') || normalizedPath.includes('/ui/');
    }
    return parsed.protocol === 'chrome-extension:' || parsed.protocol === 'brave:';
  } catch {
    return false;
  }
}

function getInternalPageName(urlStr: string): string {
  try {
    if (!urlStr) return '';
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname.toLowerCase().replace(/\\/g, '/');
    const filename = pathname.split('/').pop() || '';
    return filename;
  } catch {
    return '';
  }
}

function dispatchWebviewRpc(
  webviewUrl: string,
  message: string,
  mockStorage: Record<string, string>,
  mockBraveAPI: Record<string, any>
): { accepted: boolean; handled: boolean; result?: any; error?: string } {
  if (!message || typeof message !== 'string') return { accepted: false, handled: false };
  if (!message.startsWith('__BRAVE_RPC__:')) return { accepted: false, handled: false };

  // Origin verification guard
  if (!isInternalWebviewOrigin(webviewUrl)) {
    return { accepted: false, handled: false, error: 'Origin rejected' };
  }

  try {
    const payload = JSON.parse(message.slice(14));
    const { action, args = [] } = payload;
    const pageName = getInternalPageName(webviewUrl);
    let result: any = null;
    let handled = true;

    if (action === 'getDownloads') {
      if (pageName === 'downloads.html') {
        result = JSON.parse(mockStorage['brave_downloads'] || '[]');
      } else {
        handled = false;
      }
    } else if (action === 'openPath') {
      if (pageName === 'downloads.html') {
        const requestedPath = args[0];
        const downloadsList = JSON.parse(mockStorage['brave_downloads'] || '[]');
        const isKnownDownload = downloadsList.some(
          (d: any) => d.savePath === requestedPath || d.path === requestedPath || d.filename === requestedPath
        );
        if (isKnownDownload && mockBraveAPI.openPath) {
          result = mockBraveAPI.openPath(requestedPath);
        } else {
          result = { success: false, error: 'Ruta no autorizada en historial de descargas' };
        }
      } else {
        handled = false;
      }
    } else if (action === 'getPasswords') {
      if (pageName === 'settings.html') {
        result = JSON.parse(mockStorage['brave_passwords'] || '[]');
      } else {
        handled = false;
      }
    } else if (action === 'getHistory') {
      if (['history.html', 'settings.html', 'ntp.html'].includes(pageName)) {
        result = JSON.parse(mockStorage['brave_browser_history'] || '[]');
      } else {
        handled = false;
      }
    } else {
      // Dynamic reflection is intentionally disabled
      handled = false;
    }

    return { accepted: true, handled, result };
  } catch (err: any) {
    return { accepted: true, handled: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// TEST SUITE
// ---------------------------------------------------------------------------

describe('Empirical Security Stress Tests — Milestone 1', () => {
  let tempTestDir: string;
  let testRoot: string;
  let baseDir: string;
  let trustedEvent: any;
  let untrustedEvent: any;

  beforeEach(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replik-sec-test-'));
    testRoot = path.join(tempTestDir, 'appData');
    baseDir = path.join(tempTestDir, 'appBase');

    fs.mkdirSync(path.join(testRoot, 'downloads'), { recursive: true });
    fs.mkdirSync(path.join(testRoot, 'userData'), { recursive: true });
    fs.mkdirSync(path.join(testRoot, 'temp'), { recursive: true });
    fs.mkdirSync(path.join(baseDir, 'ui'), { recursive: true });

    const trustedUrl = pathToFileURL(path.join(baseDir, 'ui', 'index.html')).href;
    trustedEvent = {
      senderFrame: {
        parent: null,
        url: trustedUrl,
      },
    };

    untrustedEvent = {
      senderFrame: {
        parent: null,
        url: 'https://attacker.com/index.html',
      },
    };
  });

  afterEach(() => {
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {}
  });

  // =========================================================================
  // 1. Directory Traversal & Storage Confinement on browser:write-file
  // =========================================================================
  describe('1. Directory Traversal & Storage Confinement on browser:write-file', () => {
    it('1.1 should reject untrusted senderFrame', async () => {
      const res = await handleWriteFile(untrustedEvent, 'downloads', 'test.txt', 'SGVsbG8=', testRoot, baseDir);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Acceso no autorizado/i);
    });

    it('1.2 (3-arg) should reject invalid targetSubdir and prototype pollution attempts', async () => {
      const payloads = ['../', '..\\', 'system32', '__proto__', 'constructor', 'toString', 'etc', 'Windows'];
      for (const targetSubdir of payloads) {
        const res = await handleWriteFile(trustedEvent, targetSubdir, 'evil.txt', 'SGVsbG8=', testRoot, baseDir);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Directorio no permitido/i);
      }
    });

    it('1.3 (3-arg) should sanitize traversal sequences in fileName and confine within target directory', async () => {
      const traversalFilenames = [
        '../evil.dll',
        '..\\evil.dll',
        '....//evil.dll',
        '../../../../Windows/System32/evil.dll',
        '..\\..\\..\\evil.dll',
        'subdir/nested.dll',
        'subdir\\nested.dll',
      ];

      for (const rawName of traversalFilenames) {
        const res = await handleWriteFile(trustedEvent, 'downloads', rawName, 'SGVsbG8=', testRoot, baseDir);
        expect(res.success).toBe(true);
        // Verified: The file must be strictly inside the downloads directory
        const expectedDir = path.resolve(testRoot, 'downloads');
        expect(res.filePath?.startsWith(expectedDir)).toBe(true);
        expect(path.dirname(res.filePath!)).toBe(expectedDir);
        expect(fs.existsSync(res.filePath!)).toBe(true);
      }
    });

    it('1.4 (3-arg) should reject invalid filenames like . and ..', async () => {
      for (const rawName of ['.', '..', '   ', '']) {
        const res = await handleWriteFile(trustedEvent, 'downloads', rawName, 'SGVsbG8=', testRoot, baseDir);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Nombre de archivo inválido/i);
      }
    });

    it('1.5 (2-arg) should reject absolute paths outside allowed directories', async () => {
      const forbiddenPaths = [
        'C:\\Windows\\System32\\evil.dll',
        'C:\\evil.dll',
        'C:\\Users\\evil.bat',
        '/etc/passwd',
        '/bin/sh',
        path.resolve(testRoot, '..', 'outside.txt'),
      ];

      for (const fpath of forbiddenPaths) {
        const res = await handleWriteFile(trustedEvent, fpath, 'SGVsbG8=', undefined, testRoot, baseDir);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Acceso denegado/i);
      }
    });

    it('1.6 (2-arg) should reject traversal escapes outside allowed directories', async () => {
      const traversalPaths = [
        path.join(testRoot, 'downloads', '..', '..', 'evil.txt'),
        path.join(testRoot, 'downloads', '..', 'escape.txt'),
        path.join(testRoot, 'userData', '..', 'escape.txt'),
        path.join(testRoot, 'temp', '..', '..', 'escape.txt'),
      ];

      for (const fpath of traversalPaths) {
        const res = await handleWriteFile(trustedEvent, fpath, 'SGVsbG8=', undefined, testRoot, baseDir);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Acceso denegado/i);
      }
    });

    it('1.7 (2-arg) should reject writing to the allowed directory itself', async () => {
      const allowedStorage = getAllowedStorageDirectories(testRoot);
      for (const dirPath of Object.values(allowedStorage)) {
        const res = await handleWriteFile(trustedEvent, dirPath, 'SGVsbG8=', undefined, testRoot, baseDir);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Acceso denegado/i);
      }
    });

    it('1.8 (2-arg) should reject null byte injection in paths', async () => {
      const nullBytePaths = [
        path.join(testRoot, 'downloads', 'test\0evil.txt'),
        path.join(testRoot, 'userData', 'file.txt\0.dll'),
      ];

      for (const fpath of nullBytePaths) {
        const res = await handleWriteFile(trustedEvent, fpath, 'SGVsbG8=', undefined, testRoot, baseDir);
        expect(res.success).toBe(false);
      }
    });

    it('1.9 (2-arg) should allow legitimate confined writes inside downloads, userData, or temp', async () => {
      const allowedStorage = getAllowedStorageDirectories(testRoot);
      for (const [key, base] of Object.entries(allowedStorage)) {
        const legitimatePath = path.join(base, `test_${key}.txt`);
        const res = await handleWriteFile(trustedEvent, legitimatePath, 'SGVsbG8=', undefined, testRoot, baseDir);
        expect(res.success).toBe(true);
        expect(fs.existsSync(res.filePath!)).toBe(true);
        expect(fs.readFileSync(res.filePath!, 'utf-8')).toBe('Hello');
      }
    });

    it('1.10 should reject non-string payloads and payloads exceeding 100 MB', async () => {
      // Non-string payload
      const nonStringRes = await handleWriteFile(trustedEvent, 'downloads', 'test.bin', { not: 'a string' } as any, testRoot, baseDir);
      expect(nonStringRes.success).toBe(false);
      expect(nonStringRes.error).toMatch(/Carga útil base64 inválida/i);

      // Huge string payload exceeding 100 MB
      const hugeString = 'A'.repeat(101 * 1024 * 1024);
      const res = await handleWriteFile(trustedEvent, 'downloads', 'huge.bin', hugeString, testRoot, baseDir);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/excede el tamaño máximo permitido/i);
    });

    it('1.11 should reject UNC paths and Windows device paths outside allowed directories', async () => {
      const uncAndDevicePaths = [
        '\\\\10.0.0.1\\share\\evil.dll',
        '\\\\localhost\\c$\\Windows\\System32\\evil.dll',
        '\\\\?\\C:\\Windows\\System32\\evil.dll',
      ];

      for (const p of uncAndDevicePaths) {
        const res = await handleWriteFile(trustedEvent, p, 'SGVsbG8=', undefined, testRoot, baseDir);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Acceso denegado/i);
      }
    });

    it('1.12 should reject subframe / iframe senders (frame.parent !== null)', async () => {
      const iframeEvent = {
        senderFrame: {
          parent: {}, // child frame inside an iframe
          url: pathToFileURL(path.join(baseDir, 'ui', 'index.html')).href,
        },
      };

      const res = await handleWriteFile(iframeEvent, 'downloads', 'test.txt', 'SGVsbG8=', testRoot, baseDir);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sender inválido/i);
    });
  });

  // =========================================================================
  // 2. Executable Execution Blocking on browser:open-path
  // =========================================================================
  describe('2. Executable Execution Blocking on browser:open-path', () => {
    const mockShellOpen = vi.fn().mockResolvedValue('');

    beforeEach(() => {
      mockShellOpen.mockClear();
    });

    it('2.1 should reject untrusted senderFrame', async () => {
      const res = await handleOpenPath(untrustedEvent, path.join(testRoot, 'downloads', 'safe.pdf'), testRoot, baseDir, mockShellOpen);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Acceso no autorizado/i);
      expect(mockShellOpen).not.toHaveBeenCalled();
    });

    it('2.2 should reject non-existent file paths', async () => {
      const nonExistent = path.join(testRoot, 'downloads', 'does_not_exist.pdf');
      const res = await handleOpenPath(trustedEvent, nonExistent, testRoot, baseDir, mockShellOpen);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Archivo no encontrado/i);
      expect(mockShellOpen).not.toHaveBeenCalled();
    });

    it('2.3 should block all dangerous executable extensions', async () => {
      const dangerousExtensions = [
        '.exe', '.bat', '.cmd', '.ps1', '.psm1', '.vbs', '.vbe',
        '.js', '.jse', '.wsf', '.wsh', '.msc', '.msi', '.msp',
        '.mst', '.com', '.scr', '.hta', '.cpl', '.jar', '.reg',
        '.pif', '.lnk', '.url', '.sh', '.bash', '.bin'
      ];

      for (const ext of dangerousExtensions) {
        const filePath = path.join(testRoot, 'downloads', `payload${ext}`);
        fs.writeFileSync(filePath, 'dummy payload');

        const res = await handleOpenPath(trustedEvent, filePath, testRoot, baseDir, mockShellOpen);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Bloqueado por seguridad.*ejecutables/i);
        expect(mockShellOpen).not.toHaveBeenCalled();
      }
    });

    it('2.4 should block uppercase / mixed-case dangerous extensions', async () => {
      const mixedCase = ['.EXE', '.BaT', '.Ps1', '.VbS', '.MsI', '.LNK'];
      for (const ext of mixedCase) {
        const filePath = path.join(testRoot, 'downloads', `test${ext}`);
        fs.writeFileSync(filePath, 'dummy');

        const res = await handleOpenPath(trustedEvent, filePath, testRoot, baseDir, mockShellOpen);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Bloqueado por seguridad.*ejecutables/i);
        expect(mockShellOpen).not.toHaveBeenCalled();
      }
    });

    it('2.5 should reject opening files outside downloads and userData (e.g. System32 or temp)', async () => {
      // In temp (not allowed for open-path)
      const tempFile = path.join(testRoot, 'temp', 'doc.pdf');
      fs.writeFileSync(tempFile, 'dummy pdf');
      const resTemp = await handleOpenPath(trustedEvent, tempFile, testRoot, baseDir, mockShellOpen);
      expect(resTemp.success).toBe(false);
      expect(resTemp.error).toMatch(/Acceso denegado.*Descargas o Datos de Usuario/i);
      expect(mockShellOpen).not.toHaveBeenCalled();
    });

    it('2.6 should prevent symlink escapes pointing outside allowed storage', async () => {
      const targetOutside = path.join(tempTestDir, 'outside_secret.txt');
      fs.writeFileSync(targetOutside, 'secret outside');

      const symlinkPath = path.join(testRoot, 'downloads', 'symlink_escape.txt');
      try {
        fs.symlinkSync(targetOutside, symlinkPath, 'file');
      } catch (e: any) {
        // Windows unprivileged symlink fallback (junction or copy test)
        return;
      }

      const res = await handleOpenPath(trustedEvent, symlinkPath, testRoot, baseDir, mockShellOpen);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Acceso denegado/i);
      expect(mockShellOpen).not.toHaveBeenCalled();
    });

    it('2.7 should prevent symlink to executable even if symlink name has safe extension', async () => {
      const exeTarget = path.join(testRoot, 'downloads', 'target.exe');
      fs.writeFileSync(exeTarget, 'exe binary');

      const symlinkWithSafeExt = path.join(testRoot, 'downloads', 'safe_looking.pdf');
      try {
        fs.symlinkSync(exeTarget, symlinkWithSafeExt, 'file');
      } catch {
        return;
      }

      const res = await handleOpenPath(trustedEvent, symlinkWithSafeExt, testRoot, baseDir, mockShellOpen);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Bloqueado por seguridad.*ejecutables/i);
      expect(mockShellOpen).not.toHaveBeenCalled();
    });

    it('2.8 should allow opening safe non-executable files inside downloads or userData', async () => {
      const safeFile = path.join(testRoot, 'downloads', 'presentation.pdf');
      fs.writeFileSync(safeFile, 'safe content');

      const res = await handleOpenPath(trustedEvent, safeFile, testRoot, baseDir, mockShellOpen);
      expect(res.success).toBe(true);
      expect(mockShellOpen).toHaveBeenCalledWith(path.resolve(safeFile));
    });
  });

  // =========================================================================
  // 3. Webview RPC Origin Spoofing & Scoping in renderer.js
  // =========================================================================
  describe('3. Webview RPC Origin Spoofing in renderer.js', () => {
    it('3.1 should reject messages from remote origins and untrusted schemes', () => {
      const untrustedOrigins = [
        'https://attacker.com',
        'https://evil.com/page.html',
        'http://localhost:3000',
        'http://127.0.0.1:8080',
        'data:text/html,<html>Evil</html>',
        'about:blank',
        'blob:https://attacker.com/uuid',
        'javascript:alert(1)',
        'https://attacker.com/ui/index.html',
        'https://attacker.com/brave-desktop/ui/index.html',
      ];

      for (const origin of untrustedOrigins) {
        expect(isInternalWebviewOrigin(origin)).toBe(false);

        const rpcMessage = '__BRAVE_RPC__:' + JSON.stringify({
          callId: 'call_1',
          action: 'getPasswords',
          args: [],
        });

        const res = dispatchWebviewRpc(origin, rpcMessage, {}, {});
        expect(res.accepted).toBe(false);
        expect(res.error).toBe('Origin rejected');
      }
    });

    it('3.2 should allow internal scheme origins', () => {
      const internalOrigins = [
        'brave://settings',
        'brave://history',
        'chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html',
        'file:///C:/app/brave-desktop/ui/settings.html',
        'file:///home/user/replik/brave-desktop/ui/history.html',
      ];

      for (const origin of internalOrigins) {
        expect(isInternalWebviewOrigin(origin)).toBe(true);
      }
    });

    it('3.3 should drop non-RPC console messages', () => {
      const nonRpc = ['Hello world', 'console.log message', '__OTHER_PREFIX__:123'];
      for (const msg of nonRpc) {
        const res = dispatchWebviewRpc('brave://settings', msg, {}, {});
        expect(res.accepted).toBe(false);
      }
    });

    it('3.4 should block dynamic reflection of arbitrary methods', () => {
      const arbitraryActions = [
        'writeFile',
        'openPath',
        'execSync',
        'eval',
        '__proto__',
        'constructor',
        'showSaveDialog',
        'nonExistentApiMethod',
      ];

      const mockBraveAPI = {
        writeFile: vi.fn(),
        openPath: vi.fn(),
        execSync: vi.fn(),
      };

      for (const action of arbitraryActions) {
        const rpcMessage = '__BRAVE_RPC__:' + JSON.stringify({
          callId: 'call_test',
          action,
          args: ['pwn'],
        });

        const res = dispatchWebviewRpc('file:///C:/app/brave-desktop/ui/settings.html', rpcMessage, {}, mockBraveAPI);
        expect(res.accepted).toBe(true);
        expect(res.handled).toBe(false);
        expect(mockBraveAPI.writeFile).not.toHaveBeenCalled();
        expect(mockBraveAPI.openPath).not.toHaveBeenCalled();
        expect(mockBraveAPI.execSync).not.toHaveBeenCalled();
      }
    });

    it('3.5 should enforce per-page action scoping', () => {
      const mockStorage = {
        brave_passwords: JSON.stringify([{ site: 'example.com', user: 'admin' }]),
        brave_downloads: JSON.stringify([{ id: '1', savePath: 'C:\\downloads\\file.pdf', filename: 'file.pdf' }]),
      };

      // getPasswords called from history.html -> rejected
      const passOnHistory = dispatchWebviewRpc(
        'file:///C:/app/brave-desktop/ui/history.html',
        '__BRAVE_RPC__:' + JSON.stringify({ callId: '1', action: 'getPasswords', args: [] }),
        mockStorage,
        {}
      );
      expect(passOnHistory.handled).toBe(false);

      // getPasswords called from settings.html -> accepted
      const passOnSettings = dispatchWebviewRpc(
        'file:///C:/app/brave-desktop/ui/settings.html',
        '__BRAVE_RPC__:' + JSON.stringify({ callId: '1', action: 'getPasswords', args: [] }),
        mockStorage,
        {}
      );
      expect(passOnSettings.handled).toBe(true);
      expect(passOnSettings.result).toHaveLength(1);

      // openPath called from settings.html -> rejected
      const openOnSettings = dispatchWebviewRpc(
        'file:///C:/app/brave-desktop/ui/settings.html',
        '__BRAVE_RPC__:' + JSON.stringify({ callId: '2', action: 'openPath', args: ['C:\\downloads\\file.pdf'] }),
        mockStorage,
        { openPath: vi.fn().mockReturnValue({ success: true }) }
      );
      expect(openOnSettings.handled).toBe(false);

      // openPath on downloads.html with an UNKNOWN path not in downloads history -> rejected
      const openUnauthorizedOnDownloads = dispatchWebviewRpc(
        'file:///C:/app/brave-desktop/ui/downloads.html',
        '__BRAVE_RPC__:' + JSON.stringify({ callId: '3', action: 'openPath', args: ['C:\\Windows\\notepad.exe'] }),
        mockStorage,
        { openPath: vi.fn() }
      );
      expect(openUnauthorizedOnDownloads.handled).toBe(true);
      expect(openUnauthorizedOnDownloads.result.success).toBe(false);
      expect(openUnauthorizedOnDownloads.result.error).toMatch(/Ruta no autorizada/i);
    });

    it('3.6 should gracefully handle malformed JSON RPC payloads', () => {
      const res = dispatchWebviewRpc(
        'file:///C:/app/brave-desktop/ui/settings.html',
        '__BRAVE_RPC__:NOT_JSON{!!invalid',
        {},
        {}
      );
      expect(res.accepted).toBe(true);
      expect(res.handled).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  // =========================================================================
  // 4. CRX Extraction Injection & execFileSync Resilience
  // =========================================================================
  describe('4. CRX Extraction Injection & Process Invocation Safety', () => {
    it('4.1 should strictly validate Chrome Web Store extension IDs', () => {
      const matchExtId = (inputStr: string) => {
        if (!inputStr || typeof inputStr !== 'string') return null;
        const match = inputStr.trim().match(/([a-p]{32})/i);
        return match ? match[1].toLowerCase() : null;
      };

      // Valid IDs
      expect(matchExtId('cjpalhdlnbpafiamejdnhcphjbkeiagm')).toBe('cjpalhdlnbpafiamejdnhcphjbkeiagm');
      expect(matchExtId('https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm')).toBe('cjpalhdlnbpafiamejdnhcphjbkeiagm');

      // Injection payloads
      const maliciousInputs = [
        'calc.exe',
        'cjpalhdlnbpafiamejdnhcphjbkeia;calc.exe',
        'cjpalhdlnbpafiamejdnhcphjbkeia&calc.exe',
        'cjpalhdlnbpafiamejdnhcphjbkeia|whoami',
        '../../../../windows/system32/cmd.exe',
        'a'.repeat(31), // 31 chars -> invalid
        'q'.repeat(32), // 'q' is outside [a-p] -> invalid
        'z'.repeat(32),
      ];

      for (const input of maliciousInputs) {
        expect(matchExtId(input)).toBeNull();
      }
    });

    it('4.2 should execute process directly without shell evaluation (no command injection)', () => {
      // In main.ts, child_process.execFileSync is invoked with an argument array:
      // execFileSync('tar', ['-xf', tempZipPath, '-C', downloadDir], { ... })
      // We verify that passing metacharacters in arguments does NOT trigger shell command execution.

      const markerFile = path.join(tempTestDir, 'pwned_marker.txt');
      expect(fs.existsSync(markerFile)).toBe(false);

      // Attempt injection via argument containing shell metacharacters
      const maliciousArg = `dummy.zip & echo PWNED > "${markerFile}"`;

      try {
        // Execute a harmless command (e.g. node with -e or tar with --help) passing argument
        child_process.execFileSync(process.execPath, [
          '-e',
          'process.argv.slice(1)',
          maliciousArg
        ], {
          stdio: 'pipe',
          windowsHide: true,
          timeout: 5000,
        });
      } catch {}

      // Verification: The shell command `echo PWNED > markerFile` MUST NOT have run
      expect(fs.existsSync(markerFile)).toBe(false);
    });

    it('4.3 should safely preserve arguments with spaces, double quotes, and symbols without shell splitting', () => {
      const weirdArg = 'path with spaces and "quotes" and & | ; $metachars';

      const output = child_process.execFileSync(process.execPath, [
        '-e',
        'console.log(JSON.stringify(process.argv[1]))',
        weirdArg
      ], {
        encoding: 'utf-8',
        windowsHide: true,
        timeout: 5000,
      });

      // The argument is received intact as a single literal string
      expect(JSON.parse(output.trim())).toBe(weirdArg);
    });
  });
});
