import { extendTheme, type ThemeConfig } from '@chakra-ui/react';

// Define the color palette
const colors = {
  brand: {
    50: '#E6F6FF',
    100: '#BAEAFF',
    200: '#8EDEFF',
    300: '#61D1FF',
    400: '#34C5FF',
    500: '#07B9FF',
    600: '#0693CC',
    700: '#046E99',
    800: '#034866',
    900: '#012333',
  },
};

// Define the configuration object
const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

// Define custom component styles
const components = {
  Button: {
    baseStyle: {
      fontWeight: 'medium',
      borderRadius: 'md',
    },
    variants: {
      solid: {
        bg: 'brand.500',
        color: 'white',
        _hover: {
          bg: 'brand.600',
        },
      },
      outline: {
        borderColor: 'brand.500',
        color: 'brand.500',
        _hover: {
          bg: 'brand.50',
        },
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        borderRadius: 'lg',
        boxShadow: 'sm',
        overflow: 'hidden',
      },
    },
  },
  Heading: {
    baseStyle: {
      fontWeight: 'semibold',
    },
  },
  Link: {
    baseStyle: {
      color: 'brand.500',
      _hover: {
        textDecoration: 'none',
        color: 'brand.600',
      },
    },
  },
};

// Define custom fonts
const fonts = {
  heading: 'var(--font-inter), system-ui, sans-serif',
  body: 'var(--font-inter), system-ui, sans-serif',
};

// Create the theme object
const theme = extendTheme({
  colors,
  config,
  components,
  fonts,
});

export default theme; 