import React, { useState } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  Heading,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  List,
  ListItem,
  ListIcon,
  Divider,
  Card,
  CardHeader,
  CardBody,
  Button,
  Collapse,
  TableContainer,
  Tooltip,
  Flex,
  Icon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription
} from '@chakra-ui/react';
import { WarningIcon, ChevronDownIcon, ChevronUpIcon, ViewIcon, InfoIcon } from '@chakra-ui/icons';

const ValidationResultsTable = ({ rule }) => {
  const [showAllFailures, setShowAllFailures] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  if (!rule) return null;

  const formatPercentage = (value) => {
    return typeof value === 'number' ? `${value.toFixed(1)}%` : 'N/A';
  };

  const statusBadge = (status) => {
    const colorScheme = status === 'SUCCESS' ? 'green' : 
                        status === 'FAILURE' ? 'red' : 
                        'yellow';
    
    return (
      <Badge colorScheme={colorScheme} fontSize="sm" px={2} py={1} borderRadius="full">
        {status}
      </Badge>
    );
  };

  const getColumnResults = () => {
    const { column_results = {}, failed_records = {} } = rule;
    
    return Object.entries(column_results).map(([column, results]) => {
      const failures = failed_records[column] || [];
      
      return {
        column,
        ...results,
        failures,
        failureCount: failures.length
      };
    });
  };

  const columnResults = getColumnResults();
  
  // Get all unique record keys from failed records across all columns
  const getAllFailedRecordColumns = () => {
    const columns = new Set();
    
    if (!rule.failed_records) return [];
    
    Object.values(rule.failed_records).forEach(failedRecords => {
      failedRecords.forEach(record => {
        if (typeof record === 'object' && record !== null) {
          Object.keys(record).forEach(key => columns.add(key));
        }
      });
    });
    
    return Array.from(columns);
  };
  
  const failedRecordColumns = getAllFailedRecordColumns();

  // Get all failed records across all columns
  const getAllFailedRecords = () => {
    if (!rule.failed_records) return [];
    
    // Flatten all failed records from all columns
    const allRecords = [];
    Object.entries(rule.failed_records).forEach(([column, records]) => {
      records.forEach(record => {
        if (typeof record === 'object' && record !== null) {
          // Add column info to each record
          allRecords.push({
            _failedColumn: column,
            ...record
          });
        } else {
          // Handle primitive values
          allRecords.push({
            _failedColumn: column,
            value: record
          });
        }
      });
    });
    
    return allRecords;
  };
  
  const allFailedRecords = getAllFailedRecords();
  const previewCount = 5; // Number of records to show in preview
  
  // Check if this rule has validation failures, even if specific records aren't identified
  const hasFailedValidation = rule.status === 'FAILURE';
  const hasFailedRecordDetails = allFailedRecords.length > 0;
  const failedColumns = Object.entries(rule.column_results || {})
    .filter(([_, results]) => !results.success)
    .map(([column, _]) => column);

  return (
    <Card shadow="md" mb={6}>
      <CardHeader bg="gray.50" borderBottom="1px" borderColor="gray.200" pb={3}>
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Heading size="md" color="gray.700">{rule.rule_name}</Heading>
            <Text mt={1} fontSize="sm" color="gray.500">{rule.rule_description}</Text>
            <Box mt={2}>
              {statusBadge(rule.status)}
            </Box>
          </Box>
          
          {hasFailedValidation && (
            <Button 
              colorScheme="red" 
              size="sm" 
              leftIcon={<ViewIcon />}
              onClick={onOpen}
            >
              View Validation Details
            </Button>
          )}
        </Flex>
      </CardHeader>

      <CardBody p={5}>
        {/* Validation Metrics */}
        <Box mb={6}>
          <Heading size="sm" mb={3} color="gray.700">Validation Metrics</Heading>
          <SimpleGrid columns={[1, null, 2]} spacing={4}>
            <Stat bg="gray.50" p={4} borderRadius="md">
              <StatLabel color="gray.500">Success Rate</StatLabel>
              <StatNumber color="blue.600">{formatPercentage(rule.success_rate)}</StatNumber>
            </Stat>
            <Stat bg="gray.50" p={4} borderRadius="md">
              <StatLabel color="gray.500">Total Records</StatLabel>
              <StatNumber color="gray.700">{rule.total_records || 'N/A'}</StatNumber>
            </Stat>
          </SimpleGrid>
        </Box>

        {/* Column Results */}
        <Box mb={6}>
          <Heading size="sm" mb={3} color="gray.700">Column Results</Heading>
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Column</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Success Rate</Th>
                  <Th isNumeric>Failed Records</Th>
                  <Th isNumeric>Total Records</Th>
                </Tr>
              </Thead>
              <Tbody>
                {columnResults.map((result, index) => (
                  <Tr key={index}>
                    <Td fontWeight="medium">{result.column}</Td>
                    <Td>
                      {result.success ? 
                        <Badge colorScheme="green">PASS</Badge> : 
                        <Badge colorScheme="red">FAIL</Badge>
                      }
                    </Td>
                    <Td isNumeric>{formatPercentage(result.success_rate)}</Td>
                    <Td isNumeric>
                      {result.unexpected_count > 0 ? (
                        <Flex alignItems="center" justifyContent="flex-end">
                          <Text>{result.unexpected_count}</Text>
                          <Icon 
                            as={WarningIcon} 
                            color="red.500" 
                            ml={2} 
                            boxSize={3}
                          />
                        </Flex>
                      ) : (
                        result.unexpected_count
                      )}
                    </Td>
                    <Td isNumeric>{result.total_records}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>

        {/* Failed Records Button */}
        {hasFailedValidation && (
          <Box mb={6} mt={6}>
            <Button 
              colorScheme="red" 
              size="md"
              width="100%"
              height="50px"
              leftIcon={<Icon as={WarningIcon} />}
              onClick={onOpen}
              _hover={{ transform: 'translateY(-2px)', boxShadow: 'md' }}
              transition="all 0.2s"
            >
              View Validation Failure Details
            </Button>
          </Box>
        )}
      </CardBody>

      {/* Validation Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="5xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader bg="red.50" borderBottomWidth="1px" borderColor="red.200">
            <Flex alignItems="center" gap={2}>
              <Icon as={WarningIcon} color="red.500" />
              <Text>Validation Failure Details: {rule.rule_name}</Text>
            </Flex>
          </ModalHeader>
          <ModalCloseButton />
          
          <ModalBody p={4}>
            <Box mb={6}>
              <Alert status="error" variant="left-accent" mb={4}>
                <AlertIcon />
                <Box>
                  <AlertTitle>Validation Failed</AlertTitle>
                  <AlertDescription>
                    {rule.rule_description} ({formatPercentage(rule.success_rate)} success rate)
                  </AlertDescription>
                </Box>
              </Alert>
              
              <Heading size="sm" mb={3}>Failed Columns</Heading>
              <Table variant="simple" size="sm" mb={6}>
                <Thead bg="red.50">
                  <Tr>
                    <Th>Column</Th>
                    <Th isNumeric>Failed Records</Th>
                    <Th isNumeric>Total Records</Th>
                    <Th isNumeric>Success Rate</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {failedColumns.map(column => {
                    const result = rule.column_results[column];
                    return (
                      <Tr key={column}>
                        <Td fontWeight="semibold">{column}</Td>
                        <Td isNumeric color="red.500" fontWeight="bold">{result.unexpected_count}</Td>
                        <Td isNumeric>{result.total_records}</Td>
                        <Td isNumeric color={result.success_rate >= 80 ? "orange.500" : "red.500"}>
                          {formatPercentage(result.success_rate)}
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Box>
            
            {hasFailedRecordDetails ? (
              <>
                <Heading size="sm" mb={3}>Failed Record Details</Heading>
                
                {allFailedRecords.length > previewCount && (
                  <Button 
                    size="sm" 
                    onClick={() => setShowAllFailures(!showAllFailures)}
                    mb={4}
                    rightIcon={showAllFailures ? <ChevronUpIcon /> : <ChevronDownIcon />}
                    variant="outline"
                    colorScheme="red"
                  >
                    {showAllFailures ? 
                      `Show ${previewCount} records` : 
                      `Show all ${allFailedRecords.length} failed records`}
                  </Button>
                )}
                
                <TableContainer 
                  maxH="60vh" 
                  overflowY="auto" 
                  borderWidth="1px" 
                  borderColor="red.200"
                  bg="red.50" 
                  borderRadius="md"
                >
                  <Table variant="simple" size="sm" colorScheme="red">
                    <Thead position="sticky" top={0} bg="red.100" zIndex={1}>
                      <Tr>
                        <Th color="red.800" width="150px">Failed Column</Th>
                        {failedRecordColumns.map(col => (
                          <Th key={col} color="red.800">{col}</Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {(showAllFailures ? allFailedRecords : allFailedRecords.slice(0, previewCount)).map((record, idx) => (
                        <Tr key={idx}>
                          <Td fontWeight="semibold" color="red.700">
                            {record._failedColumn}
                          </Td>
                          {failedRecordColumns.map(col => (
                            <Td key={col}>
                              {record[col] !== undefined ? (
                                typeof record[col] === 'object' ? (
                                  <Tooltip label={JSON.stringify(record[col], null, 2)}>
                                    <Text noOfLines={1} maxW="200px" overflow="hidden" textOverflow="ellipsis">
                                      {JSON.stringify(record[col])}
                                    </Text>
                                  </Tooltip>
                                ) : (
                                  String(record[col])
                                )
                              ) : ''}
                            </Td>
                          ))}
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
                
                {!showAllFailures && allFailedRecords.length > previewCount && (
                  <Text fontSize="sm" mt={2} color="gray.600" textAlign="center">
                    Showing {previewCount} of {allFailedRecords.length} failed records
                  </Text>
                )}
              </>
            ) : (
              <Box 
                bg="red.50" 
                p={5} 
                borderRadius="lg" 
                borderWidth="1px" 
                borderColor="red.200"
              >
                <Flex alignItems="center" gap={3} mb={4}>
                  <Icon as={InfoIcon} color="red.500" boxSize={5} />
                  <Heading size="sm" color="red.700">No Individual Record Details Available</Heading>
                </Flex>
                
                <Text mb={3}>
                  This validation failed with {Object.values(rule.column_results || {})
                    .reduce((sum, col) => sum + (col.unexpected_count || 0), 0)} failed records, 
                  but specific row data is not available for display.
                </Text>

                <Alert status="info" variant="solid" bg="blue.400">
                  <AlertIcon />
                  <Box>
                    <AlertTitle>Common Reasons For This Validation Failure:</AlertTitle>
                    <AlertDescription>
                      <Box mt={2}>
                        <Text fontWeight="medium">For column: {failedColumns.join(', ')}</Text>
                        <Text mt={1}>• Values may exceed maximum length constraints</Text>
                        <Text>• Values may be missing or null when required</Text>
                        <Text>• Values may not match expected patterns or formats</Text>
                        <Text>• Values may not be unique when uniqueness is required</Text>
                      </Box>
                    </AlertDescription>
                  </Box>
                </Alert>
              </Box>
            )}
          </ModalBody>
          
          <ModalFooter>
            <Button colorScheme="blue" onClick={onClose}>Close</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
};

export default ValidationResultsTable; 