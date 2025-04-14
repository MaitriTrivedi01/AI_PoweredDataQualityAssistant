'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Stack,
  Button,
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useToast,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ValidationResultsTable from '@/components/ValidationResultsTable';

// Helper function to format date as string
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  return date.toLocaleString(undefined, options);
}

export default function ReportDetailPage() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const reportId = params.id;

  useEffect(() => {
    const fetchReport = async () => {
      if (!reportId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/quality/reports/${reportId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch report');
        }
        
        const data = await response.json();
        setReport(data.report);
      } catch (err) {
        console.error('Error fetching report:', err);
        setError('Failed to load report. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReport();
  }, [reportId]);

  const handleDelete = async () => {
    if (!reportId) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/quality/reports/${reportId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete report');
      }
      
      toast({
        title: 'Report deleted',
        description: 'The report has been removed from history',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      router.push('/quality/history');
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

  if (loading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" thickness="4px" speed="0.65s" color="blue.500" />
      </Flex>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" variant="solid" borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  if (!report) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="warning" variant="solid" borderRadius="md">
          <AlertIcon />
          <AlertTitle mr={2}>No Data</AlertTitle>
          <AlertDescription>Report not found or was deleted.</AlertDescription>
        </Alert>
      </Container>
    );
  }

  const reportData = report.report_data;

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Box>
          <Breadcrumb mb={4}>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href="/quality" color="blue.600">
                Quality Checks
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink as={Link} href="/quality/history" color="blue.600">
                History
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink color="gray.500">
                Report #{reportId}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          <Flex justify="space-between" align="flex-start" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg" mb={2} color="gray.800">
                {report.report_name}
              </Heading>
              <Text color="gray.600">
                Table: {report.table_name}
              </Text>
              <Text color="gray.500" fontSize="sm">
                Generated on {formatDate(report.created_at)}
              </Text>
            </Box>
            
            <Flex gap={4}>
              <Button
                colorScheme="red"
                variant="outline"
                size="sm"
                onClick={handleDelete}
              >
                Delete Report
              </Button>
            </Flex>
          </Flex>
        </Box>

        {/* Summary Panel */}
        <Box bg="white" p={6} borderRadius="lg" shadow="md">
          <Heading size="md" mb={4} color="gray.700">Validation Summary</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            <Stat bg="gray.50" p={4} borderRadius="md">
              <StatLabel color="gray.600">Overall Success Rate</StatLabel>
              <StatNumber color="blue.600">
                {typeof report.summary.overall_success_rate === 'number' 
                  ? `${report.summary.overall_success_rate.toFixed(1)}%` 
                  : 'N/A'
                }
              </StatNumber>
            </Stat>
            
            <StatGroup bg="gray.50" p={4} borderRadius="md">
              <Stat>
                <StatLabel color="gray.600">Passed</StatLabel>
                <StatNumber color="green.500">{report.summary.passed_rules}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="gray.600">Failed</StatLabel>
                <StatNumber color="red.500">{report.summary.failed_rules}</StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="gray.600">Error</StatLabel>
                <StatNumber color="orange.500">{report.summary.error_rules}</StatNumber>
              </Stat>
            </StatGroup>
            
            <Stat bg="gray.50" p={4} borderRadius="md">
              <StatLabel color="gray.600">Total Records</StatLabel>
              <StatNumber color="gray.700">{report.summary.total_records}</StatNumber>
            </Stat>
          </SimpleGrid>
        </Box>

        {/* Rule Results */}
        <Stack spacing={6}>
          {reportData && reportData.rules && reportData.rules.map((rule: any, index: number) => (
            <ValidationResultsTable key={index} rule={rule} />
          ))}
        </Stack>
      </Stack>
    </Container>
  );
} 