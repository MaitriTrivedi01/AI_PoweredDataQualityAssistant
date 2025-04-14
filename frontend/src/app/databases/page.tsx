'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  HStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Card,
  CardBody,
  Badge,
  useToast,
  Alert,
  AlertIcon,
  Flex,
  Divider,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Switch,
  Select,
  ButtonGroup,
  useDisclosure,
  Stack,
  IconButton,
  Spinner,
  Checkbox,
  CheckboxGroup,
  Tooltip,
  Icon,
  SimpleGrid,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaPlus, FaTrash, FaPencilAlt, FaDatabase, FaTable, FaSync } from 'react-icons/fa';
import { FiDatabase, FiRefreshCw, FiEye, FiEdit, FiTrash2, FiPlus } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface Database {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  description: string;
  created_at?: string;
  updated_at?: string;
}

export default function DatabasesPage() {
  const toast = useToast();
  const router = useRouter();
  const { isOpen: isAddModalOpen, onOpen: onAddModalOpen, onClose: onAddModalClose } = useDisclosure();
  const { isOpen: isEditModalOpen, onOpen: onEditModalOpen, onClose: onEditModalClose } = useDisclosure();
  const { isOpen: isTablesModalOpen, onOpen: onTablesModalOpen, onClose: onTablesModalClose } = useDisclosure();
  
  const [databases, setDatabases] = useState<Database[]>([]);
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState<number | null>(null);
  const [fetchingTables, setFetchingTables] = useState(false);
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [error, setError] = useState("");
  
  const [selectedDatabase, setSelectedDatabase] = useState<Database | null>(null);
  
  // UI theme variables
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  // Form states
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formConnectionString, setFormConnectionString] = useState("");
  
  useEffect(() => {
    fetchDatabases();
  }, []);
  
  const fetchDatabases = async () => {
    setLoading(true);
    setError(null);
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
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddDatabase = async () => {
    if (!formName || !formConnectionString) {
      toast({
        title: 'Error',
        description: 'Please fill all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/databases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          connection_string: formConnectionString,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add database');
      }
      
      await fetchDatabases();
      
      toast({
        title: 'Success',
        description: 'Database added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset form and close modal
      setFormName('');
      setFormDescription('');
      setFormConnectionString('');
      onAddModalClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateDatabase = async () => {
    if (!selectedDatabase) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/databases/${selectedDatabase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          description: formDescription,
          connection_string: formConnectionString,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update database');
      }
      
      await fetchDatabases();
      
      toast({
        title: 'Success',
        description: 'Database updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Reset form and close modal
      setSelectedDatabase(null);
      onEditModalClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteDatabase = async (database: Database) => {
    if (!confirm(`Are you sure you want to delete "${database.name}"? This will also delete all associated tables and rules.`)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/databases/${database.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to delete database');
      }
      
      await fetchDatabases();
      
      toast({
        title: 'Success',
        description: 'Database deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleTestConnection = async (database: Database) => {
    setTestingConnection(database.id);
    try {
      const response = await fetch(`http://localhost:8000/api/databases/${database.id}/test`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Connection test failed');
      }
      
      toast({
        title: 'Success',
        description: 'Database connection test successful',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Refresh databases to get updated status
      await fetchDatabases();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setTestingConnection(null);
    }
  };
  
  const handleToggleActive = async (database: Database) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/databases/${database.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_active: !database.is_active,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update database status');
      }
      
      await fetchDatabases();
      
      toast({
        title: 'Success',
        description: `Database ${database.is_active ? 'deactivated' : 'activated'} successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleShowTables = async (database: Database) => {
    setSelectedDatabase(database);
    setFetchingTables(true);
    setAvailableTables([]);
    setSelectedTables([]);
    onTablesModalOpen();
    
    try {
      const response = await fetch(`http://localhost:8000/api/databases/${database.id}/tables`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to fetch tables');
      }
      
      const tables = await response.json();
      setAvailableTables(tables);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setFetchingTables(false);
    }
  };
  
  const handleImportTables = async () => {
    if (!selectedDatabase || selectedTables.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one table to import',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/databases/${selectedDatabase.id}/tables/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedTables),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to import tables');
      }
      
      const result = await response.json();
      
      toast({
        title: 'Success',
        description: `Successfully imported ${result.imported_tables.length} tables`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // Close the modal
      onTablesModalClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };
  
  const openEditModal = (database: Database) => {
    setSelectedDatabase(database);
    setFormName(database.name);
    setFormDescription(database.description || '');
    setFormConnectionString(database.connection_string);
    onEditModalOpen();
  };
  
  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormConnectionString('');
    setSelectedDatabase(null);
  };
  
  const handleViewDatabaseTables = (databaseId) => {
    router.push(`/tables?database_id=${databaseId}`);
  };
  
  const handleRefresh = () => {
    fetchDatabases();
  };
  
  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box pb={4} borderBottom="2px" borderColor="gray.200">
          <Flex justifyContent="space-between" alignItems="center">
            <Box>
              <Heading size="lg">Databases</Heading>
              <Text color="gray.600" mt={2}>
                View and manage your connected databases
              </Text>
            </Box>
            <Button 
              leftIcon={<FiPlus />} 
              colorScheme="blue"
              onClick={onAddModalOpen}
            >
              Add Database
            </Button>
          </Flex>
        </Box>

        {error && (
          <Alert status="error">
            <AlertIcon />
            {error}
          </Alert>
        )}

        {loading ? (
          <Flex justify="center" align="center" height="50vh">
            <Spinner size="xl" color="blue.500" />
          </Flex>
        ) : databases.length === 0 ? (
          <Card textAlign="center" p={6}>
            <VStack spacing={4}>
              <Icon as={FiDatabase} w={12} h={12} color="gray.400" />
              <Heading size="md">No Databases Found</Heading>
              <Text>Start by adding a database connection</Text>
              <Button colorScheme="blue" onClick={onAddModalOpen}>Add Database</Button>
            </VStack>
          </Card>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {databases.map(database => (
              <Card 
                key={database.id} 
                borderWidth="1px" 
                borderRadius="lg" 
                overflow="hidden"
                bg={cardBg}
                borderColor={borderColor}
                transition="all 0.2s"
                cursor="pointer"
                onClick={() => handleViewDatabaseTables(database.id)}
                _hover={{ transform: 'translateY(-5px)', shadow: 'md' }}
              >
                <CardBody>
                  <HStack justifyContent="space-between" alignItems="flex-start">
                    <VStack align="start" spacing={2}>
                      <HStack>
                        <Heading size="md">{database.name}</Heading>
                        <Badge colorScheme={database.is_active ? 'green' : 'red'}>
                          {database.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </HStack>
                      
                      {database.description && (
                        <Text color="gray.600">{database.description}</Text>
                      )}
                      
                      <Text fontSize="sm" color="gray.500">
                        Last updated: {new Date(database.updated_at || '').toLocaleString()}
                      </Text>
                    </VStack>
                    
                    <ButtonGroup spacing={2} onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        leftIcon={<FiEye />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleViewDatabaseTables(database.id);
                        }}
                        isDisabled={!database.is_active}
                      >
                        View Tables
                      </Button>
                      <IconButton
                        aria-label="Edit database"
                        icon={<FiEdit />}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(database);
                        }}
                      />
                      <IconButton
                        aria-label="Delete database"
                        icon={<FiTrash2 />}
                        size="sm"
                        colorScheme="red"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteDatabase(database);
                        }}
                      />
                    </ButtonGroup>
                  </HStack>
                  
                  <Divider my={4} />
                  
                  <Flex justifyContent="space-between" alignItems="center" onClick={(e) => e.stopPropagation()}>
                    <HStack>
                      <Text fontSize="sm">Connection Status:</Text>
                      <Button
                        size="xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleTestConnection(database);
                        }}
                        isLoading={testingConnection === database.id}
                        loadingText="Testing..."
                      >
                        Test Connection
                      </Button>
                    </HStack>
                    
                    <HStack>
                      <Text fontSize="sm">Active:</Text>
                      <Switch
                        isChecked={database.is_active}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleActive(database);
                        }}
                        colorScheme="green"
                      />
                    </HStack>
                  </Flex>
                </CardBody>
              </Card>
            ))}
          </SimpleGrid>
        )}
      </VStack>
      
      {/* Add Database Modal */}
      <Modal isOpen={isAddModalOpen} onClose={onAddModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Database Connection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Database Name</FormLabel>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter a descriptive name"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Connection String</FormLabel>
                <Input
                  value={formConnectionString}
                  onChange={(e) => setFormConnectionString(e.target.value)}
                  placeholder="postgresql://username:password@host:port/database"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Format: postgresql://username:password@host:port/database
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleAddDatabase}
              isLoading={loading}
              loadingText="Adding..."
            >
              Add Database
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Edit Database Modal */}
      <Modal isOpen={isEditModalOpen} onClose={onEditModalClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Database Connection</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <FormControl isRequired>
                <FormLabel>Database Name</FormLabel>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Enter a descriptive name"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Description</FormLabel>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>Connection String</FormLabel>
                <Input
                  value={formConnectionString}
                  onChange={(e) => setFormConnectionString(e.target.value)}
                  placeholder="postgresql://username:password@host:port/database"
                />
                <Text fontSize="xs" color="gray.500" mt={1}>
                  Format: postgresql://username:password@host:port/database
                </Text>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleUpdateDatabase}
              isLoading={loading}
              loadingText="Updating..."
            >
              Update Database
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
      
      {/* Tables Modal */}
      <Modal isOpen={isTablesModalOpen} onClose={onTablesModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            Tables in {selectedDatabase?.name}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            {fetchingTables ? (
              <Box textAlign="center" py={10}>
                <Spinner size="lg" />
                <Text mt={4}>Discovering tables...</Text>
              </Box>
            ) : availableTables.length === 0 ? (
              <Alert status="info">
                <AlertIcon />
                No tables found in this database
              </Alert>
            ) : (
              <VStack align="stretch" spacing={4}>
                <Text>Select tables to import:</Text>
                <Box maxH="400px" overflowY="auto" p={2} border="1px" borderColor="gray.200" borderRadius="md">
                  <CheckboxGroup
                    value={selectedTables}
                    onChange={(values) => setSelectedTables(values as string[])}
                  >
                    <Stack spacing={2}>
                      {availableTables.map((table) => (
                        <Checkbox key={table} value={table}>
                          {table}
                        </Checkbox>
                      ))}
                    </Stack>
                  </CheckboxGroup>
                </Box>
                
                {selectedTables.length > 0 && (
                  <HStack justify="space-between">
                    <Text fontWeight="bold">{selectedTables.length} tables selected</Text>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedTables([])}
                    >
                      Clear Selection
                    </Button>
                  </HStack>
                )}
              </VStack>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onTablesModalClose}>
              Cancel
            </Button>
            <Button
              colorScheme="blue"
              onClick={handleImportTables}
              isDisabled={selectedTables.length === 0 || fetchingTables}
              isLoading={loading}
              loadingText="Importing..."
            >
              Import Selected Tables
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
} 