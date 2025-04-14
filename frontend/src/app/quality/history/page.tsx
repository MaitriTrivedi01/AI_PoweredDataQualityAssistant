'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  Stack,
  Card,
  CardBody,
  SimpleGrid,
  Badge,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
  Flex,
  IconButton,
  LinkBox,
  LinkOverlay,
  Stat,
  StatLabel,
  StatNumber,
  Divider,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  CardHeader,
  HStack,
  VStack,
  Icon,
  Progress,
  Link,
  useColorModeValue
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { FiClock, FiCheckCircle, FiXCircle, FiFileText, FiExternalLink, FiAlertTriangle } from 'react-icons/fi';

interface ValidationReport {
  id: number;
  report_name: string;
  table_id?: number;
  table_name: string;
  created_at: string;
  rule_count: number;
  summary: {
    total_rules: number;
    passed_rules: number;
    failed_rules: number;
    error_rules: number;
    total_records: number;
    overall_success_rate: number;
  };
  database_name?: string;
}

// Helper function to format dates in a relative way
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) {
    return `${diffInSeconds} seconds ago`;
  }
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? 'month' : 'months'} ago`;
  }
  
  const diffInYears = Math.floor(diffInMonths / 12);
  return `${diffInYears} ${diffInYears === 1 ? 'year' : 'years'} ago`;
}

// Helper function to format date as string
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

export default function QualityHistoryPage() {
  const [reports, setReports] = useState<ValidationReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  const router = useRouter();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const response = await fetch('http://localhost:8000/api/quality/reports');
        
        if (!response.ok) {
          throw new Error('Failed to fetch validation reports');
        }
        
        const data = await response.json();
        if (data && data.status === "success" && Array.isArray(data.reports)) {
          setReports(data.reports);
        } else {
          console.error('API response is not in expected format:', data);
          setReports([]);
          setError('Received invalid data format from server');
        }
      } catch (err) {
        console.error('Error fetching reports:', err);
        setError('Failed to load validation reports. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchReports();
  }, []);

  const handleDelete = async (reportId: number) => {
    try {
      const response = await fetch(`http://localhost:8000/api/quality/reports/${reportId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      
      // Remove the deleted report from state
      setReports(reports.filter(report => report.id !== reportId));
      
      toast({
        title: 'Report deleted',
        description: 'The report has been removed from history',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
    } catch (err) {
      console.error('Error deleting report:', err);
      toast({
        title: 'Error',
        description: 'Failed to delete the report',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const viewReport = (reportId: number) => {
    router.push(`/quality/history/${reportId}`);
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" height="60vh">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Box p={4}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Box mb={6}>
        <Heading size="lg">Data Quality Validation History</Heading>
        <Text color="gray.600" mt={1}>
          View past data quality validation reports
        </Text>
      </Box>
      
      {reports.length === 0 ? (
        <Box textAlign="center" p={10} borderRadius="md" bg="gray.50">
          <Icon as={FiFileText} boxSize={10} color="gray.400" />
          <Text mt={4} fontSize="lg">No validation reports found</Text>
          <Text mt={2} color="gray.500">Run data quality validations to see reports here</Text>
        </Box>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {reports.map(report => (
            <Card 
              key={report.id} 
              borderRadius="lg" 
              overflow="hidden" 
              boxShadow="md" 
              bg={cardBg}
              borderColor={borderColor}
              borderWidth="1px"
              transition="all 0.2s"
              _hover={{ transform: 'translateY(-5px)', boxShadow: 'lg' }}
            >
              <CardHeader bg="blue.50" p={4}>
                <Flex justify="space-between" align="center">
                  <Heading size="md" color="blue.700">{report.report_name}</Heading>
                  <Badge 
                    colorScheme={report.summary.overall_success_rate >= 90 ? 'green' : 
                                report.summary.overall_success_rate >= 70 ? 'yellow' : 'red'}
                    borderRadius="full"
                    px={2}
                    py={1}
                  >
                    {Math.round(report.summary.overall_success_rate)}% Passed
                  </Badge>
                </Flex>
              </CardHeader>
              <CardBody p={4}>
                <VStack align="stretch" spacing={4}>
                  <HStack>
                    <Text fontWeight="semibold">Table:</Text>
                    <Link 
                      as={NextLink} 
                      href={`/tables/${report.table_id || '#'}`}
                      color="blue.500"
                      display="flex" 
                      alignItems="center"
                    >
                      {report.table_name}
                      <Icon as={FiExternalLink} ml={1} boxSize={3} />
                    </Link>
                  </HStack>
                  {report.database_name && (
                    <HStack>
                      <Text fontWeight="semibold">Database:</Text>
                      <Text>{report.database_name}</Text>
                    </HStack>
                  )}
                  <HStack>
                    <Text fontWeight="semibold">Created:</Text>
                    <HStack spacing={1}>
                      <Icon as={FiClock} color="gray.500" />
                      <Text>{formatDate(report.created_at)}</Text>
                    </HStack>
                  </HStack>
                  
                  <Divider />
                  
                  <Progress 
                    value={report.summary.overall_success_rate} 
                    colorScheme={report.summary.overall_success_rate >= 90 ? 'green' : 
                              report.summary.overall_success_rate >= 70 ? 'yellow' : 'red'}
                    borderRadius="full"
                    size="sm"
                  />
                  
                  <SimpleGrid columns={3} spacing={4}>
                    <Stat>
                      <StatLabel color="green.500" fontWeight="medium">
                        <HStack>
                          <Icon as={FiCheckCircle} />
                          <Text>Passed</Text>
                        </HStack>
                      </StatLabel>
                      <StatNumber>{report.summary.passed_rules}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel color="red.500" fontWeight="medium">
                        <HStack>
                          <Icon as={FiXCircle} />
                          <Text>Failed</Text>
                        </HStack>
                      </StatLabel>
                      <StatNumber>{report.summary.failed_rules}</StatNumber>
                    </Stat>
                    <Stat>
                      <StatLabel color="orange.500" fontWeight="medium">
                        <HStack>
                          <Icon as={FiAlertTriangle} />
                          <Text>Errors</Text>
                        </HStack>
                      </StatLabel>
                      <StatNumber>{report.summary.error_rules}</StatNumber>
                    </Stat>
                  </SimpleGrid>
                  
                  <Button 
                    as={NextLink}
                    href={`/quality/history/${report.id}`}
                    colorScheme="blue" 
                    variant="outline"
                    size="sm"
                    width="full"
                    rightIcon={<FiExternalLink />}
                  >
                    View Report Details
                  </Button>
                </VStack>
              </CardBody>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Box>
  );
} 