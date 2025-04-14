'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ValidationResultsTable from '@/components/ValidationResultsTable';
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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  useToast
} from '@chakra-ui/react';

export default function ValidationReportPage() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reportName, setReportName] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const tableId = searchParams.get('tableId');
  const ruleIdsParam = searchParams.get('ruleIds');
  
  // Memoize the parsed rule IDs to prevent re-renders
  const ruleIds = useMemo(() => 
    ruleIdsParam?.split(',').map(id => parseInt(id, 10)) || [], 
    [ruleIdsParam]
  );
  
  const tableName = searchParams.get('tableName') || '';

  // Memoize API request params to prevent repeated calls
  const requestPayload = useMemo(() => ({
    table_name: tableName,
    rule_ids: ruleIds
  }), [tableName, ruleIds]);

  // Create a stable fetchReport function
  const fetchReport = useCallback(async () => {
    if (!tableName && !ruleIds.length) {
      setError('Missing table name or rule IDs');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('http://localhost:8000/api/quality/report-ui', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error('Failed to fetch validation report');
      }

      const data = await response.json();
      setReport(data);
      
      // Set default report name
      setReportName(`${tableName} Validation - ${new Date().toLocaleDateString()}`);
    } catch (err) {
      console.error('Error fetching validation report:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [requestPayload, tableName, ruleIds]);

  // Only run once when dependencies change
  useEffect(() => {
    let isMounted = true;
    
    if (isMounted) {
      fetchReport();
    }
    
    return () => {
      isMounted = false;
    };
  }, [fetchReport]);
  
  const handleSaveReport = async () => {
    if (!report || !reportName.trim()) return;
    
    try {
      const response = await fetch('http://localhost:8000/api/quality/report-ui/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: reportName,
          table_name: tableName,
          rule_ids: ruleIds,
          report_data: report
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save report');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Report saved',
        description: 'You can access this report from the History page',
        status: 'success',
        duration: 5000,
        isClosable: true,
      });
      
      onClose();
      
      // Navigate to the saved report
      if (data.report_id) {
        router.push(`/quality/history/${data.report_id}`);
      }
      
    } catch (err) {
      console.error('Error saving report:', err);
      toast({
        title: 'Error',
        description: 'Failed to save the report',
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
          <AlertDescription>No validation report data available.</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Stack spacing={8}>
        <Box>
          <Flex justify="space-between" align="center" wrap="wrap" gap={4}>
            <Box>
              <Heading size="lg" mb={2} color="gray.800">
                Validation Report: {report.table_name}
              </Heading>
              <Text color="gray.600">
                Generated on {new Date().toLocaleString()}
              </Text>
            </Box>
            
            <Button 
              colorScheme="purple" 
              onClick={onOpen}
              leftIcon={<span>💾</span>}
              size="md"
            >
              Save Report
            </Button>
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
          {report.rules.map((rule, index) => (
            <ValidationResultsTable key={index} rule={rule} />
          ))}
        </Stack>
      </Stack>
      
      {/* Save Report Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save Validation Report</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl>
              <FormLabel>Report Name</FormLabel>
              <Input 
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Enter a name for this report"
              />
            </FormControl>
          </ModalBody>

          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button 
              colorScheme="blue" 
              onClick={handleSaveReport}
              isDisabled={!reportName.trim()}
            >
              Save Report
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
} 