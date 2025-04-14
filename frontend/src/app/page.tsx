'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Icon,
  Text,
  VStack,
  Image,
  Badge,
  useColorModeValue,
  SimpleGrid,
  Card,
  CardBody,
  CardHeader,
  CardFooter,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  List,
  ListItem,
  ListIcon,
  useDisclosure,
  SlideFade,
  ScaleFade,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Divider,
  keyframes,
} from '@chakra-ui/react';
import { motion, useAnimation, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { 
  FiDatabase, 
  FiCheckCircle, 
  FiShield, 
  FiBarChart2, 
  FiAlertCircle,
  FiTrendingUp,
  FiUsers, 
  FiLayers,
  FiArrowRight,
  FiCpu
} from 'react-icons/fi';
import NextLink from 'next/link';
import { useTheme } from './providers/ThemeProvider';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionText = motion(Text);

const floatAnimation1 = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(10px, -10px) rotate(5deg); }
  50% { transform: translate(0, -20px) rotate(0deg); }
  75% { transform: translate(-10px, -10px) rotate(-5deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
`;

const floatAnimation2 = keyframes`
  0% { transform: translate(0, 0) rotate(0deg); }
  25% { transform: translate(-15px, -5px) rotate(-5deg); }
  50% { transform: translate(0, -15px) rotate(0deg); }
  75% { transform: translate(15px, -5px) rotate(5deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
`;

const floatAnimation3 = keyframes`
  0% { transform: translate(0, 0) rotate(0deg) scale(1); }
  33% { transform: translate(10px, -15px) rotate(10deg) scale(1.05); }
  66% { transform: translate(-10px, -10px) rotate(-5deg) scale(0.95); }
  100% { transform: translate(0, 0) rotate(0deg) scale(1); }
`;

const pulseAnimation = keyframes`
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.05); opacity: 0.9; }
  100% { transform: scale(1); opacity: 0.7; }
`;

const float3DAnimation1 = keyframes`
  0% { transform: translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg); }
  25% { transform: translate3d(10px, -10px, 30px) rotateX(5deg) rotateY(3deg); }
  50% { transform: translate3d(0, -20px, 15px) rotateX(0deg) rotateY(-3deg); }
  75% { transform: translate3d(-10px, -10px, 5px) rotateX(-5deg) rotateY(0deg); }
  100% { transform: translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg); }
`;

const float3DAnimation2 = keyframes`
  0% { transform: translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg); }
  25% { transform: translate3d(-15px, -5px, 20px) rotateX(-3deg) rotateY(-5deg); }
  50% { transform: translate3d(0, -15px, 40px) rotateX(5deg) rotateY(0deg); }
  75% { transform: translate3d(15px, -5px, 15px) rotateX(0deg) rotateY(5deg); }
  100% { transform: translate3d(0, 0, 0) rotateX(0deg) rotateY(0deg); }
`;

const rotateAnimation = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const waveAnimation = keyframes`
  0%, 100% { 
    border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; 
  }
  25% { 
    border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; 
  }
  50% { 
    border-radius: 40% 60% 30% 70% / 70% 30% 50% 40%; 
  }
  75% { 
    border-radius: 60% 40% 70% 30% / 40% 50% 60% 50%; 
  }
`;

export default function Home() {
  const { themeMode, customColors } = useTheme();
  const [activeFeature, setActiveFeature] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [stats, setStats] = useState({
    tablesCount: 0,
    rulesCount: 0,
    checksCount: 0
  });
  
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 500], [0, -100]);
  const y2 = useTransform(scrollY, [0, 500], [0, -50]);
  const opacity = useTransform(scrollY, [0, 200, 600], [1, 0.8, 0]);
  
  const float1 = `${floatAnimation1} 20s ease-in-out infinite`;
  const float2 = `${floatAnimation2} 15s ease-in-out infinite`;
  const float3 = `${floatAnimation3} 18s ease-in-out infinite`;
  const pulse = `${pulseAnimation} 8s ease-in-out infinite`;
  const float3D1 = `${float3DAnimation1} 18s ease-in-out infinite`;
  const float3D2 = `${float3DAnimation2} 24s ease-in-out infinite`;
  const rotate = `${rotateAnimation} 120s linear infinite`;
  const wave = `${waveAnimation} 20s ease-in-out infinite`;
  
  const patternRef = useRef(null);

  const particles = useMemo(() => {
    return Array.from({ length: 50 }).map(() => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 5 + 2,
      opacity: Math.random() * 0.5 + 0.1,
    }));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
      setStats({
        tablesCount: 8,
        rulesCount: 24,
        checksCount: 56
      });
    }, 500);
    return () => clearTimeout(timer);
  }, []);
  
  const bgGradient = useColorModeValue(
    themeMode === 'custom' 
      ? `linear(to-r, ${customColors.primary}15, ${customColors.secondary}15)` 
      : 'linear(to-r, blue.50, purple.50, teal.50)',
    'linear(to-r, gray.800, gray.900)'
  );
  
  const cardBg = useColorModeValue('white', 'gray.700');
  const textColor = useColorModeValue('gray.800', 'white');
  const accentColor = useColorModeValue(
    themeMode === 'custom' ? customColors.primary : 'blue.500',
    'blue.300'
  );
  const secondaryTextColor = useColorModeValue('gray.600', 'gray.300');
  
  const features = [
    {
      icon: FiDatabase,
      title: "Intelligent Schema Analysis",
      description: "Automatically analyze and understand your database structure",
      color: "blue.400"
    },
    {
      icon: FiShield,
      title: "AI-Powered Rule Generation",
      description: "Generate optimal data quality rules with a single click",
      color: "teal.400"
    },
    {
      icon: FiCheckCircle, 
      title: "Real-time Validation",
      description: "Validate your data quality in real-time with instant feedback",
      color: "green.400"
    },
    {
      icon: FiBarChart2,
      title: "Comprehensive Reporting",
      description: "Get detailed insights into your data quality metrics",
      color: "purple.400"
    }
  ];
  
  const testimonials = [
    {
      quote: "This tool completely transformed how we manage data quality across our organization.",
      author: "Sarah Chen",
      role: "Data Engineer at TechCorp"
    },
    {
      quote: "The AI-powered rule suggestions saved us weeks of manual work defining quality rules.",
      author: "Michael Rodriguez",
      role: "Data Scientist at AnalyticsPro"
    },
    {
      quote: "We've reduced data quality issues by 73% since implementing this assistant.",
      author: "Jamie Taylor",
      role: "CTO at DataFirst"
    }
  ];

  return (
    <Box as="main" position="relative" overflow="hidden" 
      style={{
        perspective: "1200px",
        transformStyle: "preserve-3d"
      }}
    >
      <Box
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        zIndex="-1"
        overflow="hidden"
        pointerEvents="none"
        sx={{
          perspective: "1500px",
          transformStyle: "preserve-3d"
        }}
      >
        <Box
          position="absolute"
          top="-50%"
          left="-50%"
          width="200%"
          height="200%"
          bgGradient={useColorModeValue(
            themeMode === 'custom' 
              ? `radial(circle at 30% 30%, ${customColors.primary}15, transparent 60%, ${customColors.secondary}15 80%)` 
              : 'radial(circle at 30% 30%, blue.100, transparent 60%, purple.100 80%)',
            'radial(circle at 30% 30%, gray.800, gray.900 60%, gray.700 80%)'
          )}
          animation={rotate}
          opacity="0.7"
          transform="perspective(1000px) rotateX(20deg)"
        />
        
        <Box
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          zIndex="0"
        >
          {particles.map((particle, i) => (
            <MotionBox
              key={i}
              position="absolute"
              top={`${particle.y}%`}
              left={`${particle.x}%`}
              width={`${particle.size}px`}
              height={`${particle.size}px`}
              borderRadius="full"
              bg={useColorModeValue(
                themeMode === 'custom' 
                  ? i % 3 === 0 ? customColors.primary : i % 3 === 1 ? customColors.secondary : customColors.accent 
                  : i % 3 === 0 ? 'blue.300' : i % 3 === 1 ? 'purple.300' : 'teal.300',
                i % 3 === 0 ? 'blue.600' : i % 3 === 1 ? 'purple.600' : 'teal.600'
              )}
              opacity={particle.opacity}
              initial={{ y: 0 }}
              animate={{ 
                y: [0, -10, 0, 10, 0],
                opacity: [particle.opacity, particle.opacity * 0.6, particle.opacity]
              }}
              transition={{ 
                duration: 5 + Math.random() * 10, 
                repeat: Infinity,
                delay: Math.random() * 5
              }}
              filter="blur(1px)"
              zIndex="0"
            />
          ))}
        </Box>
        
        <Box
          ref={patternRef}
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          opacity="0.1"
          zIndex="0"
          sx={{
            maskImage: useColorModeValue(
              'linear-gradient(to bottom, black, transparent)',
              'linear-gradient(to bottom, black, transparent)'
            ),
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23${useColorModeValue('000000', 'ffffff')}' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        
        <MotionBox
          position="absolute"
          bottom="-10vh"
          right="-15vw"
          width="60vw"
          height="60vw"
          bg={useColorModeValue(
            themeMode === 'custom' ? `${customColors.accent}20` : 'teal.100',
            'teal.900'
          )}
          filter="blur(80px)"
          animation={wave}
          opacity="0.5"
          zIndex="0"
          animate={{
            y: [0, -30, 0, 30, 0],
            x: [0, 20, 0, -20, 0],
            scale: [1, 1.05, 1, 0.95, 1]
          }}
          transition={{
            duration: 40,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </Box>

      <Box
        position="absolute"
        top="0"
        left="0"
        right="0"
        bottom="0"
        zIndex="0"
        overflow="hidden"
        pointerEvents="none"
        style={{
          perspective: "1000px",
          transformStyle: "preserve-3d"
        }}
      >
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          opacity="0.3"
          zIndex="2"
          bgGradient={useColorModeValue(
            'linear(to-b, rgba(240,249,255,0.7), rgba(240,249,255,0.1))',
            'linear(to-b, rgba(20,20,20,0.3), rgba(20,20,20,0))'
          )}
          style={{
            backdropFilter: 'blur(40px)',
            backgroundBlendMode: 'overlay'
          }}
          _after={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            opacity: 0.05,
            mixBlendMode: 'overlay'
          }}
        />

        <Box
          position="absolute"
          top="10%"
          left="20%"
          width="25vw"
          height="25vw"
          transform="perspective(1000px) rotateX(60deg) rotateZ(45deg) translateZ(-100px)"
          opacity="0.1"
          zIndex="0"
          _before={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `repeating-linear-gradient(0deg, ${useColorModeValue('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.05)')}, ${useColorModeValue('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.05)')} 2px, transparent 2px, transparent 20px)`,
            transform: 'translateZ(10px)'
          }}
          _after={{
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `repeating-linear-gradient(90deg, ${useColorModeValue('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.05)')}, ${useColorModeValue('rgba(0,0,0,0.1)', 'rgba(255,255,255,0.05)')} 2px, transparent 2px, transparent 20px)`,
            transform: 'translateZ(5px)'
          }}
        />
        
        <Box
          position="absolute"
          top="-10%"
          left="20%"
          width="30%"
          height="50%"
          transform="perspective(1000px) rotateZ(-15deg)"
          bgGradient={useColorModeValue(
            `linear(to-b, ${themeMode === 'custom' ? `${customColors.primary}30` : 'blue.200'}, transparent)`,
            'linear(to-b, blue.900, transparent)'
          )}
          filter="blur(40px)"
          opacity="0.6"
          zIndex="0"
        />
        
        <Box
          position="absolute"
          top="0" 
          left="0"
          right="0"
          height="100%"
          bgGradient={bgGradient}
          opacity="0.8"
          zIndex="1"
          transform="perspective(1000px) rotateX(-2deg)"
          transformOrigin="top"
          boxShadow="0 70px 70px -30px rgba(0,0,0,0.2) inset"
        />
        
        <MotionBox
          position="absolute"
          top="10%"
          left="5%"
          width="300px"
          height="300px"
          borderRadius="full"
          bg={useColorModeValue(`${accentColor}50`, `${accentColor}20`)}
          filter="blur(60px)"
          animation={float3D1}
          style={{ 
            y: y1,
            transformStyle: "preserve-3d"
          }}
          opacity="0.7"
          zIndex="0"
          boxShadow="0 30px 40px rgba(0,0,0,0.15)"
        />
        
        <MotionBox
          position="absolute"
          top="30%"
          right="10%"
          width="250px"
          height="250px"
          borderRadius="33% 67% 70% 30% / 30% 30% 70% 70%"
          bg={useColorModeValue(
            themeMode === 'custom' ? `${customColors.secondary}40` : 'purple.200',
            'purple.800'
          )}
          filter="blur(40px)"
          animation={float3D2}
          style={{ 
            y: y2,
            transformStyle: "preserve-3d"
          }}
          opacity="0.6"
          zIndex="0"
          boxShadow="0 30px 30px -10px rgba(0,0,0,0.2)"
        />
        
        <Box
          position="absolute"
          top="10vh"
          left="40vw"
          width="15vw"
          height="15vw"
          borderRadius="20% 80% 40% 60% / 60% 30% 70% 40%"
          bg={useColorModeValue(
            themeMode === 'custom' ? `${customColors.primary}10` : 'blue.50',
            'blue.900'
          )}
          boxShadow="0 40px 50px -20px rgba(0,0,0,0.3)"
          zIndex="1"
          opacity="0.4"
          transform="perspective(1000px) rotateX(45deg) rotateY(15deg) translateZ(50px)"
          _after={{
            content: '""',
            position: 'absolute',
            top: '-5%',
            left: '-5%',
            width: '110%',
            height: '110%',
            borderRadius: 'inherit',
            bg: 'transparent',
            border: '1px solid',
            borderColor: useColorModeValue(
              themeMode === 'custom' ? `${customColors.primary}30` : 'blue.100',
              'blue.700'
            ),
            filter: 'blur(2px)',
            opacity: 0.7,
          }}
        />
        
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bgImage="url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgb3BhY2l0eT0iMC4yIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')"
          opacity={useColorModeValue("0.1", "0.05")}
          zIndex="1"
          transform="perspective(1000px) rotateX(70deg) scale(2) translateY(30vh)"
          transformOrigin="bottom"
          height="70vh"
          filter="blur(1px)"
        />
        
        <Box
          position="absolute"
          bottom="-10vh"
          left="0"
          right="0"
          height="30vh"
          bgGradient={useColorModeValue(
            'linear(to-t, blue.100, transparent)',
            'linear(to-t, gray.900, transparent)'
          )}
          opacity="0.8"
          zIndex="1"
          transform="perspective(1000px) rotateX(-45deg)"
          transformOrigin="bottom"
          filter="blur(20px)"
        />
        
        <Box
          position="absolute"
          top="-20vh"
          right="-10vw"
          width="40vw"
          height="40vw"
          borderRadius="full"
          bg={useColorModeValue(
            themeMode === 'custom' ? `${customColors.primary}30` : 'blue.100',
            'blue.900'
          )}
          filter="blur(100px)"
          opacity="0.6"
          transform="perspective(1000px) rotateX(30deg) rotateY(-20deg)"
        />
      </Box>

      <Box 
        pt={20} pb={20}
        position="relative"
        zIndex="1"
        style={{ 
          transform: "translateZ(0px)",
          transformStyle: "preserve-3d" 
        }}
      >
        <Container 
          maxW="container.xl"
          style={{ 
            transformStyle: "preserve-3d"
          }}
        >
          <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={10}>
            <Box 
              position="relative" 
              zIndex={1}
              style={{ 
                transform: "translateZ(20px)",
                transformStyle: "preserve-3d" 
              }}
            >
              <ScaleFade in={isLoaded} initialScale={0.9}>
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Heading 
                    as="h1" 
                    size="2xl" 
                    lineHeight="1.2"
                    fontWeight="bold"
                    mb={6}
                    color={textColor}
                  >
                    Transform Your <Text as="span" color={accentColor}>Data Quality</Text> with Artificial Intelligence
                  </Heading>
                </MotionBox>
                
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Text 
                    fontSize="xl" 
                    mb={8}
                    color={textColor}
                  >
                    AI Data Quality Assistant helps you automate data quality rules, 
                    perform comprehensive validations, and maintain pristine data across your organization.
                  </Text>
                </MotionBox>
                
                <MotionBox
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <HStack spacing={4}>
                    <NextLink href="/tables" passHref>
                      <Button 
                        size="lg" 
                        colorScheme={themeMode === 'custom' ? undefined : "blue"}
                        bg={themeMode === 'custom' ? customColors.primary : undefined}
                        _hover={{ 
                          transform: "translateY(-2px)", 
                          boxShadow: "lg",
                          bg: themeMode === 'custom' ? `${customColors.primary}90` : undefined
                        }}
                        rightIcon={<FiArrowRight />}
                        transition="all 0.2s"
                      >
                        Get Started
                      </Button>
                    </NextLink>
                    <NextLink href="/quality" passHref>
                      <Button 
                        size="lg" 
                        variant="outline"
                        _hover={{ transform: "translateY(-2px)" }}
                        transition="all 0.2s"
                      >
                        Run a Quality Check
                      </Button>
                    </NextLink>
                  </HStack>
                </MotionBox>
              </ScaleFade>
            </Box>
            
            <Flex justify="center" align="center" position="relative">
              <ScaleFade in={isLoaded} initialScale={0.8}>
                <MotionBox
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.3 }}
                  borderRadius="xl"
                  overflow="hidden"
                  boxShadow="xl"
                  bg={useColorModeValue('white', 'gray.800')}
                  p={6}
                  style={{
                    transform: "perspective(1000px) rotateX(5deg) rotateY(-5deg) translateZ(30px)",
                    transformStyle: "preserve-3d",
                    transition: "all 0.5s ease-in-out"
                  }}
                  _hover={{
                    transform: "perspective(1000px) rotateX(2deg) rotateY(-2deg) translateZ(40px)",
                    transition: "all 0.5s ease-in-out"
                  }}
                >
                  <Flex direction="column" align="center">
                    <Icon as={FiCpu} boxSize={20} color={accentColor} mb={6} />
                    <Text fontSize="lg" fontWeight="bold" mb={2} color={textColor}>AI-Powered Data Quality</Text>
                    <Text textAlign="center" mb={6} color={secondaryTextColor}>Intelligent analysis and automatic rule generation</Text>
                    
                    <Grid templateColumns="repeat(3, 1fr)" gap={4} w="100%">
                      {['Tables', 'Rules', 'Checks'].map((label, i) => (
                        <Box key={label} textAlign="center">
                          <Text fontSize="xl" fontWeight="bold" color={accentColor}>
                            {isLoaded ? Object.values(stats)[i] : 0}
                          </Text>
                          <Text fontSize="sm" color={secondaryTextColor}>{label}</Text>
                        </Box>
                      ))}
                    </Grid>
                  </Flex>
                </MotionBox>
              </ScaleFade>
            </Flex>
          </Grid>
        </Container>
      </Box>
      
      <Box py={16} position="relative" zIndex="2" bg={useColorModeValue('white', 'gray.900')}>
        <Container maxW="container.xl">
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            mb={12}
            textAlign="center"
          >
            <Heading size="xl" mb={4} color={textColor}>Powerful Features</Heading>
            <Text fontSize="lg" maxW="container.md" mx="auto" color={secondaryTextColor}>
              Everything you need to maintain high-quality data across your organization
            </Text>
          </MotionBox>
          
          <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={8}>
            {features.map((feature, index) => (
              <MotionBox
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                as={Card}
                height="100%"
                onMouseEnter={() => setActiveFeature(index)}
                transform={activeFeature === index ? "translateY(-8px)" : "none"}
                boxShadow={activeFeature === index ? "lg" : "md"}
                transition="all 0.3s"
                cursor="pointer"
                bg={useColorModeValue('white', 'gray.800')}
              >
                <CardBody>
                  <Flex direction="column" align="center" textAlign="center">
                    <Flex
                      w="60px"
                      h="60px"
                      borderRadius="full"
                      bg={useColorModeValue(`${feature.color}20`, `${feature.color}30`)}
                      justify="center"
                      align="center"
                      mb={4}
                    >
                      <Icon as={feature.icon} color={feature.color} boxSize={6} />
                    </Flex>
                    <Heading size="md" mb={2} color={textColor}>{feature.title}</Heading>
                    <Text color={secondaryTextColor}>{feature.description}</Text>
                  </Flex>
                </CardBody>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
      
      <Box py={16} bg={useColorModeValue('gray.50', 'gray.800')} position="relative" zIndex="2">
        <Container maxW="container.xl">
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            mb={12}
            textAlign="center"
          >
            <Heading size="xl" mb={4} color={textColor}>How It Works</Heading>
            <Text fontSize="lg" maxW="container.md" mx="auto" color={secondaryTextColor}>
              Three simple steps to transform your data quality process
            </Text>
          </MotionBox>
          
          <Tabs variant="soft-rounded" colorScheme={themeMode === 'custom' ? undefined : "blue"} isLazy>
            <TabList justifyContent="center" mb={8}>
              <Tab 
                _selected={{ 
                  color: 'white', 
                  bg: themeMode === 'custom' ? customColors.primary : 'blue.500',
                  boxShadow: 'md'
                }}
                bg={useColorModeValue('gray.100', 'gray.700')}
                color={textColor}
                fontWeight="medium"
                mx={2}
                px={6}
                py={3}
              >
                1. Connect
              </Tab>
              <Tab 
                _selected={{ 
                  color: 'white', 
                  bg: themeMode === 'custom' ? customColors.primary : 'blue.500',
                  boxShadow: 'md'
                }}
                bg={useColorModeValue('gray.100', 'gray.700')}
                color={textColor}
                fontWeight="medium"
                mx={2}
                px={6}
                py={3}
              >
                2. Define
              </Tab>
              <Tab 
                _selected={{ 
                  color: 'white', 
                  bg: themeMode === 'custom' ? customColors.primary : 'blue.500',
                  boxShadow: 'md'
                }}
                bg={useColorModeValue('gray.100', 'gray.700')}
                color={textColor}
                fontWeight="medium"
                mx={2}
                px={6}
                py={3}
              >
                3. Validate
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8} alignItems="center">
                  <Box>
                    <Heading size="lg" mb={4} color={textColor}>Connect Your Data</Heading>
                    <Text fontSize="lg" mb={4} color={secondaryTextColor}>
                      Browse your database tables and let the AI understand your schema structure.
                    </Text>
                    <List spacing={3} color={secondaryTextColor}>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Automatic schema detection
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Smart data type analysis
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Relationship mapping
                      </ListItem>
                    </List>
                  </Box>
                  <Flex justify="center">
                    <Box
                      borderRadius="lg"
                      overflow="hidden"
                      boxShadow="lg"
                      bg={useColorModeValue('white', 'gray.800')}
                      p={4}
                      maxW="400px"
                    >
                      <Icon as={FiDatabase} boxSize="100px" color={accentColor} mx="auto" display="block" mb={4} />
                    </Box>
                  </Flex>
                </Grid>
              </TabPanel>
              <TabPanel>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8} alignItems="center">
                  <Box>
                    <Heading size="lg" mb={4} color={textColor}>Define Quality Rules</Heading>
                    <Text fontSize="lg" mb={4} color={secondaryTextColor}>
                      Let AI generate optimal data quality rules or create your own.
                    </Text>
                    <List spacing={3} color={secondaryTextColor}>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        AI-powered rule suggestions
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
            Natural language rule creation
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Column-specific validation
                      </ListItem>
                    </List>
                  </Box>
                  <Flex justify="center">
                    <Box
                      borderRadius="lg"
                      overflow="hidden"
                      boxShadow="lg"
                      bg={useColorModeValue('white', 'gray.800')}
                      p={4}
                      maxW="400px"
                    >
                      <Icon as={FiShield} boxSize="100px" color={accentColor} mx="auto" display="block" mb={4} />
                    </Box>
                  </Flex>
                </Grid>
              </TabPanel>
              <TabPanel>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8} alignItems="center">
                  <Box>
                    <Heading size="lg" mb={4} color={textColor}>Validate & Monitor</Heading>
                    <Text fontSize="lg" mb={4} color={secondaryTextColor}>
                      Run quality checks and monitor your data quality over time.
                    </Text>
                    <List spacing={3} color={secondaryTextColor}>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Comprehensive quality reports
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Failed record inspection
                      </ListItem>
                      <ListItem>
                        <ListIcon as={FiCheckCircle} color="green.500" />
                        Historical trend analysis
                      </ListItem>
                    </List>
                  </Box>
                  <Flex justify="center">
                    <Box
                      borderRadius="lg"
                      overflow="hidden"
                      boxShadow="lg"
                      bg={useColorModeValue('white', 'gray.800')}
                      p={4}
                      maxW="400px"
                    >
                      <Icon as={FiBarChart2} boxSize="100px" color={accentColor} mx="auto" display="block" mb={4} />
                    </Box>
                  </Flex>
                </Grid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Container>
      </Box>
      
      <Box 
        py={16} 
        position="relative" 
        zIndex="2" 
        bg={useColorModeValue('white', 'gray.900')}
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9InBhdHRlcm4iIHg9IjAiIHk9IjAiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAyMCBBIDEwIDEwIDAgMCAxIDIwIDEwIEEgMTAgMTAgMCAwIDEgMzAgMjAgQSAxMCAxMCAwIDAgMSAyMCAzMCBBIDEwIDEwIDAgMCAxIDEwIDIwIFoiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI2UyZThmMCIgb3BhY2l0eT0iMC4yIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB4PSIwIiB5PSIwIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI3BhdHRlcm4pIiAvPjwvc3ZnPg==')",
          opacity: useColorModeValue("0.2", "0.03"),
          zIndex: -1,
        }}
      >
        <Container maxW="container.xl">
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            mb={12}
            textAlign="center"
          >
            <Heading size="xl" mb={4} color={textColor}>What Users Say</Heading>
            <Text fontSize="lg" maxW="container.md" mx="auto" color={secondaryTextColor}>
              Trusted by data professionals across industries
            </Text>
          </MotionBox>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={8}>
            {testimonials.map((testimonial, index) => (
              <MotionBox
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                as={Card}
                height="100%"
                bg={useColorModeValue('white', 'gray.800')}
              >
                <CardBody>
                  <Flex direction="column" height="100%">
                    <Text fontSize="lg" fontStyle="italic" mb={6} flex="1" color={textColor}>
                      "{testimonial.quote}"
                    </Text>
                    <Divider mb={4} />
                    <Box>
                      <Text fontWeight="bold" color={textColor}>{testimonial.author}</Text>
                      <Text fontSize="sm" color={secondaryTextColor}>{testimonial.role}</Text>
                    </Box>
                  </Flex>
                </CardBody>
              </MotionBox>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
      
      <Box 
        py={20} 
        position="relative"
        overflow="hidden"
        zIndex="2"
      >
        <Box
          position="absolute"
          top="0" 
          left="0"
          right="0"
          height="110%"
          bgGradient={bgGradient}
          opacity="0.9"
          zIndex="-1"
          transform="perspective(800px) rotateX(10deg) scale(1.1)"
          transformOrigin="bottom"
          boxShadow="0 -40px 50px -30px rgba(0,0,0,0.3) inset"
        />
        
        <Container maxW="container.xl" position="relative" zIndex="1">
          <MotionBox
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            textAlign="center"
            maxW="container.md"
            mx="auto"
            style={{ 
              transform: "perspective(1000px) translateZ(30px)",
              transformStyle: "preserve-3d" 
            }}
          >
            <Heading size="xl" mb={6} color={textColor}>Ready to Transform Your Data Quality?</Heading>
            <Text fontSize="xl" mb={8} color={secondaryTextColor}>
              Start using AI-powered data quality validation today
            </Text>
            <HStack spacing={4} justify="center">
              <NextLink href="/tables" passHref>
                <Button 
                  size="lg" 
                  colorScheme={themeMode === 'custom' ? undefined : "blue"}
                  bg={themeMode === 'custom' ? customColors.primary : undefined}
                  _hover={{ 
                    transform: "translateY(-2px)", 
                    boxShadow: "lg",
                    bg: themeMode === 'custom' ? `${customColors.primary}90` : undefined
                  }}
                  transition="all 0.2s"
                >
                  Get Started Now
                </Button>
              </NextLink>
            </HStack>
          </MotionBox>
        </Container>
      </Box>
    </Box>
  );
}
