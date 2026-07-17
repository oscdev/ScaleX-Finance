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
        },
    });
};
