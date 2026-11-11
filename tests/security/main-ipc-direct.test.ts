import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

// Setup Mock Electron Environment before importing main.ts
const registeredHandlers = new Map<string, Function>();
let testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'replik-main-direct-'));
let testDownloadsDir = path.join(testTempDir, 'downloads');
let testUserDataDir = path.join(testTempDir, 'userData');
let testTempSubDir = path.join(testTempDir, 'temp');

fs.mkdirSync(testDownloadsDir, { recursive: true });
fs.mkdirSync(testUserDataDir, { recursive: true });
fs.mkdirSync(testTempSubDir, { recursive: true });

vi.mock('electron', () => {
  return {
    app: {
      commandLine: {
        appendSwitch: vi.fn(),
      },
      on: vi.fn(),
      whenReady: () => Promise.resolve(),
      getPath: (name: string) => {
        if (name === 'downloads') return testDownloadsDir;
        if (name === 'userData') return testUserDataDir;
        if (name === 'temp') return testTempSubDir;
        return path.join(testTempDir, name);
      },
      quit: vi.fn(),
    },
    BrowserWindow: class {
      webContents = {
        send: vi.fn(),
        on: vi.fn(),
        setWindowOpenHandler: vi.fn(),
      };
      loadURL = vi.fn();
      loadFile = vi.fn();
      on = vi.fn();
      once = vi.fn();
      show = vi.fn();
      isDestroyed = vi.fn().mockReturnValue(false);
    },
    dialog: {
      showSaveDialog: vi.fn(),
      showOpenDialog: vi.fn(),
    },
    ipcMain: {
      handle: (channel: string, handler: Function) => {
        registeredHandlers.set(channel, handler);
      },
      on: (channel: string, handler: Function) => {
        registeredHandlers.set(channel, handler);
      },
    },
    session: {
      defaultSession: {
        webRequest: {
          onBeforeRequest: vi.fn(),
        },
        clearStorageData: vi.fn(),
        getUserAgent: vi.fn().mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36'),
        setUserAgent: vi.fn(),
        setWebRTCIPHandlingPolicy: vi.fn(),
        setPermissionRequestHandler: vi.fn(),
        on: vi.fn(),
        loadExtension: vi.fn(),
      },
      fromPartition: vi.fn().mockReturnValue({
        webRequest: {
          onBeforeRequest: vi.fn(),
        },
        clearStorageData: vi.fn(),
        getUserAgent: vi.fn().mockReturnValue('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36'),
        setUserAgent: vi.fn(),
        setWebRTCIPHandlingPolicy: vi.fn(),
        setPermissionRequestHandler: vi.fn(),
        on: vi.fn(),
        loadExtension: vi.fn(),
      }),
    },
    shell: {
      openPath: vi.fn().mockResolvedValue(''),
      showItemInFolder: vi.fn(),
    },
  };
});

describe('Direct Integration Tests on brave-desktop/main.ts Handlers', () => {
  let writeFileHandler: Function;
  let openPathHandler: Function;
  let downloadExtensionHandler: Function;
  let trustedEvent: any;
  let untrustedEvent: any;

  beforeAll(async () => {
    // Import main.ts to execute registrations
    await import('../../brave-desktop/main.ts');

    writeFileHandler = registeredHandlers.get('browser:write-file')!;
    openPathHandler = registeredHandlers.get('browser:open-path')!;
    downloadExtensionHandler = registeredHandlers.get('extensions:download-from-store')!;

    const baseDir = path.resolve(__dirname, '../../brave-desktop');
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

  afterAll(() => {
    try {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    } catch {}
  });

  it('should verify all required handlers are registered', () => {
    expect(writeFileHandler).toBeDefined();
    expect(openPathHandler).toBeDefined();
    expect(downloadExtensionHandler).toBeDefined();
  });

  // --- browser:write-file Direct Stress Tests ---
  describe('browser:write-file on actual main.ts handler', () => {
    it('rejects untrusted sender', async () => {
      const res = await writeFileHandler(untrustedEvent, 'downloads', 'test.txt', 'SGVsbG8=');
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sender inválido/i);
    });

    it('rejects traversal in 3-arg filename and confines to downloads', async () => {
      const evilFilenames = [
        '../../evil.dll',
        '..\\..\\evil.dll',
        '....//....//evil.dll',
        'C:\\Windows\\System32\\evil.dll',
      ];

      for (const name of evilFilenames) {
        const res = await writeFileHandler(trustedEvent, 'downloads', name, 'SGVsbG8=');
        expect(res.success).toBe(true);
        expect(res.filePath.startsWith(testDownloadsDir)).toBe(true);
        expect(path.dirname(res.filePath)).toBe(testDownloadsDir);
        expect(fs.existsSync(res.filePath)).toBe(true);
      }
    });

    it('rejects 3-arg filename escape characters like .. and .', async () => {
      for (const name of ['..', '.', '', '   ']) {
        const res = await writeFileHandler(trustedEvent, 'downloads', name, 'SGVsbG8=');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/secuencias de escape|Nombre de archivo inválido/i);
      }
    });

    it('rejects 2-arg absolute paths outside downloads/userData/temp', async () => {
      const evilPaths = [
        'C:\\Windows\\System32\\evil.dll',
        'C:\\evil.dll',
        path.resolve(testTempDir, '..', 'evil.dll'),
      ];

      for (const p of evilPaths) {
        const res = await writeFileHandler(trustedEvent, p, 'SGVsbG8=');
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/fuera de los directorios permitidos/i);
      }
    });

    it('rejects 2-arg null bytes in path', async () => {
      const res = await writeFileHandler(trustedEvent, path.join(testDownloadsDir, 'evil\0.txt'), 'SGVsbG8=');
      expect(res.success).toBe(false);
    });

    it('accepts legitimate write in downloads and verifies content', async () => {
      const target = path.join(testDownloadsDir, 'hello_direct.txt');
      const b64 = Buffer.from('Integration test payload').toString('base64');
      const res = await writeFileHandler(trustedEvent, target, b64);
      expect(res.success).toBe(true);
      expect(fs.readFileSync(target, 'utf-8')).toBe('Integration test payload');
    });
  });

  // --- browser:open-path Direct Stress Tests ---
  describe('browser:open-path on actual main.ts handler', () => {
    it('rejects untrusted sender', async () => {
      const target = path.join(testDownloadsDir, 'doc.pdf');
      fs.writeFileSync(target, 'data');
      const res = await openPathHandler(untrustedEvent, target);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/sender inválido/i);
    });

    it('rejects non-existent file', async () => {
      const res = await openPathHandler(trustedEvent, path.join(testDownloadsDir, 'ghost.pdf'));
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Archivo no encontrado/i);
    });

    it('blocks dangerous executable extensions (.exe, .bat, .cmd, .ps1, .vbs, .msi, .lnk)', async () => {
      const badExts = ['.exe', '.bat', '.cmd', '.ps1', '.vbs', '.msi', '.lnk', '.js', '.hta'];
      for (const ext of badExts) {
        const p = path.join(testDownloadsDir, `evil${ext}`);
        fs.writeFileSync(p, 'binary data');
        const res = await openPathHandler(trustedEvent, p);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Bloqueado por seguridad/i);
      }
    });

    it('blocks uppercase executable extensions (.EXE, .BAT, .PS1)', async () => {
      for (const ext of ['.EXE', '.BAT', '.PS1']) {
        const p = path.join(testDownloadsDir, `evil${ext}`);
        fs.writeFileSync(p, 'binary data');
        const res = await openPathHandler(trustedEvent, p);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Bloqueado por seguridad/i);
      }
    });

    it('blocks opening files in temp (only downloads and userData allowed)', async () => {
      const p = path.join(testTempSubDir, 'temp_file.pdf');
      fs.writeFileSync(p, 'pdf data');
      const res = await openPathHandler(trustedEvent, p);
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/solo se permite abrir archivos dentro de Descargas o Datos de Usuario/i);
    });

    it('allows opening safe files in downloads', async () => {
      const safeP = path.join(testDownloadsDir, 'report.pdf');
      fs.writeFileSync(safeP, 'pdf data');
      const res = await openPathHandler(trustedEvent, safeP);
      expect(res.success).toBe(true);
    });
  });

  // --- extensions:download-from-store Direct Stress Tests ---
  describe('extensions:download-from-store on actual main.ts handler', () => {
    it('rejects untrusted sender', async () => {
      const res = await downloadExtensionHandler(untrustedEvent, 'cjpalhdlnbpafiamejdnhcphjbkeiagm');
      expect(res.error).toMatch(/sender inválido/i);
    });

    it('rejects invalid or injection IDs', async () => {
      const invalidInputs = [
        '',
        'calc.exe',
        'cjpalhdlnbpafiamejdnhcphjbkeia;calc.exe',
        '../../../windows/system32',
        'a'.repeat(31),
        'q'.repeat(32),
      ];

      for (const inp of invalidInputs) {
        const res = await downloadExtensionHandler(trustedEvent, inp);
        expect(res.error).toMatch(/No se detectó un ID de extensión válido|Por favor ingresa/i);
      }
    });
  });
});
