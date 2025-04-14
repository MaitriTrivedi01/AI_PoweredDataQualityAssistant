'use client';

import { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  Flex,
  Spinner,
  Badge,
  Card,
  CardHeader,
  CardBody,
  SimpleGrid,
  HStack,
  VStack,
  Progress,
  Divider,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Icon,
  Button,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Alert,
  AlertIcon,
  useColorModeValue,
  Link,
  ButtonGroup
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FiChevronRight, FiCheckCircle, FiXCircle, FiAlertTriangle, FiClock, FiArrowLeft } from 'react-icons/fi';

interface RuleResult {
  id: number;
  rule_id: number;
  rule_name: string;
  status: 'success' | 'failure' | 'error';
  success_count: number;
  failure_count: number;
  execution_time: string;
  error_details?: any;
  result_metadata?: any;
}

interface ValidationReport {
  id: number;
  report_name: string;
  table_name: string;
  created_at: string;
  rule_count: number;
  summary: {
    total_rules: number;
    passed_rules: number;
    failed_rules: number;
    error_rules: number;
    total_records: number;
    overall_success_rate: number;
  };
  table_id?: number;
  database_id?: number;
  database_name?: string;
  report_data?: {
    results: RuleResult[];
  };
}

export default function ReportDetailRedirect() {
  const params = useParams();
  const router = useRouter();
  const reportId = params.id;
  
  useEffect(() => {
    // Redirect to the new route
    if (reportId) {
      router.replace(`/qualityhistory/${reportId}`);
    }
  }, [reportId, router]);
  
  return (
    <Flex justify="center" align="center" height="60vh">
      <Spinner size="xl" color="blue.500" />
    </Flex>
  );
} 