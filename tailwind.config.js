/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Paleta IxmiPlace
        brand: {
          // Principal — verde oliva
          DEFAULT: '#52634A',
          50:  '#EFF2EC',
          100: '#DDE4D8',
          200: '#BBC8B1',
          300: '#98AC8B',
          400: '#758F64',
          500: '#52634A',
          600: '#42513B',
          700: '#333F2D',
          800: '#232C1F',
          900: '#141912',
        },
        secondary: {
          // Secundario — café madera
          DEFAULT: '#A67C52',
          50:  '#F5EDE3',
          100: '#EADAC3',
          200: '#D5B48A',
          300: '#C09668',
          400: '#B3854D',
          500: '#A67C52',
          600: '#856341',
          700: '#644A31',
          800: '#433220',
          900: '#221910',
        },
        accent: {
          // Acento — dorado/ámbar
          DEFAULT: '#D49A4A',
          50:  '#FBF3E5',
          100: '#F6E5C5',
          200: '#EECC8E',
          300: '#E5B36B',
          400: '#DDA557',
          500: '#D49A4A',
          600: '#B37D35',
          700: '#886029',
          800: '#5D421C',
          900: '#32240F',
        },
        cream: {
          // Fondo — beige cálido
          DEFAULT: '#F4F0E6',
          50:  '#FAF8F2',
          100: '#F4F0E6',
          200: '#E8E0CD',
          300: '#DACFB2',
          400: '#C9BA92',
          500: '#B8A575',
        },
        ink: {
          // Texto — casi negro con tinte cálido
          DEFAULT: '#292824',
          50:  '#F5F5F4',
          100: '#E5E4E2',
          200: '#CBC9C5',
          300: '#A19E97',
          400: '#78746A',
          500: '#54514A',
          600: '#3F3D38',
          700: '#292824',
          800: '#1C1B18',
          900: '#0F0F0D',
        },
      },
    },
  },
  plugins: [],
};