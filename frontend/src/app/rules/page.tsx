'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Heading,
  Text,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  Card,
  CardBody,
  HStack,
  Badge,
  useToast,
  Alert,
  AlertIcon,
  Flex,
  Divider,
  ButtonGroup,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
} from '@chakra-ui/react';
import { FaTrash } from 'react-icons/fa';
import { MdAutoAwesome } from 'react-icons/md';
import { HiDatabase } from 'react-icons/hi';
import AutoSuggestTextarea from '../components/AutoSuggestTextarea';

interface Table {
  id: number;
  name: string;
  schema?: Record<string, any>;
}

interface Rule {
  id: number;
  name: string;
  description: string;
  table_id: number;
  is_active: boolean;
  rule_type: string;
  expectation_config: any;
}

interface ArchivedRule {
  id: number;
  original_id: number | null;
  name: string;
  description: string;
  table_id: number;
  rule_type: string;
  rule_column: string | null;
  expectation_config: any;
  was_active: boolean;
  archived_at: string;
  created_at: string;
  updated_at: string;
}

interface Database {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
}

export default function RulesPage() {
  const toast = useToast();
  const [databases, setDatabases] = useState<Database[]>([]);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<number | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [rules, setRules] = useState<Rule[]>([]);
  const [archivedRules, setArchivedRules] = useState<ArchivedRule[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTable, setSelectedTable] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [tableColumns, setTableColumns] = useState<string[]>([]);
  const [columnTypes, setColumnTypes] = useState<Record<string, string>>({});
  const [ruleDescription, setRuleDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ruleToDelete, setRuleToDelete] = useState<Rule | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    fetchDatabases();
  }, []);

  useEffect(() => {
    if (selectedDatabaseId) {
      fetchTables();
    } else {
      setTables([]);
      setSelectedTable("");
      setSelectedTableId(null);
    }
  }, [selectedDatabaseId]);

  useEffect(() => {
    if (selectedTable) {
      fetchRulesForSelectedTable();
    } else {
      setRules([]);
    }
  }, [selectedTable]);

  useEffect(() => {
    if (selectedTableId && showArchived) {
      fetchArchivedRules();
    }
  }, [selectedTableId, showArchived]);

  const fetchDatabases = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/databases');
      if (!response.ok) throw new Error('Failed to fetch databases');
      const data = await response.json();
      
      const activeDatabases = data.filter((db: Database) => db.is_active);
      setDatabases(activeDatabases);
      
      if (activeDatabases.length === 1) {
        setSelectedDatabaseId(activeDatabases[0].id);
      }
    } catch (err) {
      setError('Failed to fetch databases');
      console.error(err);
    }
  };

  const fetchTables = async () => {
    try {
      if (!selectedDatabaseId) return;
      
      const response = await fetch(`http://localhost:8000/api/tables?database_id=${selectedDatabaseId}`);
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
    } catch (err) {
      setError('Failed to fetch tables');
      console.error(err);
    }
  };

  const fetchRulesForSelectedTable = async () => {
    if (!selectedTable) return;
    
    setLoading(true);
    try {
      const selectedTableObj = tables.find(table => table.name === selectedTable);
      if (!selectedTableObj) {
        throw new Error('Selected table not found');
      }
      
      setSelectedTableId(selectedTableObj.id);
      
      const tableDetailsResponse = await fetch(`http://localhost:8000/api/tables/${selectedTableObj.id}`);
      if (tableDetailsResponse.ok) {
        const tableDetails = await tableDetailsResponse.json();
        if (tableDetails.columns) {
          const columns = Object.keys(tableDetails.columns);
          setTableColumns(columns);
          
          // Extract column types
          const types: Record<string, string> = {};
          for (const column in tableDetails.columns) {
            types[column] = tableDetails.columns[column].type;
          }
          setColumnTypes(types);
        }
      }
      
      const response = await fetch(`http://localhost:8000/api/rules/table_id/${selectedTableObj.id}`);
      if (!response.ok) throw new Error('Failed to fetch rules for table');
      
      const data = await response.json();
      setRules(data);
      
      toast({
        title: "Table Selected",
        description: `Showing rules for table: ${selectedTable}`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      setError('Failed to fetch rules for selected table');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRules = async () => {
    if (selectedTableId) {
      fetchRulesForSelectedTable();
    }
  };

  const fetchArchivedRules = async () => {
    if (!selectedTableId) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/rules/archived?table_id=${selectedTableId}`);
      if (!response.ok) throw new Error('Failed to fetch archived rules');
      
      const data = await response.json();
      setArchivedRules(data);
    } catch (err) {
      toast({
        description: 'Failed to fetch archived rules',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRule = async () => {
    if (!selectedTable || !ruleDescription) {
      toast({
        title: 'Error',
        description: 'Please select a table and provide a rule description',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const requestBody = {
        table_name: selectedTable,
        description: selectedColumn 
          ? `For column ${selectedColumn}: ${ruleDescription}` 
          : ruleDescription,
        column_name: selectedColumn || undefined
      };

      const response = await fetch('http://localhost:8000/api/rules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) throw new Error('Failed to generate rule');
      
      await fetchRules();
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
      setLoading(false);
    }
  };

  const handleRefreshRules = async () => {
    setLoading(true);
    try {
      await fetchRules();
      toast({
        description: 'Rules refreshed successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        description: 'Failed to refresh rules',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (ruleId: number, currentActive: boolean) => {
    try {
      const response = await fetch(`http://localhost:8000/api/rules/${ruleId}/toggle`, {
        method: 'PUT',
      });

      if (!response.ok) throw new Error('Failed to toggle rule status');
      
      if (selectedTableId) {
        const rulesResponse = await fetch(`http://localhost:8000/api/rules/table_id/${selectedTableId}`);
        if (!rulesResponse.ok) throw new Error('Failed to refresh rules');
        const data = await rulesResponse.json();
        setRules(data);
      }
      
      toast({
        description: `Rule ${currentActive ? 'deactivated' : 'activated'} successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        description: 'Failed to toggle rule status',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    }
  };

  const handleDeleteRule = async (rule: Rule) => {
    setRuleToDelete(rule);
    onOpen();
  };

  const confirmDeleteRule = async () => {
    if (!ruleToDelete) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/rules/${ruleToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete rule');
      
      onClose();
      
      if (selectedTableId) {
        const rulesResponse = await fetch(`http://localhost:8000/api/rules/table_id/${selectedTableId}`);
        if (!rulesResponse.ok) throw new Error('Failed to refresh rules');
        const data = await rulesResponse.json();
        setRules(data);
      }
      
      toast({
        title: 'Success',
        description: `Rule "${ruleToDelete.name}" has been archived`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setRuleToDelete(null);
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
      onClose();
    }
  };

  const handleRestoreRule = async (archivedId: number) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/rules/archived/${archivedId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to restore rule');
      
      await fetchRules();
      await fetchArchivedRules();
      
      toast({
        description: 'Rule restored successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        description: 'Failed to restore rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (archivedId: number) => {
    if (!confirm('Are you sure you want to permanently delete this rule? This action cannot be undone.')) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/rules/archived/${archivedId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to permanently delete rule');
      
      await fetchArchivedRules();
      
      toast({
        description: 'Rule permanently deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        description: 'Failed to delete rule',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRulesForAllColumns = async () => {
    if (!selectedTable) {
      toast({
        title: 'Error',
        description: 'Please select a table first',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!confirm(`This will generate standard rules for all columns in the ${selectedTable} table. Continue?`)) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/rules/generate/${selectedTable}/columns`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error(`Failed to generate rules: ${response.statusText}`);
      
      const data = await response.json();
      await fetchRules();
      
      toast({
        title: 'Success',
        description: `Generated ${data.length} rules for ${selectedTable} table`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: 'Error',
        description: 'Failed to generate rules for all columns',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDatabaseChange = (databaseId: string) => {
    setSelectedDatabaseId(databaseId ? parseInt(databaseId) : null);
    setSelectedTable("");
    setSelectedTableId(null);
    setRules([]);
  };

  useEffect(() => {
    setSelectedColumn("");
  }, [selectedTable]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="stretch">
        <Box pb={4} borderBottom="2px" borderColor="gray.200">
          <HStack justify="space-between" align="center">
            <Box>
              <Heading size="lg">Data Quality Rules</Heading>
              <Text variant="secondary" mt={2}>Generate and manage data quality rules</Text>
            </Box>
            <Button
              onClick={handleRefreshRules}
              isLoading={loading}
              variant="outline"
              size="md"
            >
              Refresh Rules
            </Button>
          </HStack>
        </Box>

        {error && (
          <Alert status="error" variant="left-accent">
            <AlertIcon />
            <Text color="red.700">{error}</Text>
          </Alert>
        )}

        <Card>
          <CardBody>
            <VStack spacing={6} align="stretch">
              <Heading size="md">Generate New Rule</Heading>
              
              <FormControl>
                <FormLabel>Select Database</FormLabel>
                <Select
                  value={selectedDatabaseId?.toString() || ""}
                  onChange={(e) => handleDatabaseChange(e.target.value)}
                  placeholder="Choose a database"
                  size="lg"
                  icon={<HiDatabase />}
                  colorScheme="purple"
                >
                  {databases.map((database) => (
                    <option key={database.id} value={database.id.toString()}>
                      {database.name}
                    </option>
                  ))}
                </Select>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  Select a database to view its tables
                </Text>
              </FormControl>
              
              <FormControl>
                <FormLabel>Select Table</FormLabel>
                <Select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(e.target.value)}
                  placeholder="Choose a table"
                  size="lg"
                  colorScheme="blue"
                  isDisabled={!selectedDatabaseId || tables.length === 0}
                >
                  {tables.map((table) => (
                    <option key={table.id} value={table.name}>
                      {table.name}
                    </option>
                  ))}
                </Select>
                <Text fontSize="sm" color="gray.600" mt={1}>
                  {!selectedDatabaseId 
                    ? "Please select a database first" 
                    : tables.length === 0 
                      ? "No tables available in this database" 
                      : "Rules will be displayed for the selected table"}
                </Text>
              </FormControl>

              {selectedTable && (
                <FormControl mt={4}>
                  <FormLabel>Select Column (Optional)</FormLabel>
                  <Select
                    value={selectedColumn}
                    onChange={(e) => setSelectedColumn(e.target.value)}
                    placeholder="Choose a column or leave empty for table-level rules"
                  >
                    {tableColumns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    Selecting a column will create a column-specific rule
                  </Text>
                </FormControl>
              )}

              {selectedTable && (
              <FormControl>
                  <FormLabel>
                    {selectedColumn 
                      ? `Rule Description for Column "${selectedColumn}"` 
                      : `Rule Description for Table "${selectedTable}"`}
                  </FormLabel>
                <AutoSuggestTextarea
                  value={ruleDescription}
                  onChange={(value) => setRuleDescription(value)}
                  placeholder={selectedColumn 
                    ? `Describe a specific rule for the ${selectedColumn} column...` 
                    : `Describe a general rule for the ${selectedTable} table...`}
                  rows={4}
                  columnName={selectedColumn || undefined}
                  columnType={selectedColumn ? columnTypes[selectedColumn] : undefined}
                />
                  <Text fontSize="sm" color="gray.600" mt={1}>
                    {selectedColumn 
                      ? `Example: "${selectedColumn} should have a minimum length of 3 characters" or "${selectedColumn} should match a specific pattern"` 
                      : `Example: "All required fields should be filled" or "Table should have at least 10 records"`}
                  </Text>
              </FormControl>
              )}

              {selectedTable && (
              <ButtonGroup size="lg" width="100%" spacing={4}>
                <Button
                  onClick={handleGenerateRule}
                  isLoading={loading}
                  loadingText="Generating..."
                  colorScheme="blue"
                  isDisabled={!selectedTable || !ruleDescription}
                  flex="1"
                >
                  Generate {selectedColumn ? `Rule for ${selectedColumn}` : `Table Rule`}
                </Button>
                
                <Button
                  onClick={handleGenerateRulesForAllColumns}
                  isLoading={loading}
                  loadingText="Generating..."
                  colorScheme="teal"
                  leftIcon={<MdAutoAwesome />}
                  isDisabled={!selectedTable}
                  flex="1"
                >
                  Auto-Generate Rules for All Columns
                </Button>
              </ButtonGroup>
              )}
            </VStack>
          </CardBody>
        </Card>

        <VStack spacing={4} align="stretch">
          {selectedTable ? (
            rules.length > 0 ? (
              <>
                <Flex justifyContent="space-between" alignItems="center">
                  <Heading size="md">Rules for {selectedTable}</Heading>
                  <HStack>
                    <Badge colorScheme="green" fontSize="md" p={2}>
                      {rules.filter(r => r.is_active).length} Active
                    </Badge>
                    <Badge colorScheme="gray" fontSize="md" p={2}>
                      {rules.filter(r => !r.is_active).length} Inactive
                    </Badge>
                  </HStack>
                </Flex>
                
                {rules.filter(r => r.is_active).length > 0 && (
                  <Box>
                    <Heading size="sm" py={2} px={4} bg="green.50" color="green.700" borderRadius="md">
                      Active Rules
                    </Heading>
                    
                    {(() => {
                      const columns = [...new Set(rules
                        .filter(r => r.is_active)
                        .map(r => r.expectation_config?.kwargs?.column)
                        .filter(Boolean))];
                      
                      return columns.map(column => (
                        <Box key={`active-${column}`} mt={4}>
                          <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                            Column: {column}
                          </Text>
                          <VStack spacing={3} mt={2} align="stretch">
                            {rules
                              .filter(r => r.is_active && r.expectation_config?.kwargs?.column === column)
                              .map(rule => (
                                <Card key={rule.id}>
                                  <CardBody>
                                    <VStack align="stretch" spacing={3}>
                                      <HStack justify="space-between" align="flex-start">
                                        <Box>
                                          <HStack spacing={2} mb={2}>
                                            <Text fontWeight="600">{rule.name}</Text>
                                            <Badge colorScheme="green">Active</Badge>
                                          </HStack>
                                          <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                                        </Box>
                                        <ButtonGroup size="sm" spacing={2}>
                                          <Button
                                            variant="outline"
                                            colorScheme="red"
                                            onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                          >
                                            Deactivate
                                          </Button>
                                          <Button
                                            variant="outline"
                                            colorScheme="red"
                                            leftIcon={<FaTrash />}
                                            onClick={() => handleDeleteRule(rule)}
                                          >
                                            Delete
                                          </Button>
                                        </ButtonGroup>
                                      </HStack>
                                      
                                      <Divider />
                                      
                                      <Box fontSize="sm">
                                        <HStack mb={2}>
                                          <Badge colorScheme="purple">{rule.rule_type}</Badge>
                                          <Text fontWeight="medium">Expectation Type:</Text>
                                          <Text color="blue.500">{rule.expectation_config?.expectation_type || "N/A"}</Text>
                                        </HStack>
                                        
                                        {rule.expectation_config?.kwargs && (
                                          <Box>
                                            <Text fontWeight="medium" mb={1}>Parameters:</Text>
                                            <Box ml={3}>
                                              {Object.entries(rule.expectation_config.kwargs).map(([key, value], index) => (
                                                <Text key={index}>
                                                  <Text as="span" fontWeight="medium">{key}:</Text> {value !== null ? String(value) : "null"}
                                                </Text>
                                              ))}
                                            </Box>
                                          </Box>
                                        )}
                                      </Box>
                                    </VStack>
                                  </CardBody>
                                </Card>
                              ))}
                          </VStack>
                        </Box>
                      ));
                    })()}
                    
                    {rules.filter(r => r.is_active && !r.expectation_config?.kwargs?.column).length > 0 && (
                      <Box mt={4}>
                        <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                          Other Rules
                        </Text>
                        <VStack spacing={3} mt={2} align="stretch">
                          {rules
                            .filter(r => r.is_active && !r.expectation_config?.kwargs?.column)
                            .map(rule => (
            <Card key={rule.id}>
              <CardBody>
                                  <VStack align="stretch" spacing={3}>
                <HStack justify="space-between" align="flex-start">
                  <Box>
                    <HStack spacing={2} mb={2}>
                      <Text fontWeight="600">{rule.name}</Text>
                                          <Badge colorScheme="green">Active</Badge>
                    </HStack>
                    <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                                      </Box>
                                      <ButtonGroup size="sm" spacing={2}>
                                        <Button
                                          variant="outline"
                                          colorScheme="red"
                                          onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                        >
                                          Deactivate
                                        </Button>
                                        <Button
                                          variant="outline"
                                          colorScheme="red"
                                          leftIcon={<FaTrash />}
                                          onClick={() => handleDeleteRule(rule)}
                                        >
                                          Delete
                                        </Button>
                                      </ButtonGroup>
                                    </HStack>
                                    
                                    <Divider />
                                    
                                    <Box fontSize="sm">
                                      <HStack mb={2}>
                                        <Badge colorScheme="purple">{rule.rule_type}</Badge>
                                        <Text fontWeight="medium">Expectation Type:</Text>
                                        <Text color="blue.500">{rule.expectation_config?.expectation_type || "N/A"}</Text>
                                      </HStack>
                                      
                                      {rule.expectation_config?.kwargs && (
                                        <Box>
                                          <Text fontWeight="medium" mb={1}>Parameters:</Text>
                                          <Box ml={3}>
                                            {Object.entries(rule.expectation_config.kwargs).map(([key, value], index) => (
                                              <Text key={index}>
                                                <Text as="span" fontWeight="medium">{key}:</Text> {value !== null ? String(value) : "null"}
                    </Text>
                                            ))}
                                          </Box>
                                        </Box>
                                      )}
                                    </Box>
                                  </VStack>
                                </CardBody>
                              </Card>
                            ))}
                        </VStack>
                      </Box>
                    )}
                  </Box>
                )}
                
                {rules.filter(r => !r.is_active).length > 0 && (
                  <Box mt={4}>
                    <Heading size="sm" py={2} px={4} bg="gray.200" color="gray.700" borderRadius="md">
                      Inactive Rules
                    </Heading>
                    
                    {(() => {
                      const columns = [...new Set(rules
                        .filter(r => !r.is_active)
                        .map(r => r.expectation_config?.kwargs?.column)
                        .filter(Boolean))];
                      
                      return columns.map(column => (
                        <Box key={`inactive-${column}`} mt={4}>
                          <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                            Column: {column}
                          </Text>
                          <VStack spacing={3} mt={2} align="stretch">
                            {rules
                              .filter(r => !r.is_active && r.expectation_config?.kwargs?.column === column)
                              .map(rule => (
                                <Card key={rule.id} opacity={0.7}>
                                  <CardBody>
                                    <VStack align="stretch" spacing={3}>
                                      <HStack justify="space-between" align="flex-start">
                                        <Box>
                                          <HStack spacing={2} mb={2}>
                                            <Text fontWeight="600">{rule.name}</Text>
                                            <Badge colorScheme="gray">Inactive</Badge>
                                          </HStack>
                                          <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                                        </Box>
                                        <ButtonGroup size="sm" spacing={2}>
                                          <Button
                                            variant="solid"
                                            colorScheme="green"
                                            onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                          >
                                            Activate
                                          </Button>
                                          <Button
                                            variant="outline"
                                            colorScheme="red"
                                            leftIcon={<FaTrash />}
                                            onClick={() => handleDeleteRule(rule)}
                                          >
                                            Delete
                                          </Button>
                                        </ButtonGroup>
                                      </HStack>
                                      
                                      <Divider />
                                      
                                      <Box fontSize="sm">
                                        <HStack mb={2}>
                                          <Badge colorScheme="purple">{rule.rule_type}</Badge>
                                          <Text fontWeight="medium">Expectation Type:</Text>
                                          <Text color="blue.500">{rule.expectation_config?.expectation_type || "N/A"}</Text>
                                        </HStack>
                                        
                                        {rule.expectation_config?.kwargs && (
                                          <Box>
                                            <Text fontWeight="medium" mb={1}>Parameters:</Text>
                                            <Box ml={3}>
                                              {Object.entries(rule.expectation_config.kwargs).map(([key, value], index) => (
                                                <Text key={index}>
                                                  <Text as="span" fontWeight="medium">{key}:</Text> {value !== null ? String(value) : "null"}
                                                </Text>
                                              ))}
                                            </Box>
                                          </Box>
                                        )}
                                      </Box>
                                    </VStack>
                                  </CardBody>
                                </Card>
                              ))}
                          </VStack>
                        </Box>
                      ));
                    })()}
                    
                    {rules.filter(r => !r.is_active && !r.expectation_config?.kwargs?.column).length > 0 && (
                      <Box mt={4}>
                        <Text fontWeight="bold" px={2} py={1} bg="gray.100" borderRadius="md">
                          Other Rules
                        </Text>
                        <VStack spacing={3} mt={2} align="stretch">
                          {rules
                            .filter(r => !r.is_active && !r.expectation_config?.kwargs?.column)
                            .map(rule => (
                              <Card key={rule.id} opacity={0.7}>
                                <CardBody>
                                  <VStack align="stretch" spacing={3}>
                                    <HStack justify="space-between" align="flex-start">
                                      <Box>
                                        <HStack spacing={2} mb={2}>
                                          <Text fontWeight="600">{rule.name}</Text>
                                          <Badge colorScheme="gray">Inactive</Badge>
                                        </HStack>
                                        <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                  </Box>
                  <ButtonGroup size="sm" spacing={2}>
                    <Button
                      variant="solid"
                      colorScheme="green"
                      onClick={() => handleToggleRule(rule.id, rule.is_active)}
                    >
                      Activate
                    </Button>
                    <Button
                      variant="outline"
                      colorScheme="red"
                      leftIcon={<FaTrash />}
                      onClick={() => handleDeleteRule(rule)}
                    >
                      Delete
                    </Button>
                  </ButtonGroup>
                </HStack>
                                    
                                    <Divider />
                                    
                                    <Box fontSize="sm">
                                      <HStack mb={2}>
                                        <Badge colorScheme="purple">{rule.rule_type}</Badge>
                                        <Text fontWeight="medium">Expectation Type:</Text>
                                        <Text color="blue.500">{rule.expectation_config?.expectation_type || "N/A"}</Text>
                                      </HStack>
                                      
                                      {rule.expectation_config?.kwargs && (
                                        <Box>
                                          <Text fontWeight="medium" mb={1}>Parameters:</Text>
                                          <Box ml={3}>
                                            {Object.entries(rule.expectation_config.kwargs).map(([key, value], index) => (
                                              <Text key={index}>
                                                <Text as="span" fontWeight="medium">{key}:</Text> {value !== null ? String(value) : "null"}
                                              </Text>
                                            ))}
                                          </Box>
                                        </Box>
                                      )}
                                    </Box>
                                  </VStack>
              </CardBody>
            </Card>
          ))}
                        </VStack>
                      </Box>
                    )}
                  </Box>
                )}
              </>
            ) : (
              <Text>No rules found for the selected table</Text>
            )
          ) : (
            <Text>Please select a table to view rules</Text>
          )}
        </VStack>

        {selectedTable && (
          <Box mt={8}>
            <Flex justifyContent="space-between" alignItems="center">
              <Heading size="md">Archived Rules</Heading>
              <Button 
                size="sm" 
                onClick={() => {
                  setShowArchived(!showArchived);
                  if (!showArchived && selectedTableId) {
                    fetchArchivedRules();
                  }
                }}
              >
                {showArchived ? 'Hide Archived Rules' : 'Show Archived Rules'}
              </Button>
            </Flex>
            
            {showArchived && (
              <>
                {archivedRules.length > 0 ? (
                  <Box mt={4}>
                    <VStack spacing={3} align="stretch">
                      {archivedRules.map(rule => (
                        <Card key={rule.id} bg="gray.50">
                          <CardBody>
                            <VStack align="stretch" spacing={3}>
                              <HStack justify="space-between" align="flex-start">
                                <Box>
                                  <HStack spacing={2} mb={2}>
                                    <Text fontWeight="600">{rule.name}</Text>
                                    <Badge colorScheme="gray">Archived</Badge>
                                    {rule.was_active && <Badge colorScheme="green">Was Active</Badge>}
                                  </HStack>
                                  <Text variant="secondary" fontSize="sm">{rule.description}</Text>
                                  <Text fontSize="xs" color="gray.500" mt={1}>
                                    Archived on {new Date(rule.archived_at).toLocaleString()}
                                  </Text>
                                </Box>
                                <ButtonGroup size="sm" spacing={2}>
                                  <Button
                                    variant="solid"
                                    colorScheme="blue"
                                    onClick={() => handleRestoreRule(rule.id)}
                                  >
                                    Restore
                                  </Button>
                                  <Button
                                    variant="outline"
                                    colorScheme="red"
                                    leftIcon={<FaTrash />}
                                    onClick={() => handlePermanentDelete(rule.id)}
                                  >
                                    Delete Permanently
                                  </Button>
                                </ButtonGroup>
                              </HStack>
                              
                              <Divider />
                              
                              <Box fontSize="sm">
                                <HStack mb={2}>
                                  <Badge colorScheme="purple">{rule.rule_type}</Badge>
                                  <Text fontWeight="medium">Column:</Text>
                                  <Text>{rule.rule_column || 'N/A'}</Text>
                                </HStack>
                                
                                <HStack mb={2}>
                                  <Text fontWeight="medium">Expectation Type:</Text>
                                  <Text color="blue.500">{rule.expectation_config?.expectation_type || "N/A"}</Text>
                                </HStack>
                                
                                {rule.expectation_config?.kwargs && (
                                  <Box>
                                    <Text fontWeight="medium" mb={1}>Parameters:</Text>
                                    <Box ml={3}>
                                      {Object.entries(rule.expectation_config.kwargs).map(([key, value], index) => (
                                        <Text key={index}>
                                          <Text as="span" fontWeight="medium">{key}:</Text> {value !== null ? String(value) : "null"}
                                        </Text>
                                      ))}
                                    </Box>
                                  </Box>
                                )}
                              </Box>
                            </VStack>
                          </CardBody>
                        </Card>
                      ))}
                    </VStack>
                  </Box>
                ) : (
                  <Text mt={4}>No archived rules found for this table</Text>
                )}
              </>
            )}
          </Box>
        )}
      </VStack>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Rule</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text>
              Are you sure you want to delete the rule "{ruleToDelete?.name}"?
            </Text>
            <Text mt={2} fontSize="sm" color="gray.600">
              The rule will be archived and can be restored later if needed.
            </Text>
          </ModalBody>
          <ModalFooter>
            <ButtonGroup spacing={3}>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button colorScheme="red" onClick={confirmDeleteRule}>
                Delete Rule
              </Button>
            </ButtonGroup>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Container>
  );
} 