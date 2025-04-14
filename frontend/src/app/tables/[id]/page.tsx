'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  Spinner,
  Card,
  CardBody,
  SimpleGrid,
  Badge,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Divider,
  IconButton,
  useColorModeValue,
  Button,
  useToast,
  Tooltip,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tab,
  FormControl,
  FormLabel,
  Textarea,
  UnorderedList,
  ListItem,
  Icon
} from '@chakra-ui/react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FiToggleLeft, FiToggleRight, FiArchive, FiTrash2, FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  primary_key: boolean;
}

interface TableData {
  id: number;
  name: string;
  schema: string;
  description: string;
  created_at: string;
  updated_at: string;
  columns: Column[];
  row_count: number;
  processedColumns?: Column[];
}

interface Rule {
  id: number;
  name: string;
  description: string;
  table_id: number;
  is_active: boolean;
  rule_type: string;
  rule_column?: string;
  expectation_config: any;
  created_at?: string;
  updated_at?: string;
  archived_at?: string;  // For archived rules
}

interface HistoryEntry {
  id: number;
  timestamp: string;
  action: string;
  details: string;
  status: 'success' | 'error' | 'info';
  user?: string;
}

export default function TableDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tableId = params.id;
  
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [archivedRules, setArchivedRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ruleDescription, setRuleDescription] = useState("");
  const [generatingRule, setGeneratingRule] = useState(false);
  const toast = useToast();
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const accentColor = 'blue.500';
  
  useEffect(() => {
    const fetchTableDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch table metadata
        const tableResponse = await fetch(`http://localhost:8000/api/tables/${tableId}`);
        
        if (!tableResponse.ok) {
          throw new Error('Failed to fetch table details');
        }
        
        const tableData = await tableResponse.json();
        console.log('Table data received:', tableData);
        console.log('Columns type:', typeof tableData.columns, Array.isArray(tableData.columns));
        
        // Process columns based on format
        if (tableData.columns) {
          if (Array.isArray(tableData.columns)) {
            // Format is already an array, use it directly
            tableData.processedColumns = tableData.columns;
          } else if (typeof tableData.columns === 'object') {
            // Format is an object with column names as keys, convert to array
            tableData.processedColumns = Object.entries(tableData.columns).map(([name, details]) => ({
              name,
              ...(details as any)
            }));
          } else {
            tableData.processedColumns = [];
          }
        } else {
          tableData.processedColumns = [];
        }
        
        setTableData(tableData);
        
        // Fetch sample data
        const sampleResponse = await fetch(`http://localhost:8000/api/tables/${tableId}/sample`);
        
        if (!sampleResponse.ok) {
          // Just show a warning, don't throw error
          toast({
            title: "Warning",
            description: "Could not fetch sample data",
            status: "warning",
            duration: 3000,
            isClosable: true,
          });
        } else {
          const sampleData = await sampleResponse.json();
          setSampleData(sampleData.slice(0, 10)); // Limit to 10 rows
        }
        
        // Fetch rules for this table
        const rulesResponse = await fetch(`http://localhost:8000/api/rules/table_id/${tableId}`);
        
        if (rulesResponse.ok) {
          const rulesData = await rulesResponse.json();
          setRules(rulesData);
        }
        
        // Fetch archived rules for this table
        const archivedRulesResponse = await fetch(`http://localhost:8000/api/rules/archived/table_id/${tableId}`);
        
        if (archivedRulesResponse.ok) {
          const archivedRulesData = await archivedRulesResponse.json();
          setArchivedRules(archivedRulesData);
        }
        
        // Temporarily populate history with dummy data
        // In a real application, you would fetch this from the backend
        setHistoryEntries([
          {
            id: 1,
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            action: 'Schema Update',
            details: 'Added column "last_updated_by"',
            status: 'success'
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 7200000).toISOString(), 
            action: 'Rule Created',
            details: 'Created not-null validation rule for email column',
            status: 'success'
          },
          {
            id: 3,
            timestamp: new Date(Date.now() - 86400000).toISOString(),
            action: 'Data Import',
            details: 'Imported 500 records',
            status: 'success'
          },
          {
            id: 4,
            timestamp: new Date(Date.now() - 172800000).toISOString(),
            action: 'Quality Check',
            details: 'Found 3 validation errors',
            status: 'error'
          }
        ]);
        
      } catch (err) {
        console.error('Error fetching table details:', err);
        setError('Failed to load table details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (tableId) {
      fetchTableDetails();
    }
  }, [tableId, toast]);
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };
  
  const handleGenerateRule = async () => {
    if (!ruleDescription || !tableData) {
      toast({
        title: 'Error',
        description: 'Please provide a rule description',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setGeneratingRule(true);
    try {
      const response = await fetch('http://localhost:8000/api/rules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table_name: tableData.name,
          description: ruleDescription,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate rule');
      
      const newRule = await response.json();
      setRules([...rules, newRule]);
      setRuleDescription('');
      
      toast({
        title: 'Success',
        description: 'Rule generated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to generate rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    } finally {
      setGeneratingRule(false);
    }
  };
  
  const handleToggleRule = async (rule: Rule) => {
    try {
      const response = await fetch(`http://localhost:8000/api/rules/${rule.id}/toggle`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to toggle rule status');
      }

      const updatedRules = rules.map(r => {
        if (r.id === rule.id) {
          return { ...r, is_active: !r.is_active };
        }
        return r;
      });

      setRules(updatedRules);

      toast({
        title: 'Success',
        description: `Rule ${rule.is_active ? 'deactivated' : 'activated'} successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to toggle rule status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    }
  };
  
  const handleDeleteRule = async (rule: Rule) => {
    if (!window.confirm(`Are you sure you want to delete the rule: ${rule.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/rules/${rule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete rule');
      }

      // Remove the rule from the rules list
      const updatedRules = rules.filter(r => r.id !== rule.id);
      setRules(updatedRules);

      toast({
        title: 'Success',
        description: 'Rule deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    }
  };
  
  const handleArchiveRule = async (rule: Rule) => {
    if (!window.confirm(`Are you sure you want to archive the rule: ${rule.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/rules/${rule.id}/archive`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to archive rule');
      }

      // Remove the rule from the rules list
      const updatedRules = rules.filter(r => r.id !== rule.id);
      setRules(updatedRules);

      // Refresh archived rules
      const archivedRulesResponse = await fetch(`http://localhost:8000/api/rules/archived/table_id/${tableId}`);
      if (archivedRulesResponse.ok) {
        const archivedRulesData = await archivedRulesResponse.json();
        setArchivedRules(archivedRulesData);
      }

      toast({
        title: 'Success',
        description: 'Rule archived successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to archive rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    }
  };
  
  const handleRestoreRule = async (rule: Rule) => {
    try {
      const response = await fetch(`http://localhost:8000/api/rules/archived/${rule.id}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to restore rule');
      }

      const restoredRule = await response.json();
      
      // Add the restored rule to active rules
      setRules([...rules, restoredRule]);
      
      // Remove from archived rules
      const updatedArchivedRules = archivedRules.filter(r => r.id !== rule.id);
      setArchivedRules(updatedArchivedRules);

      toast({
        title: 'Success',
        description: 'Rule restored successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to restore rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    }
  };
  
  const handleDeleteArchivedRule = async (rule: Rule) => {
    if (!window.confirm(`Are you sure you want to permanently delete the archived rule: ${rule.name}?`)) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8000/api/rules/archived/${rule.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete archived rule');
      }

      // Remove from archived rules
      const updatedArchivedRules = archivedRules.filter(r => r.id !== rule.id);
      setArchivedRules(updatedArchivedRules);

      toast({
        title: 'Success',
        description: 'Archived rule permanently deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete archived rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    }
  };
  
  if (loading) {
    return (
      <Flex justifyContent="center" alignItems="center" minH="80vh">
        <Spinner
          thickness="4px"
          speed="0.65s"
          emptyColor="gray.200"
          color="blue.500"
          size="xl"
        />
      </Flex>
    );
  }
  
  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box bg="red.50" p={4} borderRadius="md" color="red.500">
          {error}
        </Box>
      </Container>
    );
  }
  
  if (!tableData) {
    return (
      <Container maxW="container.xl" py={8}>
        <Box bg="orange.50" p={4} borderRadius="md" color="orange.500">
          Table not found
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        {/* Breadcrumb */}
        <Breadcrumb>
          <BreadcrumbItem>
            <BreadcrumbLink as={Link} href="/tables">
              Tables
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>{tableData.name}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        
        {/* Header with Table Info */}
        <Card
          bg={cardBg} 
          borderWidth="1px" 
          borderColor={borderColor}
          borderRadius="lg" 
          shadow="md"
          overflow="hidden"
        >
          <CardBody>
            <VStack align="stretch" spacing={4}>
              <Flex justifyContent="space-between" alignItems="flex-start">
                <VStack align="flex-start" spacing={1}>
                  <HStack>
                    <Heading size="lg">{tableData.name}</Heading>
                    <Badge colorScheme="purple" fontSize="md">{tableData.schema}</Badge>
                  </HStack>
                  {tableData.description && (
                    <Text color="gray.600">{tableData.description}</Text>
                  )}
                </VStack>
                
                <HStack>
                  <Link href={`/quality?tableId=${tableData.id}&tableName=${tableData.name}`} passHref>
                    <Button 
                      as="a" 
                      colorScheme="green" 
                      leftIcon={<span>✓</span>}
                    >
                      Quality Check
                    </Button>
                  </Link>
                </HStack>
              </Flex>
              
              <Divider />
              
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <Stat>
                  <StatLabel>Row Count</StatLabel>
                  <StatNumber>{tableData.row_count || 'Unknown'}</StatNumber>
                </Stat>
                
                <Stat>
                  <StatLabel>Columns</StatLabel>
                  <StatNumber>{tableData.columns?.length || 0}</StatNumber>
                </Stat>
                
                <Stat>
                  <StatLabel>Created</StatLabel>
                  <StatNumber>{formatDate(tableData.created_at)}</StatNumber>
                </Stat>
              </SimpleGrid>
            </VStack>
          </CardBody>
        </Card>
        
        {/* Table Details in Tabs */}
        <Tabs variant="enclosed" colorScheme="blue" isLazy>
          <TabList>
            <Tab>Columns</Tab>
            <Tab>Sample Data</Tab>
            <Tab>{tableData.name} Rules ({rules.length})</Tab>
            <Tab>Create {tableData.name} Rule</Tab>
            <Tab>Archived Rules ({archivedRules.length})</Tab>
            <Tab>History</Tab>
          </TabList>
          
          <TabPanels>
            {/* Columns Tab */}
            <TabPanel>
              {tableData.processedColumns && Array.isArray(tableData.processedColumns) && tableData.processedColumns.length > 0 ? (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Column</Th>
                        <Th>Type</Th>
                        <Th>Nullable</Th>
                        <Th>Default</Th>
                        <Th>Primary Key</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {tableData.processedColumns.map((column, idx) => (
                        <Tr key={idx}>
                          <Td fontWeight="medium">{column.name}</Td>
                          <Td>
                            <Badge 
                              colorScheme={
                                column.type && column.type.toString().includes('VARCHAR') ? 'green' :
                                column.type && column.type.toString().includes('INT') ? 'blue' :
                                column.type && column.type.toString().includes('TIME') ? 'purple' :
                                column.type && column.type.toString().includes('DATE') ? 'orange' :
                                column.type && column.type.toString().includes('NUMERIC') ? 'cyan' :
                                'gray'
                              }
                              variant="subtle"
                            >
                              {column.type || 'Unknown'}
                            </Badge>
                          </Td>
                          <Td>{column.nullable !== undefined ? (column.nullable ? 'Yes' : 'No') : '-'}</Td>
                          <Td>{column.default || '-'}</Td>
                          <Td>{column.primary_key ? '✓' : ''}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg">No column information available</Text>
                  <Text fontSize="sm" color="gray.500" mt={2}>Try refreshing the tables from the Tables page</Text>
                </Box>
              )}
            </TabPanel>
            
            {/* Sample Data Tab */}
            <TabPanel>
              {sampleData && sampleData.length > 0 ? (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        {Object.keys(sampleData[0]).map((key) => (
                          <Th key={key}>{key}</Th>
                        ))}
                      </Tr>
                    </Thead>
                    <Tbody>
                      {sampleData.map((row, rowIdx) => (
                        <Tr key={rowIdx}>
                          {Object.entries(row).map(([key, value], cellIdx) => (
                            <Td key={`${rowIdx}-${cellIdx}`}>
                              {value === null ? 
                                <Text as="span" color="gray.400">NULL</Text> : 
                                String(value)
                              }
                            </Td>
                          ))}
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                  <Text fontSize="lg">No sample data available</Text>
                </Box>
              )}
            </TabPanel>
            
            {/* Rules Tab */}
            <TabPanel>
              <VStack align="stretch" spacing={4}>
                <Flex alignItems="center" justifyContent="space-between">
                  <Box>
                    <Heading size="md" mb={1}>Data Quality Rules for {tableData.name}</Heading>
                    <Text fontSize="sm" color="gray.600">
                      These rules are specifically designed to validate data in the {tableData.name} table
                    </Text>
                  </Box>
                  <Button 
                    colorScheme="blue" 
                    size="sm"
                    leftIcon={<span>+</span>}
                    onClick={() => document.querySelector('[role="tablist"]')?.children[3]?.dispatchEvent(new MouseEvent('click', {bubbles: true}))}
                  >
                    Add Rule
                  </Button>
                </Flex>

                {rules && rules.length > 0 ? (
                  <VStack align="stretch" spacing={4}>
                    {rules.map(rule => (
                      <Box 
                        key={rule.id} 
                        p={4} 
                        borderWidth="1px" 
                        borderRadius="md"
                        borderColor={borderColor}
                        transition="all 0.2s"
                        _hover={{ shadow: 'md' }}
                      >
                        <Flex justifyContent="space-between" alignItems="start">
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold">{rule.name}</Text>
                            {rule.description && (
                              <Text fontSize="sm" color="gray.600">
                                {rule.description}
                              </Text>
                            )}
                            <Text fontSize="sm" color="gray.500" mt={1}>
                              Type: <Badge>{rule.rule_type}</Badge>
                            </Text>
                          </VStack>
                          <HStack spacing={2}>
                            <Badge 
                              colorScheme={rule.is_active ? "green" : "gray"}
                              variant="subtle"
                              px={2}
                              py={1}
                              borderRadius="full"
                            >
                              {rule.is_active ? "Active" : "Inactive"}
                            </Badge>
                            <Tooltip label={rule.is_active ? "Deactivate Rule" : "Activate Rule"}>
                              <IconButton
                                aria-label={rule.is_active ? "Deactivate Rule" : "Activate Rule"}
                                icon={rule.is_active ? <FiToggleRight /> : <FiToggleLeft />}
                                size="sm"
                                colorScheme={rule.is_active ? "green" : "gray"}
                                variant="ghost"
                                onClick={() => handleToggleRule(rule)}
                              />
                            </Tooltip>
                            <Tooltip label="Archive Rule">
                              <IconButton
                                aria-label="Archive Rule"
                                icon={<FiArchive />}
                                size="sm"
                                colorScheme="purple"
                                variant="ghost"
                                onClick={() => handleArchiveRule(rule)}
                              />
                            </Tooltip>
                            <Tooltip label="Delete Rule">
                              <IconButton
                                aria-label="Delete Rule"
                                icon={<FiTrash2 />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleDeleteRule(rule)}
                              />
                            </Tooltip>
                          </HStack>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                    <Text fontSize="lg">No rules defined for this table</Text>
                    <Button 
                      mt={4} 
                      colorScheme="blue" 
                      size="sm"
                      onClick={() => router.push(`/rules?table=${tableData.id}`)}
                    >
                      Create Rules
                    </Button>
                  </Box>
                )}
              </VStack>
            </TabPanel>
            
            {/* Create Rule Tab */}
            <TabPanel>
              <Card>
                <CardBody>
                  <VStack spacing={6} align="stretch">
                    <Box>
                      <Heading size="md" mb={1}>Create Rule for {tableData.name}</Heading>
                      <Text fontSize="sm" color="gray.600">
                        Define a new quality rule that will be applied specifically to the {tableData.name} table
                      </Text>
                    </Box>
                    
                    <FormControl>
                      <FormLabel>Rule Description</FormLabel>
                      <Textarea
                        value={ruleDescription}
                        onChange={(e) => setRuleDescription(e.target.value)}
                        placeholder={`Describe a data quality rule for the ${tableData.name} table (e.g., '${Array.isArray(tableData.processedColumns) && tableData.processedColumns.length > 0 ? tableData.processedColumns[0].name : 'column'} should be at least 2 characters long')`}
                        size="lg"
                        rows={4}
                        resize="vertical"
                      />
                    </FormControl>

                    <Text fontSize="sm" color="gray.600">
                      Examples for the {tableData.name} table:
                      <UnorderedList mt={2} spacing={1}>
                        {/* First show some not null examples */}
                        {Array.isArray(tableData.processedColumns) && tableData.processedColumns.length > 0 ? (
                          <>
                            <ListItem>{tableData.processedColumns[0].name} should not be null</ListItem>
                            {tableData.processedColumns.length > 1 && 
                              <ListItem>{tableData.processedColumns[1].name} should be unique</ListItem>
                            }
                            {tableData.processedColumns.some(col => 
                              col.type && 
                              typeof col.type === 'string' && 
                              (col.type.includes('VARCHAR') || col.type.includes('TEXT'))) ? (
                              <ListItem>
                                {tableData.processedColumns.find(col => 
                                  col.type && 
                                  typeof col.type === 'string' && 
                                  (col.type.includes('VARCHAR') || col.type.includes('TEXT')))?.name} 
                                should be at least 3 characters long
                              </ListItem>
                            ) : (
                              <ListItem>Text fields should have minimum length requirements</ListItem>
                            )}
                          </>
                        ) : (
                          <>
                            <ListItem>Column values should not be null</ListItem>
                            <ListItem>Column values should be unique</ListItem>
                            <ListItem>Text columns should be at least 3 characters long</ListItem>
                          </>
                        )}
                      </UnorderedList>
                    </Text>

                    <Button
                      onClick={handleGenerateRule}
                      isLoading={generatingRule}
                      loadingText="Generating..."
                      colorScheme="blue"
                      size="lg"
                      isDisabled={!ruleDescription}
                    >
                      Generate Table-Specific Rule
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            </TabPanel>
            
            {/* Archived Rules Tab */}
            <TabPanel>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Heading size="md" mb={1}>Archived Rules for {tableData.name}</Heading>
                  <Text fontSize="sm" color="gray.600">
                    These rules have been archived and are no longer active on the {tableData.name} table
                  </Text>
                </Box>

                {archivedRules && archivedRules.length > 0 ? (
                  <VStack align="stretch" spacing={4}>
                    {archivedRules.map(rule => (
                      <Box 
                        key={rule.id} 
                        p={4} 
                        borderWidth="1px" 
                        borderRadius="md"
                        borderColor={borderColor}
                        transition="all 0.2s"
                        opacity={0.7}
                        bg="gray.50"
                      >
                        <Flex justifyContent="space-between" alignItems="start">
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="semibold">{rule.name}</Text>
                            {rule.description && (
                              <Text fontSize="sm" color="gray.600">
                                {rule.description}
                              </Text>
                            )}
                            <Text fontSize="sm" color="gray.500" mt={1}>
                              Type: <Badge>{rule.rule_type}</Badge>
                            </Text>
                            {rule.archived_at && (
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                Archived at: {new Date(rule.archived_at).toLocaleString()}
                              </Text>
                            )}
                          </VStack>
                          <HStack spacing={2}>
                            <Badge 
                              colorScheme="gray"
                              variant="subtle"
                              px={2}
                              py={1}
                              borderRadius="full"
                            >
                              Archived
                            </Badge>
                            <Tooltip label="Restore Rule">
                              <IconButton
                                aria-label="Restore Rule"
                                icon={<span>↩️</span>}
                                size="sm"
                                colorScheme="blue"
                                variant="ghost"
                                onClick={() => handleRestoreRule(rule)}
                              />
                            </Tooltip>
                            <Tooltip label="Delete Permanently">
                              <IconButton
                                aria-label="Delete Rule Permanently"
                                icon={<FiTrash2 />}
                                size="sm"
                                colorScheme="red"
                                variant="ghost"
                                onClick={() => handleDeleteArchivedRule(rule)}
                              />
                            </Tooltip>
                          </HStack>
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                    <Icon as={FiArchive} boxSize={10} color="gray.400" />
                    <Text fontSize="lg" mt={4}>No archived rules</Text>
                    <Text mt={2} color="gray.500">Archived rules will appear here</Text>
                  </Box>
                )}
              </VStack>
            </TabPanel>
            
            {/* History Tab */}
            <TabPanel>
              <VStack align="stretch" spacing={4}>
                <Box>
                  <Heading size="md" mb={1}>Table History</Heading>
                  <Text fontSize="sm" color="gray.600">
                    History of operations performed on the {tableData.name} table
                  </Text>
                </Box>

                {historyEntries && historyEntries.length > 0 ? (
                  <VStack align="stretch" spacing={4}>
                    {historyEntries.map(entry => (
                      <Box 
                        key={entry.id} 
                        p={4} 
                        borderWidth="1px" 
                        borderRadius="md"
                        borderColor={borderColor}
                        transition="all 0.2s"
                      >
                        <Flex justifyContent="space-between" alignItems="start">
                          <HStack spacing={3} align="start">
                            <Box>
                              <Icon 
                                as={entry.status === 'success' ? FiCheckCircle : entry.status === 'error' ? FiAlertCircle : FiClock} 
                                color={entry.status === 'success' ? 'green.500' : entry.status === 'error' ? 'red.500' : 'blue.500'} 
                                boxSize={5} 
                                mt={1}
                              />
                            </Box>
                            <VStack align="start" spacing={0}>
                              <HStack>
                                <Text fontWeight="semibold">{entry.action}</Text>
                                <Badge 
                                  colorScheme={entry.status === 'success' ? 'green' : entry.status === 'error' ? 'red' : 'blue'}
                                  variant="subtle"
                                >
                                  {entry.status}
                                </Badge>
                              </HStack>
                              <Text fontSize="sm" color="gray.600">
                                {entry.details}
                              </Text>
                              <Text fontSize="xs" color="gray.500" mt={1}>
                                {new Date(entry.timestamp).toLocaleString()}
                              </Text>
                            </VStack>
                          </HStack>
                          {entry.user && (
                            <Text fontSize="sm" color="gray.500">
                              By: {entry.user}
                            </Text>
                          )}
                        </Flex>
                      </Box>
                    ))}
                  </VStack>
                ) : (
                  <Box textAlign="center" p={8} bg="gray.50" borderRadius="md">
                    <Icon as={FiClock} boxSize={10} color="gray.400" />
                    <Text fontSize="lg" mt={4}>No history available</Text>
                    <Text mt={2} color="gray.500">Table operations will be recorded here</Text>
                  </Box>
                )}
              </VStack>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </VStack>
    </Container>
  );
} 