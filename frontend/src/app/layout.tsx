'use client';

import { ChakraProvider, Box, Flex } from '@chakra-ui/react';
import { Inter } from 'next/font/google';
import Sidebar from './components/Sidebar';
import theme from './theme';

// If loading a variable font, you don't need to specify the font weight
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ChakraProvider theme={theme}>
          <Flex height="100vh">
            <Sidebar display={{ base: 'none', md: 'block' }} />
            <Box 
              ml={{ base: 0, md: 60 }} 
              p="4" 
              width="full" 
              overflowY="auto"
            >
              {children}
            </Box>
          </Flex>
        </ChakraProvider>
      </body>
    </html>
  );
}
