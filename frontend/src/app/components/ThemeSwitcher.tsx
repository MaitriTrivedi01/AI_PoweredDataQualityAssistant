'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverHeader,
  PopoverBody,
  PopoverArrow,
  PopoverCloseButton,
  Text,
  Radio,
  RadioGroup,
  Stack,
  FormControl,
  FormLabel,
  Input,
  useColorMode,
  IconButton,
  HStack,
  Tooltip,
  VStack,
  useToast,
  useColorModeValue,
} from '@chakra-ui/react';
import { useTheme } from '../providers/ThemeProvider';

export default function ThemeSwitcher() {
  const { themeMode, customColors, setThemeMode, setCustomColors } = useTheme();
  const { colorMode, toggleColorMode } = useColorMode();
  
  const [tempColors, setTempColors] = useState({
    primary: customColors.primary,
    secondary: customColors.secondary,
    accent: customColors.accent,
  });

  const handleColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
    setTempColors({
      ...tempColors,
      [colorType]: value,
    });
  };

  const applyCustomColors = () => {
    setCustomColors(tempColors);
    // Show a small toast or message
    toast({
      title: "Colors Applied",
      description: "Your custom colors have been applied to the theme",
      status: "success",
      duration: 2000,
      isClosable: true,
    });
  };

  const handleThemeChange = (value: string) => {
    setThemeMode(value as 'light' | 'dark' | 'custom');
    // Switch color mode automatically based on theme selected
    if (value === 'light' && colorMode !== 'light') {
      toggleColorMode();
    } else if (value === 'dark' && colorMode !== 'dark') {
      toggleColorMode();
    }
  };

  // Function to apply preset color palettes
  const applyColorPreset = (preset: string) => {
    switch(preset) {
      case 'ocean':
        setTempColors({
          primary: '#3E7CB1', // Ocean blue
          secondary: '#81A4CD', // Light blue
          accent: '#054A91', // Deep blue
        });
        break;
      case 'forest':
        setTempColors({
          primary: '#3C6E71', // Forest green
          secondary: '#70AE6E', // Light green
          accent: '#213E3B', // Deep green
        });
        break;
      case 'sunset':
        setTempColors({
          primary: '#DB504A', // Coral red
          secondary: '#FF6B6B', // Light red
          accent: '#E6B89C', // Sandy beige
        });
        break;
      case 'berry':
        setTempColors({
          primary: '#9A4C95', // Purple
          secondary: '#C768C7', // Light purple
          accent: '#6B3FA0', // Deep purple
        });
        break;
      default:
        break;
    }
  };

  // Add useToast hook
  const toast = useToast();

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <IconButton
          aria-label="Change theme"
          icon={<span>🎨</span>}
          variant="ghost"
          size="md"
        />
      </PopoverTrigger>
      <PopoverContent width="300px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader fontWeight="semibold">Theme Settings</PopoverHeader>
        <PopoverBody py={4}>
          <VStack spacing={5} align="stretch">
            <Box>
              <Text mb={3} fontWeight="medium">Select Theme</Text>
              <RadioGroup onChange={handleThemeChange} value={themeMode}>
                <Stack spacing={2}>
                  <Radio value="light">Light</Radio>
                  <Radio value="dark">Dark</Radio>
                  <Radio value="custom">Custom</Radio>
                </Stack>
              </RadioGroup>
            </Box>

            {themeMode === 'custom' && (
              <Box p={4} bg={useColorModeValue('beige.50', 'gray.700')} borderRadius="md" mb={4}>
                <Text mb={3} fontWeight="medium">Customize Colors</Text>
                
                <HStack mb={4} spacing={3}>
                  <Button size="xs" onClick={() => applyColorPreset('ocean')}>Ocean</Button>
                  <Button size="xs" onClick={() => applyColorPreset('forest')}>Forest</Button>
                  <Button size="xs" onClick={() => applyColorPreset('sunset')}>Sunset</Button>
                  <Button size="xs" onClick={() => applyColorPreset('berry')}>Berry</Button>
                </HStack>
                
                <Stack spacing={3}>
                  <FormControl>
                    <FormLabel htmlFor="primary-color">Primary Color</FormLabel>
                    <HStack>
                      <Input
                        id="primary-color"
                        type="color"
                        value={tempColors.primary}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        w="50px"
                        p={1}
                      />
                      <Input
                        value={tempColors.primary}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        maxW="120px"
                      />
                    </HStack>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Secondary Color</FormLabel>
                    <Flex>
                      <Input
                        type="color"
                        value={tempColors.secondary}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        width="80px"
                        mr={2}
                      />
                      <Input
                        value={tempColors.secondary}
                        onChange={(e) => handleColorChange('secondary', e.target.value)}
                        placeholder="#38B2AC"
                      />
                    </Flex>
                  </FormControl>

                  <FormControl>
                    <FormLabel fontSize="sm">Accent Color</FormLabel>
                    <Flex>
                      <Input
                        type="color"
                        value={tempColors.accent}
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                        width="80px"
                        mr={2}
                      />
                      <Input
                        value={tempColors.accent}
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                        placeholder="#9F7AEA"
                      />
                    </Flex>
                  </FormControl>

                  <Button
                    onClick={applyCustomColors}
                    colorScheme="blue"
                    size="sm"
                    width="full"
                    mt={2}
                  >
                    Apply Custom Colors
                  </Button>
                </Stack>
              </Box>
            )}

            <Box>
              <Text mb={2} fontWeight="medium">Preview</Text>
              <HStack spacing={3}>
                <Button 
                  variant="solid"
                  bg={themeMode === 'custom' ? tempColors.primary : undefined}
                  colorScheme={themeMode !== 'custom' ? 'blue' : undefined}
                  color="white"
                  size="sm"
                >
                  Primary
                </Button>
                <Button 
                  variant="solid"
                  bg={themeMode === 'custom' ? tempColors.secondary : undefined}
                  colorScheme={themeMode !== 'custom' ? 'teal' : undefined}
                  color="white"
                  size="sm"
                >
                  Secondary
                </Button>
                <Button 
                  variant="solid"
                  bg={themeMode === 'custom' ? tempColors.accent : undefined}
                  colorScheme={themeMode !== 'custom' ? 'purple' : undefined}
                  color="white"
                  size="sm"
                >
                  Accent
                </Button>
              </HStack>
            </Box>
          </VStack>
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
} 