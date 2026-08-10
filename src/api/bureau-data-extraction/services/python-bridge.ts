import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  isCodeLevelLoggingEnabled,
  moduleLogDir,
} from '../../../utils/code-file-logger';

const PDF_EXTRACTOR_DIR = path.join(
  process.cwd(),
  'src/api/bureau-data-extraction/integrations/python/pdf_extractor'
);

function pythonExists(candidate: string): boolean {
  try {
    return fs.existsSync(candidate) && fs.statSync(candidate).isFile();
  } catch {
    return false;
  }
}



const REQUIREMENTS_FILE = path.join(PDF_EXTRACTOR_DIR, 'requirements.txt');

function getProjectVenvPython(): string {
  return path.join(process.cwd(), '.venv', 'bin', 'python3');
}

function getProjectVenvPip(): string {
  return path.join(process.cwd(), '.venv', 'bin', 'pip');
}

async function pythonDepsOk(pythonExe: string): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(pythonExe, ['-c', 'import yaml, fitz'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

function runCommand(
  command: string,
  args: string[],
  log: { info: (msg: string) => void; warn: (msg: string) => void }
): Promise<void> {
  return new Promise((resolve, reject) => {
    log.info(`[Bureau] Running: ${command} ${args.join(' ')}`);

    const proc = spawn(command, args, {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      reject(new Error(`${command} failed to start: ${err.message}`));
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        const detail = stderr.trim();
        reject(
          new Error(
            detail
              ? `${command} exited with code ${code}: ${detail}`
              : `${command} exited with code ${code}`
          )
        );
        return;
      }
      resolve();
    });
  });
}

export async function ensurePythonEnvironment(log: {
  info: (msg: string) => void;
  warn: (msg: string) => void;
}): Promise<void> {
  if (process.env.PYTHON_PATH && pythonExists(process.env.PYTHON_PATH)) {
    log.info(`[Bureau] Using PYTHON_PATH: ${process.env.PYTHON_PATH}`);
    if (!(await pythonDepsOk(process.env.PYTHON_PATH))) {
      log.warn(
        '[Bureau] PYTHON_PATH interpreter is missing yaml/fitz — install deps into that Python manually'
      );
    }
    return;
  }

  const venvPython = getProjectVenvPython();

  try {
    if (!pythonExists(venvPython)) {
      log.info('[Bureau] Creating project .venv (first-time setup)...');
      await runCommand('python3', ['-m', 'venv', '.venv'], log);
    }

    if (!(await pythonDepsOk(venvPython))) {
      log.info(
        '[Bureau] Installing Python dependencies (first run may take several minutes)...'
      );
      const pip = pythonExists(getProjectVenvPip()) ? getProjectVenvPip() : 'pip3';
      await runCommand(pip, ['install', '-r', REQUIREMENTS_FILE], log);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn(`[Bureau] Auto Python setup failed: ${message}`);
    log.warn(
      '[Bureau] Manual fallback: python3 -m venv .venv && .venv/bin/pip install -r src/api/bureau-data-extraction/integrations/python/pdf_extractor/requirements.txt'
    );
  }

  await verifyPythonRuntime(log);
}

export async function verifyPythonRuntime(log: {
  info: (msg: string) => void;
  warn: (msg: string) => void;
}): Promise<void> {
  const pythonExe = getPythonExe();
  log.info(`[Bureau] Python interpreter: ${pythonExe}`);

  const projectVenv = path.join(process.cwd(), '.venv', 'bin', 'python3');
  if (pythonExe === 'python3' && !process.env.PYTHON_PATH) {
    log.warn(
      `[Bureau] Project .venv not found at ${projectVenv}. One-time setup: python3 -m venv .venv && pip install -r src/api/bureau-data-extraction/integrations/python/pdf_extractor/requirements.txt`
    );
  }

  await new Promise<void>((resolve) => {
    const proc = spawn(pythonExe, ['-c', 'import yaml, fitz'], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('error', (err) => {
      log.warn(`[Bureau] Python not runnable (${pythonExe}): ${err.message}`);
      resolve();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        log.warn(
          `[Bureau] Python dependency check failed (${pythonExe}): ${stderr.trim() || 'import yaml, fitz failed'}`
        );
      }
      resolve();
    });
  });
}

export function getPythonExe(): string {
  const candidates: string[] = [];

  if (process.env.PYTHON_PATH) {
    candidates.push(process.env.PYTHON_PATH);
  }

  // Prefer project-local venv — inherited VIRTUAL_ENV may point at another repo's shell session
  candidates.push(path.join(process.cwd(), '.venv', 'bin', 'python3'));

  if (process.env.VIRTUAL_ENV) {
    candidates.push(path.join(process.env.VIRTUAL_ENV, 'bin', 'python3'));
  }

  for (const candidate of candidates) {
    if (pythonExists(candidate)) {
      return candidate;
    }
  }

  return 'python3';
}

export function getScriptPaths() {
  const scriptDir = PDF_EXTRACTOR_DIR;
  const scriptPath = path.join(scriptDir, 'tests', 'test_field_extraction.py');
  return { scriptDir, scriptPath };
}

export async function runPython(
  leadId: number,
  leadName: string,
  log: { info: (msg: string) => void; error: (msg: string) => void },
  strapi?: any
): Promise<Record<string, unknown>> {
  const pythonExe = getPythonExe();
  const { scriptDir, scriptPath } = getScriptPaths();

  const codeLogsOn = await isCodeLevelLoggingEnabled(strapi);
  const bureauLogDir = moduleLogDir('bureau-extraction');

  log.info(`[Python Bridge] ${pythonExe} ${scriptPath} ${leadId} "${leadName}"`);

  return new Promise((resolve, reject) => {
    const pythonProcess = spawn(
      pythonExe,
      [scriptPath, String(leadId), leadName],
      {
        cwd: scriptDir,
        env: {
          ...process.env,
          PYTHONPATH: scriptDir,
          SCALEX_LOG_DIR: bureauLogDir,
          SCALEX_CODE_LOGS: codeLogsOn ? '1' : '0',
          SCALEX_LOG_LEAD_ID: String(leadId),
          SCALEX_LOG_LEAD_NAME: leadName,
        },
      }
    );

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('error', reject);

    pythonProcess.on('close', (code) => {
      if (stderr) {
        log.error(`[Python Bridge] stderr: ${stderr}`);
      }
      if (code !== 0) {
        const detail = stderr.trim();
        return reject(
          new Error(
            detail
              ? `Python exited with code ${code}: ${detail}`
              : `Python exited with code ${code}`
          )
        );
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (err: unknown) {
        log.error(`[Python Bridge] stdout: ${stdout}`);
        const message = err instanceof Error ? err.message : String(err);
        reject(new Error(`Invalid JSON from Python: ${message}`));
      }
    });
  });
}
