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
                primary100: '#1d4ed8',
                primary200: '#c7d2fe',
                primary500: '#6366f1',
                primary600: '#2563eb',
                primary700: '#1d4ed8',
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
