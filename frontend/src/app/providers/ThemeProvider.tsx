'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { ChakraProvider, extendTheme, StyleFunctionProps } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

type ThemeMode = 'light' | 'dark' | 'custom';

interface CustomColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ThemeContextType {
  themeMode: ThemeMode;
  customColors: CustomColors;
  setThemeMode: (mode: ThemeMode) => void;
  setCustomColors: (colors: CustomColors) => void;
}

const defaultCustomColors: CustomColors = {
  primary: '#3182CE', // blue.500
  secondary: '#38B2AC', // teal.500
  accent: '#9F7AEA', // purple.500
};

const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  customColors: defaultCustomColors,
  setThemeMode: () => {},
  setCustomColors: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // State for theme mode: 'light', 'dark', or 'custom'
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  
  // State for custom colors
  const [customColors, setCustomColors] = useState<CustomColors>({
    primary: '#4A90E2',
    secondary: '#50C878',
    accent: '#9370DB',
  });

  // Check for saved theme in localStorage on initial load
  useEffect(() => {
    const savedTheme = localStorage.getItem('themeMode') as ThemeMode;
    if (savedTheme) {
      setThemeMode(savedTheme);
    }

    const savedColors = localStorage.getItem('customColors');
    if (savedColors) {
      try {
        setCustomColors(JSON.parse(savedColors));
      } catch (e) {
        console.error('Error parsing saved custom colors', e);
      }
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('themeMode', themeMode);
  }, [themeMode]);

  // Save custom colors to localStorage when they change
  useEffect(() => {
    localStorage.setItem('customColors', JSON.stringify(customColors));
  }, [customColors]);

  // Create theme based on current mode and custom colors
  const createTheme = (customColors: CustomColors, mode: string) => {
    const isCustomMode = mode === 'custom';
    
    return extendTheme({
      config: {
        initialColorMode: 'light',
        useSystemColorMode: false,
      },
      colors: {
        // When in custom mode, override the core colors with our custom ones
        ...(isCustomMode && {
          custom: {
            primary: customColors.primary,
            secondary: customColors.secondary,
            accent: customColors.accent
          },
          // Override standard color schemes with custom colors
          blue: {
            50: `${customColors.primary}10`,
            100: `${customColors.primary}20`,
            200: `${customColors.primary}30`,
            300: `${customColors.primary}50`,
            400: `${customColors.primary}70`,
            500: customColors.primary,
            600: `${customColors.primary}d0`,
            700: `${customColors.primary}e0`,
            800: `${customColors.primary}f0`,
            900: `${customColors.primary}f8`,
          },
          teal: {
            50: `${customColors.secondary}10`,
            100: `${customColors.secondary}20`,
            200: `${customColors.secondary}30`,
            300: `${customColors.secondary}50`,
            400: `${customColors.secondary}70`,
            500: customColors.secondary,
            600: `${customColors.secondary}d0`,
            700: `${customColors.secondary}e0`,
            800: `${customColors.secondary}f0`,
            900: `${customColors.secondary}f8`,
          },
          purple: {
            50: `${customColors.accent}10`,
            100: `${customColors.accent}20`,
            200: `${customColors.accent}30`,
            300: `${customColors.accent}50`,
            400: `${customColors.accent}70`,
            500: customColors.accent,
            600: `${customColors.accent}d0`,
            700: `${customColors.accent}e0`,
            800: `${customColors.accent}f0`,
            900: `${customColors.accent}f8`,
          }
        }),
        // Add beige palette for light theme
        beige: {
          50: '#f9f5f0',
          100: '#f2ede3',
          200: '#ebe2d3',
          300: '#e4d7c3',
          400: '#d9c7ad',
          500: '#c9b597',
          600: '#b9a281',
          700: '#a08e6e',
          800: '#87765a',
          900: '#6d5e47',
        },
        // Add complementary accent colors
        accent: {
          blue: '#5f8bbf',
          teal: '#6cab8d',
          purple: '#9086b3',
          coral: '#db9575',
          terracotta: '#c47960'
        }
      },
      styles: {
        global: (props: StyleFunctionProps) => ({
          body: {
            bg: isCustomMode 
              ? `${customColors.primary}05` // Very subtle tint of primary color
              : props.colorMode === 'dark' ? 'gray.800' : 'beige.50',
            color: props.colorMode === 'dark' ? 'white' : 'gray.800',
          },
        }),
      },
      components: {
        Button: {
          variants: {
            primary: (props: StyleFunctionProps) => ({
              bg: isCustomMode 
                ? customColors.primary 
                : props.colorMode === 'dark' ? 'blue.500' : 'accent.blue',
              color: 'white',
              _hover: {
                bg: isCustomMode 
                  ? props.colorMode === 'dark' 
                    ? `${customColors.primary}90` 
                    : `${customColors.primary}d0`
                : props.colorMode === 'dark' ? 'blue.600' : 'blue.600',
              },
            }),
            secondary: (props: StyleFunctionProps) => ({
              bg: isCustomMode 
                ? customColors.secondary 
                : props.colorMode === 'dark' ? 'teal.500' : 'accent.teal',
              color: 'white',
              _hover: {
                bg: isCustomMode 
                  ? props.colorMode === 'dark' 
                    ? `${customColors.secondary}90` 
                    : `${customColors.secondary}d0`
                : props.colorMode === 'dark' ? 'teal.600' : 'teal.600',
              },
            }),
            accent: (props: StyleFunctionProps) => ({
              bg: isCustomMode 
                ? customColors.accent 
                : props.colorMode === 'dark' ? 'purple.500' : 'accent.purple',
              color: 'white',
              _hover: {
                bg: isCustomMode 
                  ? props.colorMode === 'dark' 
                    ? `${customColors.accent}90` 
                    : `${customColors.accent}d0`
                : props.colorMode === 'dark' ? 'purple.600' : 'purple.600',
              },
            }),
            solid: (props: StyleFunctionProps) => ({
              bg: props.colorScheme 
                ? `${props.colorScheme}.500` 
                : (props.bg || 'gray.500'),
              color: 'white',
              _hover: {
                bg: props.colorScheme 
                  ? `${props.colorScheme}.600` 
                  : (props.bg ? 
                      props.colorMode === 'dark' 
                        ? `${props.bg}90` 
                        : `${props.bg}d0` 
                      : 'gray.600'),
                _disabled: {
                  bg: props.colorScheme ? `${props.colorScheme}.500` : (props.bg || 'gray.500'),
                },
              },
            }),
          },
        },
        Card: {
          baseStyle: (props: StyleFunctionProps) => ({
            container: {
              bg: props.colorMode === 'dark' ? 'gray.700' : 'white',
              boxShadow: 'md',
              borderRadius: 'md',
              overflow: 'hidden',
              borderWidth: '1px',
              borderColor: isCustomMode 
                ? `${customColors.primary}30`
                : props.colorMode === 'dark' ? 'gray.600' : 'beige.200',
            },
            header: {
              padding: '4',
              borderBottom: '1px',
              borderColor: isCustomMode 
                ? `${customColors.primary}30`
                : props.colorMode === 'dark' ? 'gray.600' : 'beige.200',
              bg: isCustomMode 
                ? `${customColors.primary}10`
                : props.colorMode === 'dark' ? 'gray.600' : 'beige.50',
            },
            body: {
              padding: '4',
            },
            footer: {
              padding: '4',
              borderTop: '1px',
              borderColor: isCustomMode 
                ? `${customColors.primary}30`
                : props.colorMode === 'dark' ? 'gray.600' : 'beige.200',
              bg: isCustomMode 
                ? `${customColors.primary}10`
                : props.colorMode === 'dark' ? 'gray.600' : 'beige.50',
            },
          }),
        },
        Input: {
          baseStyle: (props: StyleFunctionProps) => ({
            field: {
              bg: props.colorMode === 'dark' ? 'whiteAlpha.100' : 'white',
              borderColor: isCustomMode 
                ? `${customColors.primary}40`
                : props.colorMode === 'dark' ? 'gray.600' : 'beige.300',
              _hover: {
                borderColor: isCustomMode 
                  ? `${customColors.primary}60`
                  : props.colorMode === 'dark' ? 'gray.500' : 'beige.400',
              },
              _focus: {
                borderColor: isCustomMode ? customColors.primary : props.colorMode === 'dark' ? 'blue.500' : 'accent.blue',
                boxShadow: `0 0 0 1px ${isCustomMode ? customColors.primary : props.colorMode === 'dark' ? 'blue.500' : 'accent.blue'}`,
              },
            },
          }),
        },
        Badge: {
          baseStyle: {
            px: 2,
            py: 1,
            borderRadius: 'full',
            fontWeight: 'medium',
            textTransform: 'none',
            fontSize: 'xs',
          },
          variants: {
            solid: (props: StyleFunctionProps) => ({
              bg: isCustomMode ? customColors.primary : 'blue.500',
              color: 'white',
            }),
            outline: (props: StyleFunctionProps) => ({
              bg: 'transparent',
              color: isCustomMode ? customColors.primary : 'blue.500',
              borderWidth: '1px',
              borderColor: isCustomMode ? customColors.primary : 'blue.500',
            }),
            subtle: (props: StyleFunctionProps) => ({
              bg: isCustomMode ? `${customColors.primary}20` : 'blue.100',
              color: isCustomMode ? customColors.primary : 'blue.800',
            }),
          },
        },
        Tabs: {
          variants: {
            line: (props: StyleFunctionProps) => ({
              tab: {
                _selected: {
                  color: isCustomMode ? customColors.primary : props.colorMode === 'dark' ? 'blue.300' : 'blue.600',
                  borderColor: isCustomMode ? customColors.primary : props.colorMode === 'dark' ? 'blue.300' : 'blue.600',
                },
                _hover: {
                  color: isCustomMode ? `${customColors.primary}d0` : props.colorMode === 'dark' ? 'blue.200' : 'blue.500',
                }
              }
            }),
          }
        },
        Switch: {
          baseStyle: (props: StyleFunctionProps) => ({
            track: {
              _checked: {
                bg: isCustomMode ? customColors.primary : 'blue.500',
              },
            },
          }),
        },
        Checkbox: {
          baseStyle: (props: StyleFunctionProps) => ({
            control: {
              _checked: {
                bg: isCustomMode ? customColors.primary : 'blue.500',
                borderColor: isCustomMode ? customColors.primary : 'blue.500',
              },
            },
          }),
        },
      },
    });
  };

  // Recreate theme whenever mode or colors change
  const [theme, setTheme] = useState(createTheme(customColors, themeMode));

  // Update theme when mode or colors change
  useEffect(() => {
    setTheme(createTheme(customColors, themeMode));
  }, [themeMode, customColors]);

  return (
    <ThemeContext.Provider value={{ themeMode, setThemeMode, customColors, setCustomColors }}>
      <ChakraProvider theme={theme}>
        {children}
      </ChakraProvider>
    </ThemeContext.Provider>
  );
}; 