import React from 'react';
import {
  Box,
  Flex,
  VStack,
  Icon,
  Text,
  Divider,
  Link,
  useColorModeValue,
  BoxProps,
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FiHome, 
  FiDatabase, 
  FiTable, 
  FiCheckSquare, 
  FiFileText, 
  FiSettings, 
  FiClock,
  FiShield,
  FiBarChart
} from 'react-icons/fi';

const navItems = [
  { label: 'Home', href: '/', icon: FiHome },
  { label: 'Databases', href: '/databases', icon: FiDatabase },
  { label: 'Tables', href: '/tables', icon: FiTable },
  { label: 'Rules', href: '/rules', icon: FiShield },
  { label: 'Data Quality', href: '/data-quality', icon: FiBarChart },
  { label: 'Quality History', href: '/quality/history', icon: FiClock },
  { label: 'Settings', href: '/settings', icon: FiSettings },
];

interface SidebarProps extends BoxProps {
  onClose?: () => void;
}

const Sidebar = ({ onClose, ...rest }: SidebarProps) => {
  const pathname = usePathname();
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');
  const activeColor = useColorModeValue('blue.600', 'blue.200');
  const inactiveColor = useColorModeValue('gray.600', 'gray.300');

  // Determine if the current path matches a sidebar item
  const isLinkActive = (path: string) => {
    // Special case for Quality History - active for both /quality/history and /quality/history/[id]
    if (path === '/quality/history') {
      return pathname === path || pathname.startsWith('/quality/history/');
    }
    
    // Special case for Data Quality - should not be active when on quality history
    if (path === '/data-quality') {
      return pathname.startsWith(path) && !pathname.startsWith('/quality/history');
    }
    
    // For Home, which is the root path
    if (path === '/') {
      return pathname === path;
    }
    
    // For all other paths, check if the pathname starts with the path
    return pathname.startsWith(path);
  };

  return (
    <Box
      bg={useColorModeValue('white', 'gray.900')}
      borderRight="1px"
      borderRightColor={useColorModeValue('gray.200', 'gray.700')}
      w={{ base: 'full', md: 60 }}
      pos="fixed"
      h="full"
      {...rest}
    >
      <Flex h="20" alignItems="center" mx="8" justifyContent="space-between">
        <Text fontSize="2xl" fontWeight="bold" color="blue.500">
          DQ Assistant
        </Text>
      </Flex>
      <Divider mb={4} />
      <VStack align="stretch" spacing={1} px={3}>
        {navItems.map((item) => (
          <Link
            key={item.label}
            as={NextLink}
            href={item.href}
            style={{ textDecoration: 'none' }}
            _focus={{ boxShadow: 'none' }}
            onClick={onClose}
          >
            <Flex
              align="center"
              p="4"
              mx="1"
              borderRadius="lg"
              role="group"
              cursor="pointer"
              bg={isLinkActive(item.href) ? activeBg : 'transparent'}
              color={isLinkActive(item.href) ? activeColor : inactiveColor}
              _hover={{
                bg: hoverBg,
              }}
              fontWeight={isLinkActive(item.href) ? 'medium' : 'normal'}
            >
              <Icon
                mr="4"
                fontSize="16"
                as={item.icon}
              />
              {item.label}
            </Flex>
          </Link>
        ))}
      </VStack>
    </Box>
  );
};

export default Sidebar; 