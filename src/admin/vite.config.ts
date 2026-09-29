import { mergeConfig, type UserConfig } from 'vite';

export default (config: UserConfig) => {
    // Important: always return the modified config
    return mergeConfig(config, {
        resolve: {
            alias: {
                '@': '/src',
            },
        },
        define: {
            ...(config.define || {}),
            'import.meta.env.SCALEX_FRONTEND_URL': JSON.stringify(process.env.FRONTEND_URL || ''),
        },
        server: {
            allowedHosts: ['scalex.local', 'localhost'],
            strictPort: true,
            hmr: {
                protocol: 'ws',
                host: 'localhost',
                port: 5173,
            },
            // watchIgnoreFiles in config/admin.ts only covers chokidar (server restart).
            // Vite root is project cwd — ignore non-Admin runtime/output trees so disk
            // writes (suite, logs, uploads, imports, type regen, frontend) do not full-reload Admin.
            watch: {
                ignored: [
                    '**/Automation-Testing/**',
                    '**/graphify-out/**',
                    '**/logs/**',
                    '**/public/**',
                    '**/types/**',
                    '**/Data-Import-Manager/**',
                    '**/frontend/**',
                    '**/docs/**',
                    '**/scratch/**',
                    '**/venv/**',
                    '**/.venv/**',
                    '**/CLAUDE.md',
                    '**/bureau-data-extraction/integrations/**',
                    '**/__pycache__/**',
                ],
            },
        },
    });
};
