import { useState } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  Text,
  List,
  ListItem,
  ListIcon,
  Box,
  Alert,
  AlertIcon,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  VStack,
  Divider
} from '@chakra-ui/react';

interface Rule {
  id: number;
  table_id: number;
  name: string;
  description: string | null;
  rule_type: string;
  expectation_config: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RuleGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  onRulesGenerated: (rules: Rule[]) => void;
}

export default function RuleGenerationModal({
  isOpen,
  onClose,
  tableName,
  onRulesGenerated,
}: RuleGenerationModalProps) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.600', 'gray.300');
  const accentColor = useColorModeValue('blue.500', 'blue.300');

  const generateTableRules = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/rules/generate/${tableName}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate table rules');
      }

      const rules = await response.json();
      onRulesGenerated(rules);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate table rules');
    } finally {
      setGenerating(false);
    }
  };

  const generateColumnRules = async () => {
    setGenerating(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:8000/api/rules/generate/${tableName}/columns`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate column-wise rules');
      }

      const rules = await response.json();
      onRulesGenerated(rules);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate column-wise rules');
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerate = () => {
    if (tabIndex === 0) {
      generateTableRules();
    } else {
      generateColumnRules();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(5px)" />
      <ModalContent bg={bgColor} borderRadius="lg" shadow="xl">
        <ModalHeader fontSize="xl">Generate Rules for {tableName}</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <Tabs isFitted variant="enclosed" colorScheme="blue" onChange={(index) => setTabIndex(index)}>
            <TabList mb="1em">
              <Tab _selected={{ color: 'white', bg: accentColor }}>Table Rules</Tab>
              <Tab _selected={{ color: 'white', bg: accentColor }}>Column Rules</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <Text color={textColor} mb={4}>
                  This will automatically generate table-level data quality rules for the {tableName} table based on its schema and data patterns.
                </Text>
                
                <List spacing={2} ml={4} mb={4}>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Table-wide integrity checks</Text>
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Row count validations</Text>
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Table-specific business rules</Text>
                  </ListItem>
                </List>
              </TabPanel>
              <TabPanel>
                <Text color={textColor} mb={4}>
                  This will generate column-specific data quality rules based on each column's data type and content patterns.
                </Text>
                
                <List spacing={2} ml={4} mb={4}>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Column-specific not null validations</Text>
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Data type validations for each column</Text>
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Range validations for numeric columns</Text>
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Format validations for text & date columns</Text>
                  </ListItem>
                  <ListItem display="flex" alignItems="center">
                    <ListIcon as={() => <span>✅</span>} color="green.500" />
                    <Text>Uniqueness checks for key columns</Text>
                  </ListItem>
                </List>
                
                <Box bg="blue.50" p={3} borderRadius="md" borderLeft="4px solid" borderColor="blue.500">
                  <Text color="blue.700" fontSize="sm">
                    Rules will be organized by column, making it easier to manage column-specific data quality constraints.
                  </Text>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Divider my={4} />

          <Text color={textColor} fontStyle="italic">
            Note: These rules will be tailored specifically for the {tableName} table structure and use cases.
          </Text>

          {error && (
            <Alert status="error" variant="left-accent" mt={4}>
              <AlertIcon />
              {error}
            </Alert>
          )}
        </ModalBody>

        <ModalFooter gap={3}>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            colorScheme="green"
            onClick={handleGenerate}
            isLoading={generating}
            loadingText={tabIndex === 0 ? "Generating Table Rules..." : "Generating Column Rules..."}
          >
            {tabIndex === 0 ? "Generate Table Rules" : "Generate Column Rules"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
} 