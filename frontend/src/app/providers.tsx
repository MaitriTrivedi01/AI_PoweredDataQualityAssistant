'use client'

import { CacheProvider } from '@chakra-ui/next-js'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { Toaster } from 'react-hot-toast'

const theme = extendTheme({
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  styles: {
    global: {
      'html, body': {
        backgroundColor: '#f8fafc',
        color: '#1e293b',
      },
    },
  },
  colors: {
    gray: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    blue: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
  fonts: {
    heading: 'Inter, system-ui, sans-serif',
    body: 'Inter, system-ui, sans-serif',
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'md',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      variants: {
        solid: {
          bg: 'blue.500',
          color: 'white',
          _hover: { 
            bg: 'blue.600',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
          _active: { 
            bg: 'blue.700',
            transform: 'translateY(0)',
          },
          _disabled: {
            bg: 'blue.300',
            _hover: {
              bg: 'blue.300',
              transform: 'none',
              boxShadow: 'none',
            },
          },
        },
        outline: {
          border: '2px solid',
          borderColor: 'blue.500',
          color: 'blue.500',
          _hover: {
            bg: 'blue.50',
          },
          _active: {
            bg: 'blue.100',
          },
        },
      },
      defaultProps: {
        variant: 'solid',
      },
    },
    Card: {
      baseStyle: {
        container: {
          backgroundColor: 'white',
          borderRadius: 'lg',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid',
          borderColor: 'gray.200',
          overflow: 'hidden',
          transition: 'all 0.2s',
          _hover: {
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          },
        },
      },
    },
    FormLabel: {
      baseStyle: {
        fontSize: 'sm',
        fontWeight: '600',
        color: 'gray.800',
        marginBottom: '2',
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            bg: 'white',
            _hover: {
              borderColor: 'gray.400',
            },
            _focus: {
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px #3b82f6',
            },
          },
        },
      },
      defaultProps: {
        variant: 'outline',
      },
    },
    Select: {
      variants: {
        outline: {
          field: {
            borderColor: 'gray.300',
            bg: 'white',
            _hover: {
              borderColor: 'gray.400',
            },
            _focus: {
              borderColor: 'blue.500',
              boxShadow: '0 0 0 1px #3b82f6',
            },
          },
        },
      },
      defaultProps: {
        variant: 'outline',
      },
    },
    Checkbox: {
      baseStyle: {
        control: {
          borderColor: 'gray.300',
          borderWidth: '2px',
          _checked: {
            bg: 'blue.500',
            borderColor: 'blue.500',
            _hover: {
              bg: 'blue.600',
              borderColor: 'blue.600',
            },
          },
          _hover: {
            borderColor: 'gray.400',
          },
        },
        label: {
          color: 'gray.800',
          fontWeight: '500',
        },
      },
    },
    Heading: {
      baseStyle: {
        color: 'gray.900',
        fontWeight: '700',
        letterSpacing: '-0.025em',
      },
    },
    Text: {
      baseStyle: {
        color: 'gray.800',
      },
      variants: {
        secondary: {
          color: 'gray.600',
        },
      },
    },
    Badge: {
      baseStyle: {
        px: 3,
        py: 1,
        borderRadius: 'full',
        textTransform: 'capitalize',
        fontWeight: '600',
        fontSize: 'xs',
      },
      variants: {
        subtle: {
          SUCCESS: {
            bg: 'green.100',
            color: 'green.700',
            border: '1px solid',
            borderColor: 'green.200',
          },
          ERROR: {
            bg: 'red.100',
            color: 'red.700',
            border: '1px solid',
            borderColor: 'red.200',
          },
        },
      },
    },
    Alert: {
      variants: {
        'left-accent': {
          container: {
            borderRadius: 'md',
          },
        },
      },
    },
  },
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CacheProvider>
      <ChakraProvider theme={theme}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: 'white',
              borderRadius: '0.5rem',
              padding: '1rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            },
          }}
        />
      </ChakraProvider>
    </CacheProvider>
  )
} 