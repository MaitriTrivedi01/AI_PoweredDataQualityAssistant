'use client';

import { Box, Container, useColorModeValue } from '@chakra-ui/react';
import Navigation from './Navigation';
import { useTheme } from '../providers/ThemeProvider';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { themeMode, customColors } = useTheme();
  
  const bgColor = useColorModeValue(
    themeMode === 'custom' ? `${customColors.primary}05` : 'beige.50', 
    'gray.900'
  );
  
  return (
    <Box minH="100vh" bg={bgColor}>
      <Navigation />
      <Container as="main" maxW="7xl" py={6} px={{ base: 4, sm: 6, lg: 8 }}>
        {children}
      </Container>
    </Box>
  );
} 