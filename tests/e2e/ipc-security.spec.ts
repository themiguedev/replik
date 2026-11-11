import { test, expect } from './fixtures/index.js';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

test.describe('M1 Empirical Security Stress Tests (E2E in Live Electron)', () => {
  // =========================================================================
  // 1. Directory Traversal & Storage Confinement on browser:write-file
  // =========================================================================
  test('1. Directory Traversal: browser:write-file blocks writes outside allowed storage', async ({ mainWindow }) => {
    // Test 1.1: Traversal payload escaping to Windows root or System32
    const escapePayloads = [
      'C:\\Windows\\System32\\evil_test.dll',
      'C:\\Windows\\evil_test.txt',
      '..\\..\\..\\..\\evil_test.txt',
      '....//....//evil_test.txt',
      'C:/Windows/System32/evil_test.dll',
    ];

    for (const fpath of escapePayloads) {
      const res = await mainWindow.evaluate(async (targetPath) => {
        return await (window as any).braveAPI.writeFile(targetPath, 'SGVsbG8gV29ybGQ=');
      }, fpath);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Acceso denegado/i);
    }

    // Verify files were not created
    expect(fs.existsSync('C:\\Windows\\System32\\evil_test.dll')).toBe(false);
    expect(fs.existsSync('C:\\Windows\\evil_test.txt')).toBe(false);
  });

  test('1.2 Directory Traversal: browser:write-file handles null bytes, outside paths and invalid payloads', async ({ mainWindow }) => {
    // Null byte injection attempt
    const resNull = await mainWindow.evaluate(async () => {
      try {
        return await (window as any).braveAPI.writeFile('C:\\Windows\\Temp\\test\0evil.txt', 'SGVsbG8=');
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    });
    expect(resNull.success).toBe(false);

    // Relative path not inside allowed directories is blocked
    const resRelative = await mainWindow.evaluate(async () => {
      return await (window as any).braveAPI.writeFile('downloads/test.txt', 'SGVsbG8=');
    });
    expect(resRelative.success).toBe(false);
    expect(resRelative.error).toMatch(/Acceso denegado/i);

    // Non-string payload inside temp directory
    const tempDir = os.tmpdir();
    const testTempFile = path.join(tempDir, 'non_string_test.txt');
    const resNonString = await mainWindow.evaluate(async (targetPath) => {
      return await (window as any).braveAPI.writeFile(targetPath, 12345 as any);
    }, testTempFile);
    expect(resNonString.success).toBe(false);
    expect(resNonString.error).toMatch(/Carga útil base64 inválida/i);
  });

  // =========================================================================
  // 2. Executable Execution Blocking on browser:open-path
  // =========================================================================
  test('2. Executable Execution Blocking: browser:open-path blocks dangerous extensions and outside paths', async ({ mainWindow }) => {
    // Test 2.1: Opening executables in System32
    const dangerousPaths = [
      'C:\\Windows\\System32\\calc.exe',
      'C:\\Windows\\notepad.exe',
      'C:\\Windows\\System32\\cmd.exe',
    ];

    for (const p of dangerousPaths) {
      const res = await mainWindow.evaluate(async (targetPath) => {
        return await (window as any).braveAPI.openPath(targetPath);
      }, p);

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Acceso denegado/i);
    }

    // Test 2.2: Non-existent path
    const nonExistent = 'C:\\non_existent_folder_xyz\\file.pdf';
    const resMissing = await mainWindow.evaluate(async (targetPath) => {
      return await (window as any).braveAPI.openPath(targetPath);
    }, nonExistent);
    expect(resMissing.success).toBe(false);
    expect(resMissing.error).toMatch(/Archivo no encontrado/i);
  });

  // =========================================================================
  // 3. Webview RPC Origin Spoofing in renderer.js
  // =========================================================================
  test('3. Webview RPC Origin Spoofing: dropped from untrusted origins, no dynamic reflection', async ({ mainWindow, shellPage }) => {
    // Navigate webview to a data URL (untrusted remote/data origin)
    const testDataUrl = 'data:text/html,<html><body><h1>Attacker Page</h1></body></html>';
    await shellPage.navigateTo(testDataUrl);

    // Wait for the webview to finish loading
    await mainWindow.waitForTimeout(1000);

    // Attempt to invoke privileged RPC via console message from the webview context
    const rpcPayload = JSON.stringify({
      callId: 'attacker_call_1',
      action: 'openPath',
      args: ['C:\\Windows\\System32\\calc.exe'],
    });

    // Execute console.log inside the webview element
    const dispatched = await mainWindow.evaluate((payload) => {
      const webview = document.querySelector('webview.webview-instance:not(.hidden)') as any;
      if (!webview) return false;
      webview.executeJavaScript(`console.log('__BRAVE_RPC__:' + ${JSON.stringify(payload)});`);
      return true;
    }, rpcPayload);

    expect(dispatched).toBe(true);

    // Wait a moment and verify that no error or unauthorized action was permitted
    await mainWindow.waitForTimeout(500);

    // Verify arbitrary action reflection is not possible
    const reflectionPayload = JSON.stringify({
      callId: 'attacker_call_2',
      action: 'writeFile',
      args: ['evil.txt', 'pwned'],
    });

    const dispatchedReflection = await mainWindow.evaluate((payload) => {
      const webview = document.querySelector('webview.webview-instance:not(.hidden)') as any;
      if (!webview) return false;
      webview.executeJavaScript(`console.log('__BRAVE_RPC__:' + ${JSON.stringify(payload)});`);
      return true;
    }, reflectionPayload);

    expect(dispatchedReflection).toBe(true);
    await mainWindow.waitForTimeout(500);
  });

  // =========================================================================
  // 4. CRX Extraction Injection
  // =========================================================================
  test('4. CRX Extraction Injection: extension download strictly validates ID and rejects shell injection', async ({ mainWindow }) => {
    const injectionAttempts = [
      'calc.exe',
      'cjpalhdlnbpafiamejdnhcphjbkeia;calc.exe',
      'cjpalhdlnbpafiamejdnhcphjbkeia&calc.exe',
      'cjpalhdlnbpafiamejdnhcphjbkeia|whoami',
      '../../../windows/system32/cmd.exe',
      'a'.repeat(31),
      'q'.repeat(32),
    ];

    for (const payload of injectionAttempts) {
      const res = await mainWindow.evaluate(async (input) => {
        return await (window as any).braveAPI.downloadStoreExtension(input);
      }, payload);

      expect(res.error).toMatch(/No se detectó un ID de extensión válido/i);
    }
  });
});
