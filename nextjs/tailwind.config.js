/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
        './app/**/*.{js,ts,jsx,tsx}',
        './src/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: [
                    '-apple-system', // macOS and iOS
                    'BlinkMacSystemFont', // macOS Safari and older versions of Chrome
                    '"Segoe UI"', // Windows
                    '"Roboto"', // Android
                    'Oxygen', // Linux
                    'Ubuntu', // Linux
                    'Cantarell', // Linux
                    '"Open Sans"', // fallback sans-serif
                    '"Helvetica Neue"', // macOS fallback
                    'Arial', // fallback
                    'sans-serif', // default fallback
                  ],
            },
            colors: {
                b1: '#000000',
                b2: '#0D0D0D',
                b3: '#262626',
                b4: '#404040',
                b5: '#595959',
                b6: '#737373',
                b7: '#8C8C8C',
                b8: '#A6A6A6',
                b9: '#BFBFBF',
                b10: '#D9D9D9',
                b11: '#E6E6E6',
                b12: '#F2F2F2',
                b13: '#F9F9F9',
                b14: '#FCFCFC',
                b15: '#FFFFFF',
                w1: '#FFFFFF',
                w2: '#F2F2F2',
                w3: '#D9D9D9',
                w4: '#BFBFBF',
                w5: '#A6A6A6',
                w6: '#8C8C8C',
                w7: '#737373',
                w8: '#595959',
                w9: '#404040',
                w10: '#262626',
                w11: '#212121',
                w12: '#191919',
                w13: '#0D0D0D',
                w14: '#000000',
                red: '#EC4141',
                reddark: '#BB3F3F',
                reddarkhover: '#A83636',
                green: '#40BD7E',
                greendark: '#43855B',
                greenlight: '#F6FEF2',
                blue: '#6637EC',
                blue2: '#857FC3',
                blue3: '#F5F6FF',
                blue5: '#ebe7f4',
                bluelight: '#F3F3FF',
                bluehover: '#1D4ED8',
                bluedark: '#5050f6',
                orange: '#FB923C',
                purple: '#8D3CE2',
                ligheter: '#F5F5FF',
                highlighter: '#EAE2FF',
            },
            boxShadow: {
                'custom-1': '0 0 4px 0 rgba(0, 0, 0, 0.05)',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
            },
            typography: (theme) => ({
                DEFAULT: {
                    css: {                        
                        '--tw-prose-bullets': '#0d0d0d',
                      },
                },
            }),
        },

        screens: {
            sm: '576px',
            md: '768px',
            lg: '1024px',
            xl: '1200px',
            '2xl': '1360px',
            '3xl': '1560px',

            'max-3xl': { max: '1559px' },
            'max-2xl': { max: '1359px' },
            'max-xl': { max: '1199px' },
            'max-lg': { max: '1023px' },
            'max-md': { max: '767px' },
            'max-sm': { max: '575px' },
        },
        container: {
            padding: {
                DEFAULT: '15px',
            },
            screens: {
                sm: '576px',
                md: '768px',
                lg: '1024px',
                xl: '1200px',
                '2xl': '1360px',
            },
        },
        fontSize: {
            'font-12': [
                '0.75rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-13': [
                '0.813rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-14': [
                '0.875rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-15': [
                '0.938rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-16': [
                '1rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-17': [
                '1.063rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-18': [
                '1.125rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-20': [
                '1.25rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-22': [
                '1.375rem',
                {
                    lineHeight: '1.5',
                },
            ],
            'font-24': [
                '1.5rem',
                {
                    lineHeight: '1.3',
                },
            ],
            'font-26': [
                '1.625rem',
                {
                    lineHeight: '1.3',
                },
            ],
            'font-28': [
                '1.75rem',
                {
                    lineHeight: '1.3',
                },
            ],
            'font-30': [
                '1.875rem',
                {
                    lineHeight: '1.3',
                },
            ],
        },
        borderRadius: {
            none: '0',
            sm: '0.125rem',
            DEFAULT: '4px',
            md: '0.375rem',
            lg: '0.5rem',
            full: '9999px',
            large: '12px',
            custom: '5px',
            10: '10px',
        },
    },
    plugins: [
        require('tailwindcss-animate'),
        require('@tailwindcss/typography'),
    ],
};
