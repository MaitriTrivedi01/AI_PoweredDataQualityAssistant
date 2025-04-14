'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Textarea,
  Text,
  Box,
  VStack,
  HStack,
  Badge,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';

// Common phrases used in data quality rules
const SUGGESTIONS_LIST = [
  // Column-level phrases
  'should not be null',
  'should be unique',
  'should be greater than',
  'should be less than',
  'should be between',
  'should match pattern',
  'should be one of',
  'should be a valid',
  'should have a minimum length of',
  'should have a maximum length of',
  'should contain only',
  'should not contain',
  'should be formatted as',
  
  // Data type validations
  'should be a valid email',
  'should be a valid URL',
  'should be a valid IP address',
  'should be a valid date',
  'should be a valid phone number',
  'should be a valid credit card number',
  'should be a valid postal code',
  'should be a positive number',
  'should be an integer',
  'should be alphabetic',
  'should be alphanumeric',
  'should be a boolean',
  'should be in ISO format',
  
  // Value range validations
  'should be greater than or equal to',
  'should be less than or equal to',
  'should be in range',
  'should be at least',
  'should be at most',
  'should not exceed',
  'should be positive',
  'should be negative',
  'should be non-negative',
  'should be non-positive',
  
  // String validations
  'should start with',
  'should end with',
  'should contain',
  'should not contain',
  'should match regex',
  'should have exactly',
  'length should be',
  'should be capitalized',
  'should be lowercase',
  'should be uppercase',
  
  // Table-level phrases
  'all rows should have',
  'table should have at least',
  'table should have at most',
  'column values should be consistent with',
  'rows should satisfy condition',
  'each row should have unique values for',
  'enforce relationship between',
  'check for duplicate records based on',
  'ensure data referential integrity with',
  'validate business logic where',
  'columns should not have null values',
  'rows in table should match rows in',
  'primary key should be unique',
  'foreign key should exist in',
];

interface AutoSuggestTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  columnName?: string;
  columnType?: string;
}

export default function AutoSuggestTextarea({
  value,
  onChange,
  placeholder = 'Describe your rule...',
  rows = 4,
  columnName,
  columnType
}: AutoSuggestTextareaProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const hoverBg = useColorModeValue('blue.50', 'blue.900');
  const selectedBg = useColorModeValue('blue.100', 'blue.800');
  
  // Get column-specific suggestions
  const getColumnSpecificSuggestions = (columnName: string): string[] => {
    const baseColumnSuggestions = [
      `${columnName}`,
      `${columnName} should not be null`,
      `${columnName} should be unique`,
      `${columnName} should be greater than`,
      `${columnName} should be less than`,
      `${columnName} should be in range`,
      `${columnName} should match pattern`,
      `${columnName} should be one of`,
      `${columnName} should contain`,
    ];
    
    // Initialize suggestion arrays
    let typeSpecificSuggestions: string[] = [];
    
    // Determine column type based on column name or specified type
    const lowerColumnName = columnName.toLowerCase();
    const isDate = columnType?.toLowerCase().includes('date') || 
      columnType?.toLowerCase().includes('time') ||
      lowerColumnName.includes('date') || 
      lowerColumnName.includes('time') || 
      lowerColumnName.includes('day') ||
      lowerColumnName.includes('year') ||
      lowerColumnName.includes('month');
      
    const isNumber = columnType?.toLowerCase().includes('int') || 
      columnType?.toLowerCase().includes('numeric') || 
      columnType?.toLowerCase().includes('decimal') || 
      columnType?.toLowerCase().includes('float') ||
      lowerColumnName.includes('amount') || 
      lowerColumnName.includes('num') || 
      lowerColumnName.includes('qty') || 
      lowerColumnName.includes('count') ||
      lowerColumnName.includes('total') ||
      lowerColumnName.includes('sum') || 
      lowerColumnName.includes('avg') ||
      lowerColumnName.includes('id') ||
      lowerColumnName.includes('price') || 
      lowerColumnName.includes('cost');
      
    const isEmail = lowerColumnName.includes('email') || 
      lowerColumnName.includes('mail');
      
    const isPhone = lowerColumnName.includes('phone') || 
      lowerColumnName.includes('mobile') || 
      lowerColumnName.includes('cell');
      
    const isURL = lowerColumnName.includes('url') || 
      lowerColumnName.includes('website') || 
      lowerColumnName.includes('site') || 
      lowerColumnName.includes('link');
      
    const isName = lowerColumnName.includes('name') || 
      lowerColumnName.includes('first') || 
      lowerColumnName.includes('last');
    
    const isAddress = lowerColumnName.includes('address') || 
      lowerColumnName.includes('street') || 
      lowerColumnName.includes('city') || 
      lowerColumnName.includes('country') || 
      lowerColumnName.includes('state') || 
      lowerColumnName.includes('zip') || 
      lowerColumnName.includes('postal');
    
    // Add appropriate suggestions based on column type
    if (isDate) {
      typeSpecificSuggestions = [
        `${columnName} should be a valid date`,
        `${columnName} should be after today`,
        `${columnName} should be before today`,
        `${columnName} should be within the last 30 days`,
        `${columnName} should be in format YYYY-MM-DD`,
        `${columnName} should be after 2020-01-01`,
        `${columnName} should be before 2030-01-01`,
        `${columnName} should not be in the future`,
        `${columnName} should be within business hours`,
      ];
    } else if (isNumber) {
      typeSpecificSuggestions = [
        `${columnName} should be positive`,
        `${columnName} should be non-negative`,
        `${columnName} should be a whole number`,
        `${columnName} should be between 0 and 100`,
        `${columnName} should have at most 2 decimal places`,
        `${columnName} should be greater than 0`,
        `${columnName} should be less than 1000`,
        `${columnName} should be divisible by 5`,
        `${columnName} should be an even number`,
      ];
    } else if (isEmail) {
      typeSpecificSuggestions = [
        `${columnName} should be a valid email address`,
        `${columnName} should contain @`,
        `${columnName} should end with a valid domain`,
        `${columnName} should not contain spaces`,
        `${columnName} should be from a company domain`,
      ];
    } else if (isPhone) {
      typeSpecificSuggestions = [
        `${columnName} should be a valid phone number`,
        `${columnName} should match format XXX-XXX-XXXX`,
        `${columnName} should contain only digits and optional separators`,
        `${columnName} should have a valid country code`,
        `${columnName} should be at least 10 digits`,
      ];
    } else if (isURL) {
      typeSpecificSuggestions = [
        `${columnName} should be a valid URL`,
        `${columnName} should start with http:// or https://`,
        `${columnName} should contain a valid domain name`,
        `${columnName} should not contain spaces`,
        `${columnName} should be accessible`,
      ];
    } else if (isName) {
      typeSpecificSuggestions = [
        `${columnName} should contain only letters`,
        `${columnName} should be properly capitalized`,
        `${columnName} should not contain numbers`,
        `${columnName} should be at least 2 characters long`,
        `${columnName} should not contain special characters`,
      ];
    } else if (isAddress) {
      typeSpecificSuggestions = [
        `${columnName} should not be too short`,
        `${columnName} should contain street number`,
        `${columnName} should be properly formatted`,
        `${columnName} should include postal code`,
        `${columnName} should be a valid address`,
      ];
    } else {
      // Default string suggestions
      typeSpecificSuggestions = [
        `${columnName} should be at least 3 characters long`,
        `${columnName} should be at most 50 characters long`,
        `${columnName} should not contain special characters`,
        `${columnName} should be alphanumeric`,
        `${columnName} should be in lowercase`,
        `${columnName} should be in uppercase`,
        `${columnName} should be camel case`,
      ];
    }
    
    return [
      ...baseColumnSuggestions,
      ...typeSpecificSuggestions,
    ];
  };
  
  // Use column-specific suggestions when a column is selected
  const activeSuggestionsList = columnName 
    ? getColumnSpecificSuggestions(columnName) 
    : SUGGESTIONS_LIST;
  
  // Update suggestions based on current input
  useEffect(() => {
    if (!value) {
      setSuggestions([]);
      return;
    }
    
    // Get the word being typed
    const beforeCursor = value.substring(0, cursorPosition);
    const words = beforeCursor.split(' ');
    const currentWord = words[words.length - 1].toLowerCase();
    
    // Only show suggestions if the current word has at least 2 characters
    if (currentWord.length < 2) {
      setSuggestions([]);
      return;
    }
    
    // First, try to find suggestions that start with the current word
    let matchingSuggestions = activeSuggestionsList
      .filter(suggestion => suggestion.toLowerCase().startsWith(currentWord))
      .slice(0, 3);
    
    // If we don't have enough suggestions, add ones that contain the current word
    if (matchingSuggestions.length < 3) {
      const containsSuggestions = activeSuggestionsList
        .filter(suggestion => 
          !suggestion.toLowerCase().startsWith(currentWord) && 
          suggestion.toLowerCase().includes(currentWord)
        )
        .slice(0, 3 - matchingSuggestions.length);
      
      matchingSuggestions = [...matchingSuggestions, ...containsSuggestions];
    }
    
    // Add smart suggestions based on context
    if (currentWord.includes("valid")) {
      matchingSuggestions.push("should be a valid email address");
      matchingSuggestions.push("should be a valid date format");
      matchingSuggestions.push("should be a valid number");
    } else if (currentWord.includes("length")) {
      matchingSuggestions.push("should have a minimum length of");
      matchingSuggestions.push("should have a maximum length of");
      matchingSuggestions.push("length should be between");
    } else if (currentWord.includes("format")) {
      matchingSuggestions.push("should be formatted as YYYY-MM-DD");
      matchingSuggestions.push("should be formatted as a phone number");
      matchingSuggestions.push("should follow the format XXX-XXX-XXXX");
    }
    
    // Limit to 5 unique suggestions
    matchingSuggestions = [...new Set(matchingSuggestions)].slice(0, 5);
    
    setSuggestions(matchingSuggestions);
  }, [value, cursorPosition, activeSuggestionsList]);
  
  // Handle textarea input
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };
  
  // Handle textarea cursor position change
  const handleClick = (e: React.MouseEvent<HTMLTextAreaElement>) => {
    setCursorPosition(textareaRef.current?.selectionStart || 0);
  };
  
  const handleKeyUp = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    setCursorPosition(textareaRef.current?.selectionStart || 0);
  };
  
  // Find phrase boundaries for suggestions
  const findPhraseStart = (text: string): number => {
    // Start with just the last word as default
    const words = text.split(' ');
    let lastWord = words[words.length - 1];
    let phraseStart = text.length - lastWord.length;
    
    // Special case: if we have a complete suggestion already, replace it all
    for (const suggestion of activeSuggestionsList) {
      if (text.endsWith(suggestion)) {
        return text.length - suggestion.length;
      }
    }
    
    // Special case: when text equals what's in the suggestion
    const matchingWholeText = activeSuggestionsList.find(s => 
      s.toLowerCase() === text.toLowerCase()
    );
    if (matchingWholeText) {
      return 0;
    }
    
    // For multi-word suggestions, try several approaches
    if (words.length > 1) {
      // 1. Check if we're typing the continuation of a predefined phrase
      for (let i = words.length - 1; i >= 0; i--) {
        const phrase = words.slice(i).join(' ');
        const matchesSuggestion = activeSuggestionsList.some(s => 
          s.toLowerCase().startsWith(phrase.toLowerCase())
        );
        
        if (matchesSuggestion) {
          // Found a matching phrase start
          return text.length - phrase.length;
        }
      }
      
      // 2. If the user has typed "X should" or similar, they likely want to replace everything
      // with a suggestion like "X should be valid"
      const shouldPattern = /\w+\s+should\s*$/i;
      if (shouldPattern.test(text)) {
        const match = text.match(/(\w+\s+should\s*)$/i);
        if (match && match[0]) {
          return text.length - match[0].length;
        }
      }
    }
    
    // Default to replacing just the last word
    return phraseStart;
  };
  
  // Handle key events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key to accept suggestion
    if (e.key === 'Tab' && !e.shiftKey) {
      const nextWord = getNextWordSuggestion();
      if (nextWord) {
        e.preventDefault(); // Prevent the default tab behavior
        
        const beforeCursor = value.substring(0, cursorPosition);
        const afterCursor = value.substring(cursorPosition);
        
        // Find where the current phrase starts
        const phraseStart = findPhraseStart(beforeCursor);
        
        // Replace the phrase with the suggestion
        const newValue = value.substring(0, phraseStart) + nextWord + ' ' + afterCursor;
        onChange(newValue);
        
        // Update cursor position
        setTimeout(() => {
          if (textareaRef.current) {
            const newPosition = phraseStart + nextWord.length + 1;
            textareaRef.current.selectionStart = newPosition;
            textareaRef.current.selectionEnd = newPosition;
            setCursorPosition(newPosition);
          }
        }, 0);
      }
      return;
    }
  
    // Handle arrow keys for suggestion navigation
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === 'Enter' && selectedSuggestion >= 0) {
        e.preventDefault();
        applySuggestion(suggestions[selectedSuggestion]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setSuggestions([]);
        setSelectedSuggestion(-1);
      }
    }
  };
  
  // Apply selected suggestion
  const applySuggestion = (suggestion: string) => {
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    
    // Find where the current phrase starts
    const phraseStart = findPhraseStart(beforeCursor);
    
    // Replace the phrase with the suggestion
    const newValue = beforeCursor.substring(0, phraseStart) + suggestion + ' ' + afterCursor;
    onChange(newValue);
    
    // Close suggestions
    setSuggestions([]);
    
    // Set focus back to textarea and update cursor position
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = phraseStart + suggestion.length + 1;
        textareaRef.current.selectionStart = newCursorPos;
        textareaRef.current.selectionEnd = newCursorPos;
        setCursorPosition(newCursorPos);
      }
    }, 0);
  };
  
  // Find next word suggestion
  const getNextWordSuggestion = (): string | null => {
    if (!value) return null;
    
    const beforeCursor = value.substring(0, cursorPosition);
    
    // Skip if cursor is at the start or after a space
    if (beforeCursor.length === 0 || beforeCursor[beforeCursor.length - 1] === ' ') {
      return null;
    }
    
    // Get the words in the current text
    const words = beforeCursor.split(' ');
    const lastWord = words[words.length - 1];
    
    // Skip if the last word is too short
    if (lastWord.length < 2) return null;
    
    // Try to find matching suggestions that start with the text from different positions
    // This helps with multi-word phrases
    for (let i = Math.max(0, words.length - 3); i < words.length; i++) {
      const phrase = words.slice(i).join(' ');
      if (phrase.length >= 2) {
        const matches = activeSuggestionsList.filter(suggestion => 
          suggestion.toLowerCase().startsWith(phrase.toLowerCase())
        );
        
        if (matches.length > 0) {
          return matches[0];
        }
      }
    }
    
    // Fallback: Find matching suggestions for just the last word
    const matchingSuggestions = activeSuggestionsList.filter(suggestion => 
      suggestion.toLowerCase().startsWith(lastWord.toLowerCase())
    );
    
    return matchingSuggestions.length > 0 ? matchingSuggestions[0] : null;
  };
  
  // Display ghost text for next word suggestion
  const getDisplayValue = () => {
    if (!textareaRef.current) return '';
    const fullSuggestion = getNextWordSuggestion();
    if (!fullSuggestion) return '';
    
    const beforeCursor = value.substring(0, cursorPosition);
    const afterCursor = value.substring(cursorPosition);
    const phraseStart = findPhraseStart(beforeCursor);
    
    // Create a display value that shows the full suggestion replacing the current phrase
    return value.substring(0, phraseStart) + fullSuggestion + ' ' + afterCursor;
  };
  
  // Handle textarea blur
  const handleBlur = () => {
    // Delay a bit to allow for clicks on suggestions
    setTimeout(() => {
      setSuggestions([]);
      setSelectedSuggestion(-1);
    }, 200);
  };
  
  return (
    <Box position="relative" w="100%">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaChange}
        onClick={handleClick}
        onKeyUp={handleKeyUp}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        size="lg"
        rows={rows}
        resize="vertical"
        position="relative"
        zIndex="1"
        bg="transparent"
      />
      
      {/* Ghost text for next word suggestion */}
      {getNextWordSuggestion() && (
        <Textarea
          value={getDisplayValue()}
          readOnly
          rows={rows}
          resize="vertical"
          position="absolute"
          top="0"
          left="0"
          width="100%"
          height="100%"
          zIndex="0"
          color="gray.400"
          pointerEvents="none"
          border="none"
          _focus={{ border: 'none', boxShadow: 'none' }}
        />
      )}
      
      {/* Current word suggestion */}
      <Box 
        position="absolute" 
        top="5px" 
        right="10px" 
        zIndex="1" 
        bg="blue.50" 
        px={2} 
        py={1} 
        borderRadius="md"
        display={getNextWordSuggestion() ? "block" : "none"}
      >
        <Text fontSize="xs" fontWeight="medium" color="blue.600">
          Press Tab ↹ to select
        </Text>
      </Box>
      
      {/* Suggestions list */}
      {suggestions.length > 0 && (
        <VStack 
          mt={1} 
          align="stretch" 
          boxShadow="md" 
          border="1px" 
          borderColor={borderColor} 
          borderRadius="md" 
          bg={bgColor}
          spacing={0}
          maxH="200px"
          overflowY="auto"
          position="relative"
          zIndex="10"
        >
          <Text fontSize="xs" fontWeight="medium" bg="blue.50" color="blue.700" p={2} borderBottomWidth="1px">
            Suggested completions
          </Text>
          {suggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              justifyContent="flex-start"
              fontWeight="normal"
              py={2}
              px={3}
              _hover={{ bg: hoverBg }}
              onClick={() => applySuggestion(suggestion)}
              position="relative"
              height="auto"
              textAlign="left"
              borderBottomWidth={index < suggestions.length - 1 ? "1px" : "0"}
              borderBottomColor="gray.100"
              bg={selectedSuggestion === index ? selectedBg : "transparent"}
              onMouseEnter={() => setSelectedSuggestion(index)}
            >
              <Box>
                <Text>{suggestion}</Text>
                {index === 0 && (
                  <Text fontSize="xs" color="blue.600" mt={1}>
                    Click to use or type more to refine
                  </Text>
                )}
              </Box>
            </Button>
          ))}
        </VStack>
      )}
      
      {/* Helper text */}
      <Text fontSize="xs" color="gray.500" mt={1}>
        Press Tab to select a suggestion or Arrow keys to navigate the list
      </Text>
    </Box>
  );
} 