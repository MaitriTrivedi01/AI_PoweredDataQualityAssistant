'use client';

import { useState, useEffect } from 'react';
import {
  Container,
  Heading,
  Text,
  VStack,
  Box,
  Button,
  Flex,
  TabList,
  Tabs,
  Tab,
  TabPanels,
  TabPanel,
  Card,
  CardBody,
  SimpleGrid,
  Badge,
  useColorModeValue,
  Icon,
  HStack,
  Divider,
  Link,
  useToast,
  Spinner,
  Stack,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { FiDatabase, FiRefreshCw, FiTable, FiInfo } from 'react-icons/fi';
import { useSearchParams } from 'next/navigation';

interface Table {
  id: number;
  name: string;
  schema: string;
  description: string;
  database_id: number;
  created_at?: string;
  updated_at?: string;
  columns?: any[];
}

interface Database {
  id: number;
  name: string;
  host?: string;
  port?: number;
  username?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
  connection_string?: string;
}

// Add a helper function to get column count
function getColumnCount(table) {
  if (!table.columns) return 0;
  
  if (Array.isArray(table.columns)) {
    return table.columns.length;
  } else if (typeof table.columns === 'object') {
    return Object.keys(table.columns).length;
  }
  
  return 0;
}

export default function TablesPage() {
  const searchParams = useSearchParams();
  const databaseIdParam = searchParams.get('database_id');
  
  const [tables, setTables] = useState<Table[]>([]);
  const [filteredTables, setFilteredTables] = useState<Table[]>([]);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const cardBg = useColorModeValue('white', 'gray.800');
  const toast = useToast();

  // Set tab index based on database_id param
  useEffect(() => {
    if (databaseIdParam && databases.length > 0) {
      const index = databases.findIndex(db => db.id === parseInt(databaseIdParam));
      if (index !== -1) {
        setTabIndex(index);
      }
    }
  }, [databaseIdParam, databases]);

  // Fetch databases
  const fetchDatabases = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/databases');
      if (!response.ok) {
        throw new Error('Failed to fetch databases');
      }
      const data = await response.json();
      setDatabases(data);
    } catch (err) {
      setError('Failed to fetch databases. Please try again later.');
      console.error('Error fetching databases:', err);
    }
  };

  // Fetch all tables
  const fetchTables = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // If we have a database_id, filter by it
      let url = 'http://localhost:8000/api/tables';
      if (databaseIdParam) {
        url += `?database_id=${databaseIdParam}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch tables');
      }
      
      const data = await response.json();
      setTables(data);
      
      // Initial filtering based on selected database
      if (databases.length > 0) {
        // Use the current tabIndex to get the selected database
        const selectedDatabaseId = databases[tabIndex]?.id;
        if (selectedDatabaseId) {
          const filtered = data.filter(table => 
            table.database_id === selectedDatabaseId
          );
          setFilteredTables(filtered);
        } else {
          setFilteredTables(data);
        }
      } else {
        setFilteredTables(data);
      }
    } catch (err) {
      setError('Failed to fetch tables. Please try again later.');
      console.error('Error fetching tables:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter tables when tab changes
  useEffect(() => {
    if (databases.length > 0 && tables.length > 0) {
      const selectedDatabaseId = databases[tabIndex]?.id;
      const filtered = tables.filter(table => 
        table.database_id === selectedDatabaseId
      );
      setFilteredTables(filtered);
    }
  }, [tabIndex, databases, tables]);

  // Fetch data on component mount
  useEffect(() => {
    fetchDatabases();
    fetchTables();
  }, [databaseIdParam]);

  // Refresh handler
  const handleRefresh = () => {
    fetchDatabases();
    fetchTables();
  };

  if (isLoading && !tables.length) {
    return (
      <Container maxW="container.xl" py={8}>
        <Flex direction="column" alignItems="center" justifyContent="center" minH="60vh">
          <Spinner size="xl" color="blue.500" thickness="4px" speed="0.65s" />
          <Text mt={4} fontSize="lg">Loading tables...</Text>
        </Flex>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box pb={4} borderBottom="2px" borderColor="gray.200">
          <Flex justifyContent="space-between" alignItems="center">
            <Box>
              <Heading size="lg">Database Tables</Heading>
              <Text color="gray.600" mt={2}>
                View and manage tables from all databases
              </Text>
            </Box>
            <Button 
              leftIcon={<FiRefreshCw />} 
              colorScheme="blue" 
              variant="outline"
              onClick={handleRefresh}
              isLoading={isLoading}
            >
              Refresh
            </Button>
          </Flex>
        </Box>

        {error && (
          <Alert status="error" mb={4}>
            <AlertIcon />
            {error}
          </Alert>
        )}
        
        {databases.length === 0 ? (
          <Card textAlign="center" p={6}>
            <VStack spacing={4}>
              <Icon as={FiDatabase} w={12} h={12} color="gray.400" />
              <Heading size="md">No Databases Found</Heading>
              <Text>Start by adding a database connection</Text>
              <Link as={NextLink} href="/databases">
                <Button colorScheme="blue">Add Database</Button>
              </Link>
            </VStack>
          </Card>
        ) : (
          <Tabs onChange={(index) => setTabIndex(index)} colorScheme="blue" variant="enclosed">
            <TabList mb="1em" overflowX="auto" whiteSpace="nowrap">
              {databases.map((database, idx) => (
                <Tab key={database.id} fontWeight={tabIndex === idx ? "semibold" : "normal"}>
                  <HStack>
                    <Icon as={FiDatabase} color={database.connection_string ? "green.500" : "red.500"} />
                    <Text>{database.name}</Text>
                    <Badge ml={2} colorScheme={database.connection_string ? "green" : "red"} variant="solid" borderRadius="full">
                      {tables.filter(t => t.database_id === database.id).length || 0}
                    </Badge>
                  </HStack>
                </Tab>
              ))}
            </TabList>
            
            <TabPanels>
              {databases.map(database => (
                <TabPanel key={database.id} p={0}>
                  <VStack align="stretch" spacing={4}>
                    <Flex alignItems="center" mb={2}>
                      <Heading size="md" mr={2}>Tables in {database.name}</Heading>
                      {database.description && (
                        <Badge colorScheme="blue" variant="subtle" fontSize="sm">
                          {database.description}
                        </Badge>
                      )}
                    </Flex>
                    
                    {filteredTables.filter(t => t.database_id === database.id).length > 0 ? (
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                        {filteredTables
                          .filter(table => table.database_id === database.id)
                          .map(table => (
                            <Card 
                              key={table.id} 
                              bg={cardBg} 
                              shadow="md" 
                              borderRadius="lg" 
                              overflow="hidden"
                              transition="transform 0.2s"
                              _hover={{ transform: 'translateY(-5px)', shadow: 'lg' }}
                            >
                              <CardBody>
                                <VStack align="stretch" spacing={3}>
                                  <HStack>
                                    <Icon as={FiTable} color="blue.500" w={5} h={5} />
                                    <Heading size="md" isTruncated>{table.name}</Heading>
                                  </HStack>
                                  
                                  {table.description && (
                                    <Text color="gray.600" fontSize="sm" noOfLines={2}>
                                      {table.description}
                                    </Text>
                                  )}
                                  
                                  <Divider />
                                  
                                  <HStack justify="space-between">
                                    <HStack>
                                      <Icon as={FiInfo} color="gray.500" w={4} h={4} />
                                      <Text fontSize="sm" color="gray.500">
                                        {getColumnCount(table)} columns
                                      </Text>
                                    </HStack>
                                    <Link as={NextLink} href={`/tables/${table.id}`} color="blue.500" fontWeight="medium">
                                      View Details
                                    </Link>
                                  </HStack>
                                </VStack>
                              </CardBody>
                            </Card>
                          ))}
                      </SimpleGrid>
                    ) : (
                      <Box 
                        bg={useColorModeValue('gray.50', 'gray.700')} 
                        borderRadius="md" 
                        p={6} 
                        textAlign="center"
                      >
                        <Icon as={FiTable} w={10} h={10} color="gray.400" mb={4} />
                        <Text fontSize="lg" mb={4}>No tables found in this database</Text>
                        <Link as={NextLink} href="/databases">
                          <Button leftIcon={<FiDatabase />} size="sm" colorScheme="blue">
                            Manage Database
                          </Button>
                        </Link>
                      </Box>
                    )}
                  </VStack>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        )}
      </VStack>
    </Container>
  );
} 