'use client';

import { 
  Box, 
  Container, 
  Flex, 
  Heading, 
  HStack, 
  Link, 
  useColorModeValue,
  Text
} from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import ThemeSwitcher from './ThemeSwitcher';
import { useTheme } from '../providers/ThemeProvider';

export default function Navigation() {
  const pathname = usePathname();
  const { themeMode, customColors } = useTheme();
  
  // When in custom mode, use a very light tint of the primary color for background
  const bgColor = useColorModeValue(
    themeMode === 'custom' ? `${customColors.primary}10` : 'white', 
    'gray.800'
  );
  
  const textColor = useColorModeValue('gray.800', 'white');
  
  const borderColor = useColorModeValue(
    themeMode === 'custom' ? `${customColors.primary}30` : 'beige.200', 
    'gray.700'
  );
  
  // For the app title
  const titleColor = useColorModeValue(
    themeMode === 'custom' ? customColors.primary : 'accent.terracotta',
    'blue.300'
  );
  
  // For active link highlighting
  const getActiveLinkColor = (path: string) => {
    if (pathname === path) {
      if (themeMode === 'custom') {
        return customColors.primary;
      } else if (themeMode === 'light') {
        return 'accent.blue';
      } else {
        return 'blue.300';
      }
    }
    return textColor;
  };
  
  // Hover colors for links
  const getHoverColor = (path: string) => {
    if (themeMode === 'custom') {
      return customColors.primary;
    }
    
    switch(path) {
      case '/tables': return useColorModeValue('accent.blue', 'blue.300');
      case '/rules': return useColorModeValue('accent.teal', 'teal.300');
      case '/quality': return useColorModeValue('accent.purple', 'purple.300');
      case '/history': return useColorModeValue('accent.coral', 'orange.300');
      default: return useColorModeValue('accent.blue', 'blue.300');
    }
  };

  return (
    <Box 
      as="nav" 
      bg={bgColor} 
      boxShadow="md" 
      position="sticky" 
      top="0" 
      zIndex="sticky"
      borderBottom="1px"
      borderColor={borderColor}
    >
      <Container maxW="container.xl" py={3}>
        <Flex justify="space-between" align="center">
          <HStack spacing={8}>
            <NextLink href="/" passHref>
              <Heading 
                as="h1" 
                size="md" 
                color={titleColor}
                cursor="pointer"
                _hover={{ opacity: 0.9 }}
                transition="all 0.2s"
              >
                AI Data Quality Assistant
              </Heading>
            </NextLink>
            <HStack spacing={6}>
              <NextLink href="/tables" passHref>
                <Text
                  as="span"
                  fontWeight={pathname === '/tables' ? 'bold' : 'normal'}
                  color={getActiveLinkColor('/tables')}
                  cursor="pointer"
                  _hover={{ color: getHoverColor('/tables') }}
                >
                  Tables
                </Text>
              </NextLink>
              <NextLink href="/rules" passHref>
                <Text
                  as="span"
                  fontWeight={pathname === '/rules' ? 'bold' : 'normal'}
                  color={getActiveLinkColor('/rules')}
                  cursor="pointer"
                  _hover={{ color: getHoverColor('/rules') }}
                >
                  Rules
                </Text>
              </NextLink>
              <NextLink href="/quality" passHref>
                <Text
                  as="span"
                  fontWeight={pathname === '/quality' ? 'bold' : 'normal'}
                  color={getActiveLinkColor('/quality')}
                  cursor="pointer"
                  _hover={{ color: getHoverColor('/quality') }}
                >
                  Quality Checks
                </Text>
              </NextLink>
              <NextLink href="/history" passHref>
                <Text
                  as="span"
                  fontWeight={pathname === '/history' ? 'bold' : 'normal'}
                  color={getActiveLinkColor('/history')}
                  cursor="pointer"
                  _hover={{ color: getHoverColor('/history') }}
                >
                  History
                </Text>
              </NextLink>
            </HStack>
          </HStack>
          <ThemeSwitcher />
        </Flex>
      </Container>
    </Box>
  );
} 