import AuthLogo from '../extensions/logo.svg';

export const appConfig = {
    auth: {
        logo: AuthLogo,
    },
    menu: {
        logo: AuthLogo,
    },
    head: {
        favicon: AuthLogo,
    },
    theme: {
        light: {
            colors: {
                // Boolean Toggle selected True uses primary600 text on neutral0.
                // Keep these high-contrast so Global Setting labels stay readable
                // even when custom CSS is partial.
                primary100: '#dbeafe',
                primary200: '#bfdbfe',
                primary500: '#2563eb',
                primary600: '#1d4ed8',
                primary700: '#1e3a8a',
            },
        },
    },
    locales: [] as string[],
    translations: {
        en: {
            'Auth.form.welcome.title': 'Sign in to your account',
            'Auth.form.welcome.subtitle': ' ',
            'Auth.form.email.label': 'Email address',
            'global.password': 'Password',
            'Auth.form.email.placeholder': 'you@example.com',
            'Auth.form.button.login': 'Sign in →',
            'Auth.link.forgot-password': 'Forgot your password?',
            'Auth.form.rememberMe.label': 'Remember me',
        },
    },
};
