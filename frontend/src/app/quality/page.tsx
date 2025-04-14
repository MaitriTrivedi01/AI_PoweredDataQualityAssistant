'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  Spinner,
  Select,
  Checkbox,
  FormControl,
  FormLabel,
  Alert,
  AlertIcon,
  Card,
  CardBody,
  Badge,
  Divider,
  useToast,
  Flex,
  HStack,
  useColorModeValue,
} from '@chakra-ui/react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Rule {
  id: number;
  name: string;
  description: string;
  table_id: number;
  is_active: boolean;
  rule_type: string;
  expectation_config: any;
}

interface RuleResult {
  rule_id: number;
  execution_time: string;
  status: string;
  success_count: number;
  failure_count: number;
  total_records: number;
  error_details: string | null;
  result_metadata: {
    // For normal results
    observed_value?: any;
    unexpected_count?: number;
    unexpected_percent?: number;
    partial_unexpected_list?: any[];
    error_message?: string;
    element_count?: number;
    missing_count?: number;
    missing_percent?: number;
    success_percent?: number;
    column?: string;
    validation_type?: string;
    min_value?: number;
    max_value?: number;
    regex_pattern?: string;
    validation_time?: string;
    row_count?: number;
    cached?: boolean;
    // For error results
    error?: string;
    validation_details?: any[];
    total_records?: number;
    success_rate?: number;
  };
  cached: boolean;
}

interface Table {
  id: number;
  name: string;
}

interface QualityCheckSummary {
  total_rules: number;
  passed_rules: number;
  failed_rules: number;
  error_rules: number;
  total_records_validated: number;
  total_records_passed: number;
  total_records_failed: number;
  overall_success_rate: number;
  execution_time: string;
}

interface QualityCheckResponse {
  results: RuleResult[];
  summary: QualityCheckSummary;
}

export default function QualityPage() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const tableIdParam = searchParams.get('tableId');
  const tableNameParam = searchParams.get('tableName');
  
  const [tables, setTables] = useState<Table[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [filteredRules, setFilteredRules] = useState<Rule[]>([]);
  const [results, setResults] = useState<RuleResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedRules, setSelectedRules] = useState<number[]>([]);
  const [running, setRunning] = useState(false);
  const [showTableSelect, setShowTableSelect] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        const [tablesResponse, rulesResponse] = await Promise.all([
          fetch("http://localhost:8000/api/tables"),
          fetch("http://localhost:8000/api/rules")
        ]);
        
        if (!isMounted) return;
        
        if (!tablesResponse.ok) {
        throw new Error("Failed to fetch tables");
      }
        
        if (!rulesResponse.ok) {
          throw new Error("Failed to fetch rules");
        }
        
        const tablesData = await tablesResponse.json();
        const rulesData = await rulesResponse.json();
        
        if (isMounted) {
          setTables(tablesData);
          setRules(rulesData);
          
          // If there are URL parameters for table, select it automatically
          if (tableNameParam && tableIdParam) {
            setSelectedTable(tableNameParam);
            setSelectedTableId(parseInt(tableIdParam));
            setShowTableSelect(false); // Hide table selection dropdown
            
            // Filter rules for this table
            const tableRules = rulesData.filter(
              rule => rule.table_id === parseInt(tableIdParam)
            );
            setFilteredRules(tableRules);
          }
          
      setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to fetch data");
          setLoading(false);
          console.error(err);
        }
      }
    };
    
    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, [tableIdParam, tableNameParam]);

  // Adjust the existing effect to not override URL param settings
  useEffect(() => {
    if (!tableIdParam && selectedTable) {
      const tableObj = tables.find(t => t.name === selectedTable);
      if (tableObj) {
        setSelectedTableId(tableObj.id);
        const tableRules = rules.filter(rule => rule.table_id === tableObj.id);
        setFilteredRules(tableRules);
        setSelectedRules([]);
      }
    } else if (!tableIdParam) {
      setFilteredRules([]);
      setSelectedTableId(null);
      setSelectedRules([]);
    }
  }, [selectedTable, tables, rules, tableIdParam]);

  const runQualityCheck = async () => {
    if (!selectedTable || selectedRules.length === 0) return;
    
    setRunning(true);
    setError("");
    setResults([]);
    
    try {
      const response = await fetch("http://localhost:8000/api/quality/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table_name: selectedTable,
          rule_ids: selectedRules
        })
      });
      
      if (!response.ok) {
        throw new Error("Failed to run quality check");
      }
      
      const data = await response.json();
      console.log("Quality check response:", data);
      
      if (data.status === 'success' && data.results && Array.isArray(data.results)) {
        // Get metadata values with proper fallbacks
        const processedResults = data.results.map(result => {
          // Get metadata values with proper fallbacks
          const metadata = result.result_metadata || {};
          const element_count = metadata.element_count || metadata.row_count || metadata.total_records || 0;
          const unexpected_count = metadata.unexpected_count || 0;
          
          // Calculate success and failure counts correctly
          const success_count = element_count - unexpected_count;
          const failure_count = unexpected_count;
          
          // Ensure all required fields exist with correct values
          return {
            ...result,
            success_count: result.success_count !== undefined ? result.success_count : success_count,
            failure_count: result.failure_count !== undefined ? result.failure_count : failure_count,
            total_records: element_count,
            status: result.status || "ERROR",
          };
        });
        
        setResults(processedResults);
        
        // Check if all rules have ERROR status
        const allErrors = processedResults.every(result => result.status === "ERROR");
        
        if (allErrors) {
          toast({
            title: "Quality Check Completed with Errors",
            description: "All rules reported errors. Please check the rule configurations.",
            status: "error",
            duration: 5000,
            isClosable: true,
          });
        } else if (data.summary) {
          toast({
            title: "Quality Check Completed",
            description: `Validated ${data.summary.total_records_validated || 0} records with ${(data.summary.overall_success_rate || 0).toFixed(2)}% success rate`,
            status: data.summary.overall_success_rate >= 95 ? 'success' : 'warning',
            duration: 5000,
            isClosable: true,
          });
        } else {
          toast({
            title: "Quality Check Completed",
            description: "Check the results below for details",
            status: "info",
            duration: 5000,
            isClosable: true,
          });
        }
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (err) {
      console.error("Quality check error:", err);
      setError(`Failed to run quality check: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast({
        title: "Error",
        description: "Failed to run quality check. Please try again.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setRunning(false);
    }
  };

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTable(e.target.value);
    setResults([]);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="60vh">
        <Spinner 
          size="xl" 
          color="blue.500" 
          thickness="4px"
          speed="0.8s"
          emptyColor="gray.200"
        />
      </Box>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} alignItems="stretch">
        <Box pb={4} borderBottom="2px" borderColor="gray.200">
          <Flex justifyContent="space-between" alignItems="flex-start">
            <Box>
          <Heading size="lg">Data Quality Check</Heading>
              {selectedTable ? (
                <Text variant="secondary" mt={2}>
                  Validate and monitor quality rules for table: <Badge colorScheme="blue">{selectedTable}</Badge>
                </Text>
              ) : (
          <Text variant="secondary" mt={2}>Validate and monitor your data quality rules</Text>
              )}
            </Box>
          </Flex>
        </Box>

        {error && (
          <Alert status="error" variant="left-accent">
            <AlertIcon />
            <Text color="red.700">{error}</Text>
          </Alert>
        )}

        <Card>
          <CardBody p={6}>
            <VStack spacing={6} alignItems="stretch">
              {showTableSelect ? (
              <FormControl>
                <FormLabel>Select Table</FormLabel>
                <Select
                  value={selectedTable}
                    onChange={handleTableChange}
                  placeholder="Choose a table to validate"
                  size="lg"
                >
                  {tables.map((table) => (
                    <option key={table.id} value={table.name}>
                      {table.name}
                    </option>
                  ))}
                </Select>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Select a table to see its specific quality rules
                  </Text>
              </FormControl>
              ) : (
                <Flex justifyContent="space-between" alignItems="center">
                  <Heading size="md">
                    Quality Rules for {selectedTable}
                  </Heading>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setShowTableSelect(true)}
                  >
                    Change Table
                  </Button>
                </Flex>
              )}

              <FormControl>
                <FormLabel>Quality Rules for {selectedTable}</FormLabel>
                <Box 
                  borderWidth="1px" 
                  borderColor="gray.200" 
                  borderRadius="lg" 
                  bg="gray.50"
                  maxH="400px"
                  overflowY="auto"
                  sx={{
                    '&::-webkit-scrollbar': {
                      width: '8px',
                      borderRadius: '8px',
                      backgroundColor: 'gray.100',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'gray.300',
                      borderRadius: '8px',
                    },
                  }}
                >
                  {selectedTable ? (
                    filteredRules.length > 0 ? (
                      <VStack spacing={4} p={4} align="stretch">
                        <Flex justifyContent="space-between" alignItems="center">
                          <Box>
                            <HStack>
                              <Badge colorScheme="green" fontSize="md" p={2}>
                                {filteredRules.filter(r => r.is_active).length} Active
                              </Badge>
                              <Badge colorScheme="gray" fontSize="md" p={2}>
                                {filteredRules.filter(r => !r.is_active).length} Inactive
                              </Badge>
                            </HStack>
                          </Box>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            colorScheme="blue"
                            onClick={() => {
                              // If all rules are selected, deselect all. Otherwise, select all active rules
                              if (selectedRules.length === filteredRules.filter(r => r.is_active).length) {
                                setSelectedRules([]);
                              } else {
                                setSelectedRules(filteredRules.filter(r => r.is_active).map(r => r.id));
                              }
                            }}
                          >
                            {selectedRules.length === filteredRules.filter(r => r.is_active).length ? 
                              "Deselect All" : "Select All Active"}
                          </Button>
                        </Flex>
                        
                        {/* Active Rules Section */}
                        {filteredRules.filter(r => r.is_active).length > 0 && (
                          <Box>
                            <Heading size="sm" py={2} px={4} bg="green.50" color="green.700" borderRadius="md">
                              Active Rules
                            </Heading>
                            
                            {/* Group active rules by column */}
                            {(() => {
                              // Get unique columns from active rules
                              const columns = [...new Set(filteredRules
                                .filter(r => r.is_active)
                                .map(r => r.expectation_config?.kwargs?.column)
                                .filter(Boolean))];
                              
                              return columns.map(column => (
                                <Box key={`active-${column}`} mt={3}>
                                  <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                                    Column: {column}
                                  </Text>
                                  <VStack spacing={2} mt={2} align="stretch">
                                    {filteredRules
                                      .filter(r => r.is_active && r.expectation_config?.kwargs?.column === column)
                                      .map(rule => (
                                        <Box
                                          key={rule.id}
                                          bg="white"
                                          p={3}
                                          borderRadius="md"
                                          borderWidth="1px"
                                          borderColor="gray.200"
                                          transition="all 0.2s"
                                          _hover={{
                                            borderColor: 'gray.300',
                                            transform: 'translateY(-1px)',
                                            boxShadow: 'sm',
                                          }}
                                        >
                                          <Checkbox
                                            isChecked={selectedRules.includes(rule.id)}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                              if (e.target.checked) {
                                                setSelectedRules([...selectedRules, rule.id]);
                                              } else {
                                                setSelectedRules(selectedRules.filter((id) => id !== rule.id));
                                              }
                                            }}
                                          >
                                            <VStack spacing={1} align="start">
                                              <HStack>
                                                <Text fontWeight="600">{rule.name}</Text>
                                                <Badge 
                                                  colorScheme={rule.is_active ? 'green' : 'gray'} 
                                                  mb={2}
                                                  bg={rule.is_active 
                                                    ? useColorModeValue('green.100', 'green.500') 
                                                    : useColorModeValue('gray.100', 'gray.600')
                                                  }
                                                  color={rule.is_active 
                                                    ? useColorModeValue('green.800', 'white') 
                                                    : useColorModeValue('gray.800', 'white')
                                                  }
                                                >
                                                  {rule.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                              </HStack>
                                              <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                                            </VStack>
                                          </Checkbox>
                                        </Box>
                                      ))}
                                  </VStack>
                                </Box>
                              ));
                            })()}
                            
                            {/* Handle active rules without column property */}
                            {filteredRules.filter(r => r.is_active && !r.expectation_config?.kwargs?.column).length > 0 && (
                              <Box mt={3}>
                                <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                                  Table-Level Rules
                                </Text>
                                <VStack spacing={2} mt={2} align="stretch">
                                  {filteredRules
                                    .filter(r => r.is_active && !r.expectation_config?.kwargs?.column)
                                    .map(rule => (
                        <Box
                          key={rule.id}
                          bg="white"
                                        p={3}
                          borderRadius="md"
                          borderWidth="1px"
                          borderColor="gray.200"
                          transition="all 0.2s"
                          _hover={{
                            borderColor: 'gray.300',
                            transform: 'translateY(-1px)',
                            boxShadow: 'sm',
                          }}
                        >
                          <Checkbox
                            isChecked={selectedRules.includes(rule.id)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              if (e.target.checked) {
                                setSelectedRules([...selectedRules, rule.id]);
                              } else {
                                setSelectedRules(selectedRules.filter((id) => id !== rule.id));
                              }
                            }}
                          >
                            <VStack spacing={1} align="start">
                                            <HStack>
                                              <Text fontWeight="600">{rule.name}</Text>
                                              <Badge 
                                                colorScheme={rule.is_active ? 'green' : 'gray'} 
                                                mb={2}
                                                bg={rule.is_active 
                                                  ? useColorModeValue('green.100', 'green.500') 
                                                  : useColorModeValue('gray.100', 'gray.600')
                                                }
                                                color={rule.is_active 
                                                  ? useColorModeValue('green.800', 'white') 
                                                  : useColorModeValue('gray.800', 'white')
                                                }
                                              >
                                                {rule.is_active ? 'Active' : 'Inactive'}
                                              </Badge>
                                            </HStack>
                                            <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                                          </VStack>
                                        </Checkbox>
                                      </Box>
                                    ))}
                                </VStack>
                              </Box>
                            )}
                          </Box>
                        )}
                        
                        {/* Inactive Rules Section */}
                        {filteredRules.filter(r => !r.is_active).length > 0 && (
                          <Box mt={4}>
                            <Heading size="sm" py={2} px={4} bg="gray.200" color="gray.700" borderRadius="md">
                              Inactive Rules
                            </Heading>
                            
                            {/* Group inactive rules by column */}
                            {(() => {
                              // Get unique columns from inactive rules
                              const columns = [...new Set(filteredRules
                                .filter(r => !r.is_active)
                                .map(r => r.expectation_config?.kwargs?.column)
                                .filter(Boolean))];
                              
                              return columns.map(column => (
                                <Box key={`inactive-${column}`} mt={3}>
                                  <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                                    Column: {column}
                                  </Text>
                                  <VStack spacing={2} mt={2} align="stretch">
                                    {filteredRules
                                      .filter(r => !r.is_active && r.expectation_config?.kwargs?.column === column)
                                      .map(rule => (
                                        <Box
                                          key={rule.id}
                                          bg="white"
                                          p={3}
                                          borderRadius="md"
                                          borderWidth="1px"
                                          borderColor="gray.200"
                                          opacity={0.7}
                                          transition="all 0.2s"
                                          _hover={{
                                            borderColor: 'gray.300',
                                            transform: 'translateY(-1px)',
                                            boxShadow: 'sm',
                                          }}
                                        >
                                          <Checkbox
                                            isChecked={selectedRules.includes(rule.id)}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                              if (e.target.checked) {
                                                setSelectedRules([...selectedRules, rule.id]);
                                              } else {
                                                setSelectedRules(selectedRules.filter((id) => id !== rule.id));
                                              }
                                            }}
                                          >
                                            <VStack spacing={1} align="start">
                                              <HStack>
                                                <Text fontWeight="600">{rule.name}</Text>
                                                <Badge 
                                                  colorScheme={rule.is_active ? 'green' : 'gray'} 
                                                  mb={2}
                                                  bg={rule.is_active 
                                                    ? useColorModeValue('green.100', 'green.500') 
                                                    : useColorModeValue('gray.100', 'gray.600')
                                                  }
                                                  color={rule.is_active 
                                                    ? useColorModeValue('green.800', 'white') 
                                                    : useColorModeValue('gray.800', 'white')
                                                  }
                                                >
                                                  {rule.is_active ? 'Active' : 'Inactive'}
                                                </Badge>
                                              </HStack>
                                              <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                                            </VStack>
                                          </Checkbox>
                                        </Box>
                                      ))}
                                  </VStack>
                                </Box>
                              ));
                            })()}
                            
                            {/* Handle inactive rules without column property */}
                            {filteredRules.filter(r => !r.is_active && !r.expectation_config?.kwargs?.column).length > 0 && (
                              <Box mt={3}>
                                <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                                  Table-Level Rules
                                </Text>
                                <VStack spacing={2} mt={2} align="stretch">
                                  {filteredRules
                                    .filter(r => !r.is_active && !r.expectation_config?.kwargs?.column)
                                    .map(rule => (
                                      <Box
                                        key={rule.id}
                                        bg="white"
                                        p={3}
                                        borderRadius="md"
                                        borderWidth="1px"
                                        borderColor="gray.200"
                                        opacity={0.7}
                                        transition="all 0.2s"
                                        _hover={{
                                          borderColor: 'gray.300',
                                          transform: 'translateY(-1px)',
                                          boxShadow: 'sm',
                                        }}
                                      >
                                        <Checkbox
                                          isChecked={selectedRules.includes(rule.id)}
                                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            if (e.target.checked) {
                                              setSelectedRules([...selectedRules, rule.id]);
                                            } else {
                                              setSelectedRules(selectedRules.filter((id) => id !== rule.id));
                                            }
                                          }}
                                        >
                                          <VStack spacing={1} align="start">
                                            <HStack>
                              <Text fontWeight="600">{rule.name}</Text>
                                              <Badge 
                                                colorScheme={rule.is_active ? 'green' : 'gray'} 
                                                mb={2}
                                                bg={rule.is_active 
                                                  ? useColorModeValue('green.100', 'green.500') 
                                                  : useColorModeValue('gray.100', 'gray.600')
                                                }
                                                color={rule.is_active 
                                                  ? useColorModeValue('green.800', 'white') 
                                                  : useColorModeValue('gray.800', 'white')
                                                }
                                              >
                                                {rule.is_active ? 'Active' : 'Inactive'}
                                              </Badge>
                                            </HStack>
                              <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                            </VStack>
                          </Checkbox>
                        </Box>
                      ))}
                  </VStack>
                              </Box>
                            )}
                          </Box>
                        )}
                      </VStack>
                    ) : (
                      <Box p={8} textAlign="center">
                        <Text>No rules found for this table</Text>
                        <Link href={`/tables/${selectedTableId}`} passHref>
                          <Button as="a" size="sm" colorScheme="blue" mt={4}>
                            Create Rules for {selectedTable}
                          </Button>
                        </Link>
                      </Box>
                    )
                  ) : (
                    <Box p={8} textAlign="center">
                      <Text>Please select a table to view its rules</Text>
                    </Box>
                  )}
                </Box>
              </FormControl>

              <VStack spacing={4} align="stretch" width="100%">
                <Button
                  colorScheme="blue"
                  isDisabled={true}
                  width="100%"
                  bg={useColorModeValue('blue.600', 'blue.400')}
                  color={useColorModeValue('white', 'black')}
                  _hover={{ bg: useColorModeValue('blue.700', 'blue.500') }}
                >
                  Select a Table First
                </Button>

              <Button
                  colorScheme="blue"
                size="lg"
                  isLoading={running}
                  loadingText="Running..."
                onClick={runQualityCheck}
                  isDisabled={selectedRules.length === 0}
                  width="100%"
                  bg={useColorModeValue('blue.600', 'blue.400')}
                  color={useColorModeValue('white', 'black')}
                  _hover={{ bg: useColorModeValue('blue.700', 'blue.500') }}
                >
                  Run Quality Check
                </Button>

                {selectedRules.length > 0 && selectedTable && tables.find(t => t.name === selectedTable) && (
                  <Link 
                    href={`/quality/report?tableName=${selectedTable}&tableId=${tables.find(t => t.name === selectedTable)?.id}&ruleIds=${selectedRules.join(',')}`}
                    passHref
                  >
                    <Button
                      as="a"
                      colorScheme="purple"
                      variant="outline"
                      width="100%"
                h="50px"
                fontSize="md"
              >
                      View Detailed Report
              </Button>
                  </Link>
                )}
              </VStack>
            </VStack>
          </CardBody>
        </Card>

        {results.length > 0 && (
          <VStack spacing={6} alignItems="stretch">
            <Box pb={3} borderBottom="2px" borderColor="gray.200">
              <Heading size="md">Validation Results for {selectedTable}</Heading>
            </Box>
            
            {results.map((result) => {
              const rule = filteredRules.find(r => r.id === result.rule_id);
              const isError = result.status === "ERROR";
              
              const statusBadgeColors: {
                [key: string]: { bg: string; color: string; scheme: string; }
              } = {
                SUCCESS: {
                  bg: useColorModeValue('green.100', 'green.500'),
                  color: useColorModeValue('green.800', 'white'),
                  scheme: 'green'
                },
                FAILURE: {
                  bg: useColorModeValue('red.100', 'red.500'),
                  color: useColorModeValue('red.800', 'white'),
                  scheme: 'red'
                },
                ERROR: {
                  bg: useColorModeValue('orange.100', 'orange.500'),
                  color: useColorModeValue('orange.800', 'white'),
                  scheme: 'orange'
                },
                FAIL: {
                  bg: useColorModeValue('red.100', 'red.500'),
                  color: useColorModeValue('red.800', 'white'),
                  scheme: 'red'
                }
              };
              
              return (
                <Card key={result.rule_id}>
                <CardBody p={6}>
                  <VStack spacing={6} alignItems="stretch" divider={<Divider />}>
                    <Box>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                        <Box>
                          <Heading size="sm" mb={2}>
                              {rule?.name || `Rule #${result.rule_id}`}
                          </Heading>
                          <Text variant="secondary" fontSize="sm">
                              {rule?.description || "No description available"}
                          </Text>
                        </Box>
                        <Badge
                            colorScheme={statusBadgeColors[result.status] ? statusBadgeColors[result.status].scheme : statusBadgeColors['ERROR'].scheme}
                            bg={statusBadgeColors[result.status] ? statusBadgeColors[result.status].bg : statusBadgeColors['ERROR'].bg}
                            color={statusBadgeColors[result.status] ? statusBadgeColors[result.status].color : statusBadgeColors['ERROR'].color}
                            fontSize="sm"
                            px={2}
                            py={1}
                            borderRadius="md"
                        >
                          {result.status}
                        </Badge>
                      </Box>
                    </Box>

                      {isError ? (
                        <Box bg="orange.50" p={5} borderRadius="lg" borderWidth="1px" borderColor="orange.200">
                          <Text fontWeight="600" mb={4} color="orange.700">Error Details</Text>
                          <Text color="orange.800" fontFamily="mono" whiteSpace="pre-wrap">
                            {result.error_details || 'No detailed error information available'}
                          </Text>
                          {result.result_metadata?.error && (
                            <Box mt={3} p={3} bg="orange.100" borderRadius="md">
                              <Text fontWeight="500" color="orange.800">
                                {result.result_metadata.error}
                              </Text>
                            </Box>
                          )}
                        </Box>
                      ) : (
                    <Box bg="gray.50" p={5} borderRadius="lg" borderWidth="1px" borderColor="gray.200">
                      <Text fontWeight="600" mb={4}>Validation Metrics</Text>
                      <VStack spacing={4} alignItems="stretch">
                        <Box>
                          <Text fontSize="sm" color="gray.600" mb={1}>Success Rate</Text>
                          <Text 
                            fontSize="2xl" 
                            fontWeight="600"
                            color={
                              (result.total_records === 0) ? "gray.500" :
                              ((result.total_records - result.failure_count) / result.total_records * 100) >= 95 ? "green.500" :
                              ((result.total_records - result.failure_count) / result.total_records * 100) >= 80 ? "orange.500" : 
                              "red.500"
                            }
                          >
                            {(result.total_records === 0) 
                              ? "N/A" 
                              : (100 - (result.failure_count / result.total_records * 100)).toFixed(1)}
                            {(result.total_records > 0) && "%"}
                          </Text>
                        </Box>
                        
                        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={4}>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={1}>Failed Records</Text>
                            <Text fontSize="xl" fontWeight="600" color="red.500">
                              {result.failure_count.toLocaleString()}
                            </Text>
                          </Box>
                          <Box>
                            <Text fontSize="sm" color="gray.600" mb={1}>Total Records</Text>
                            <Text fontSize="xl" fontWeight="600">
                              {result.total_records.toLocaleString()}
                            </Text>
                          </Box>
                        </Box>
                      </VStack>
                    </Box>
                      )}

                      {!isError && result.result_metadata?.column && (
                      <Box mt={4}>
                        <Text fontWeight="600" mb={3}>Column Results</Text>
                        <Box overflowX="auto">
                          <Box as="table" width="100%" fontSize="sm" style={{ borderCollapse: 'collapse' }}>
                            <Box as="thead" bg="gray.100">
                              <Box as="tr">
                                <Box as="th" py={2} px={3} textAlign="left">Column</Box>
                                <Box as="th" py={2} px={3} textAlign="left">Status</Box>
                                <Box as="th" py={2} px={3} textAlign="left">Success Rate</Box>
                                <Box as="th" py={2} px={3} textAlign="left">Failed Records</Box>
                                <Box as="th" py={2} px={3} textAlign="left">Total Records</Box>
                              </Box>
                            </Box>
                            <Box as="tbody">
                              <Box as="tr" borderTop="1px solid" borderColor="gray.200">
                                <Box as="td" py={2} px={3}>{result.result_metadata.column}</Box>
                                <Box as="td" py={2} px={3}>
                                  <Badge
                                    colorScheme={result.status === 'SUCCESS' ? 'green' : 'red'}
                                    size="sm"
                                  >
                                    {result.status}
                                  </Badge>
                                </Box>
                                <Box as="td" py={2} px={3}>
                                  {(result.total_records === 0) 
                                    ? "N/A" 
                                    : (100 - (result.failure_count / result.total_records * 100)).toFixed(1) + "%"}
                                </Box>
                                <Box as="td" py={2} px={3}>{result.failure_count.toLocaleString()}</Box>
                                <Box as="td" py={2} px={3}>{result.total_records.toLocaleString()}</Box>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Box>
                    )}

                    {!isError && result.result_metadata?.partial_unexpected_list && result.result_metadata.partial_unexpected_list.length > 0 && (
                      <Box mt={4}>
                        <Text fontWeight="600" mb={3}>Failed Values Sample</Text>
                        <Box
                          bg="gray.50"
                          p={5}
                          borderRadius="lg"
                          fontSize="sm"
                          fontFamily="mono"
                          overflowX="auto"
                          borderWidth="1px"
                          borderColor="gray.200"
                          whiteSpace="pre"
                          sx={{
                            '&::-webkit-scrollbar': {
                              height: '8px',
                              borderRadius: '8px',
                              backgroundColor: 'gray.100',
                            },
                            '&::-webkit-scrollbar-thumb': {
                              backgroundColor: 'gray.300',
                              borderRadius: '8px',
                            },
                          }}
                        >
                          {JSON.stringify(result.result_metadata.partial_unexpected_list, null, 2)}
                        </Box>
                      </Box>
                    )}

                    {!isError && result.result_metadata?.validation_details && 
                      result.result_metadata.validation_details.some(detail => 
                        detail.unexpected_rows && detail.unexpected_rows.length > 0
                      ) && (
                      <Box mt={4}>
                        <Text fontWeight="600" mb={3}>Failed Records</Text>
                        {result.result_metadata.validation_details
                          .filter(detail => detail.unexpected_rows && detail.unexpected_rows.length > 0)
                          .map((detail, idx) => (
                            <Box key={idx} mb={4}>
                              <Text fontSize="sm" fontWeight="600">{detail.column || "Unknown Column"}</Text>
                              <Box
                                bg="gray.50"
                                p={5}
                                borderRadius="lg"
                                fontSize="sm"
                                fontFamily="mono"
                                overflowX="auto"
                                borderWidth="1px"
                                borderColor="gray.200"
                                whiteSpace="pre"
                                sx={{
                                  '&::-webkit-scrollbar': {
                                    height: '8px',
                                    borderRadius: '8px',
                                    backgroundColor: 'gray.100',
                                  },
                                  '&::-webkit-scrollbar-thumb': {
                                    backgroundColor: 'gray.300',
                                    borderRadius: '8px',
                                  },
                                }}
                              >
                                {JSON.stringify(detail.unexpected_rows, null, 2)}
                              </Box>
                            </Box>
                          ))}
                      </Box>
                    )}

                    {!isError && result.failure_count > 0 && 
                      !result.result_metadata?.partial_unexpected_list?.length && 
                      !result.result_metadata?.validation_details?.some(detail => 
                        detail.unexpected_rows && detail.unexpected_rows.length > 0
                      ) && (
                      <Box mt={4} p={4} bg="gray.50" borderRadius="md" borderLeft="4px" borderColor="orange.500">
                        <Text fontWeight="600" mb={1}>No Individual Record Details Available</Text>
                        <Text fontSize="sm">
                          The quality check identified {result.failure_count} failed records, but detailed information about individual records is not available. 
                          This may occur with certain validation types or when the data volume is large.
                        </Text>
                        <Button mt={3} size="sm" colorScheme="blue" variant="outline" onClick={() => window.open(`/quality/explore?ruleId=${result.rule_id}`, '_blank')}>
                          Explore Data
                        </Button>
                      </Box>
                    )}
                  </VStack>
                </CardBody>
              </Card>
              );
            })}

            {results && results.length > 0 && (
              <Box mt={6}>
                {selectedTable && selectedRules.length > 0 && selectedTableId && (
                  <Link 
                    href={`/quality/report?tableName=${selectedTable}&tableId=${selectedTableId}&ruleIds=${selectedRules.join(',')}`}
                    passHref
                  >
                    <Button
                      as="a"
                      colorScheme="purple"
                      size="md"
                    >
                      View Detailed Report
                    </Button>
                  </Link>
                )}
              </Box>
            )}
          </VStack>
        )}
      </VStack>
    </Container>
  );
} 