/** @type {import('tailwindcss').Config} */
// As cores "forest" e "moss" (a identidade visual principal) usam variáveis CSS
// em vez de valores fixos, para que o admin possa trocar a cor-tema do sistema
// em Configurações → Aparência sem precisar recompilar o projeto.
// Veja src/index.css (valores padrão) e src/context/BrandingContext.jsx (aplicação
// dinâmica dos valores escolhidos pelo administrador).
function cssVar(name) {
  return `rgb(var(${name}) / <alpha-value>)`;
}

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: cssVar('--c-50'), 100: cssVar('--c-100'), 200: cssVar('--c-200'),
          300: cssVar('--c-300'), 400: cssVar('--c-400'), 500: cssVar('--c-500'),
          600: cssVar('--c-600'), 700: cssVar('--c-700'), 800: cssVar('--c-800'),
          900: cssVar('--c-900'), 950: cssVar('--c-950'),
        },
        moss: {
          50: cssVar('--c-50'), 100: cssVar('--c-100'), 200: cssVar('--c-200'),
        },
        clay: {
          500: '#c08a2e',
          600: '#a5721f',
        },
        berry: {
          500: '#b23a3a',
          600: '#963030',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(23,52,32,0.06), 0 1px 6px rgba(23,52,32,0.06)',
      },
    },
  },
  plugins: [],
};
