from openai import OpenAI
from ..core.config import settings
import json
from typing import Dict, List, Any, Optional

class AIService:
    def __init__(self):
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        
    def _extract_json_from_markdown(self, content: str) -> str:
        """Extract JSON content from markdown response"""
        # Look for content between ```json and ``` markers
        json_start = content.find("```json")
        if json_start == -1:
            # Try without json tag
            json_start = content.find("```")
            if json_start == -1:
                return content
            json_start += 3
        else:
            json_start += 7
            
        json_end = content.find("```", json_start)
        if json_end == -1:
            return content[json_start:]
        
        return content[json_start:json_end].strip()
        
    def generate_rules_from_schema(self, table_name: str, schema: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Generate Great Expectations rules based on table schema
        """
        prompt = f"""
        Given the following PostgreSQL table schema for table '{table_name}':
        {json.dumps(schema, indent=2)}
        
        Generate appropriate Great Expectations rules for data quality validation that are SPECIFIC to this table.
        Based on the table and column names, infer the likely business rules that should be applied.
        
        Consider:
        1. Column-specific not null validations based on the business meaning of each column
        2. Data type validation appropriate for each column's purpose
        3. Value range checks that make sense for this specific table's domain
        4. Uniqueness constraints for fields that typically should be unique
        5. Format validation specific to the likely data in each column
        
        For example, if there's a column like "email", create a rule specifically for email formats.
        If there's a column like "age", create appropriate age range validations.
        If there's a column like "first_name", create appropriate length and character validations.
        
        Name each rule specifically for the table and column, like "{table_name}_column_rule".
        
        For each rule, the expectation configuration MUST be wrapped in an "expectations" array, 
        even if there's only one expectation.
        
        Return ONLY the JSON array without any additional text or markdown formatting:
        [
            {{
                "name": "specific_rule_name",
                "description": "human readable description specific to this table",
                "expectation_config": {{
                    "expectations": [
                        {{
                    "expectation_type": "expect_*",
                    "kwargs": {{
                                // Great Expectations configuration specific to this table's column
                            }}
                    }}
                    ]
                }}
            }}
        ]
        """
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a data quality expert specializing in Great Expectations rules. Create table-specific, tailored rules based on the column names and their likely contents. Return ONLY the JSON without any additional text or explanation."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )
            
            # Parse the response and extract rules
            content = response.choices[0].message.content
            # Extract JSON from markdown if needed
            json_content = self._extract_json_from_markdown(content)
            try:
                rules = json.loads(json_content)
                # Ensure all rules have expectations array
                for rule in rules:
                    if "expectation_config" in rule:
                        if "expectation_type" in rule["expectation_config"]:
                            # This is a single expectation, wrap it in an array
                            expectation = rule["expectation_config"]
                            rule["expectation_config"] = {
                                "expectations": [expectation]
                            }
                        elif "expectations" not in rule["expectation_config"]:
                            # If neither expectation_type nor expectations exist, add empty expectations array
                            rule["expectation_config"]["expectations"] = []
                return rules
            except json.JSONDecodeError as e:
                print(f"Error parsing JSON response: {str(e)}")
                print(f"Response content: {content}")
                print(f"Extracted JSON content: {json_content}")
                return []
            
        except Exception as e:
            print(f"Error generating rules: {str(e)}")
            return []
    
    def generate_rule_from_description(self, table_name: str, description: str, column_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a Great Expectations rule from natural language description
        """
        # First get table information to provide context
        try:
            # We'll assume this is being called with a valid DB session
            # In a real implementation, you might want to pass the db session or use a repository pattern
            from sqlalchemy import create_engine, inspect
            from ..core.config import settings
            
            engine = create_engine(settings.DATABASE_URL)
            inspector = inspect(engine)
            
            # Get column information if the table exists
            columns_info = {}
            if table_name in inspector.get_table_names():
                columns = inspector.get_columns(table_name)
                columns_info = {col['name']: str(col['type']) for col in columns}
        except Exception as e:
            print(f"Error getting table info: {str(e)}")
            columns_info = {}
        
        # Use AI to generate a rule
        try:
            OPENAI_API_KEY = settings.OPENAI_API_KEY
            
            if not OPENAI_API_KEY:
                # If no API key, return a basic rule
                if column_name:
                    return {
                        "name": f"{column_name}_not_null",
                        "description": f"Ensure {column_name} in {table_name} is not null",
                        "expectation_config": {
                            "expectation_type": "expect_column_values_to_not_be_null",
                            "kwargs": {
                                "column": column_name
                            }
                        }
                    }
                else:
                    return {
                        "name": f"{table_name}_row_count",
                        "description": f"Ensure {table_name} has rows",
                        "expectation_config": {
                            "expectation_type": "expect_table_row_count_to_be_between",
                            "kwargs": {
                                "min_value": 1
                            }
                        }
                    }
            
            # Build system message with column info
            system_message = """You are a Great Expectations rule generator. Your task is to convert a natural language description 
            into a properly formatted Great Expectations rule configuration. Focus on creating ONE SINGLE rule that addresses 
            the description.
            
            When given a table name, column name (if any), and rule description, generate a rule that:
            1. Has a clear, specific name that follows snake_case and includes the column name when applicable
            2. Includes a concise description of what the rule validates
            3. Uses the most appropriate Great Expectations expectation type
            4. Includes all necessary parameters in the kwargs
            5. References the specific column that was provided if one exists
            
            IMPORTANT NOTES:
            - FOR NAME FIELDS (first_name, last_name, etc.): Instead of comparing them to each other, validate them 
              individually with rules like "expect_column_values_to_not_be_null" or "expect_column_values_to_match_regex"
            - FOR OTHER COLUMN PAIR VALIDATIONS:
              - When comparing two columns to ensure they are DIFFERENT, use "expect_column_pair_values_to_be_different" NOT "expect_column_pair_colequality_to_be_false"
              - When comparing two columns to ensure they are EQUAL, use "expect_column_pair_values_to_be_equal" NOT "expect_column_pair_colequality_to_be_true"
            
            Return the result as a JSON object with these fields:
            {
                "name": "rule_name",
                "description": "what this rule checks for",
                "expectation_config": {
                    "expectation_type": "one_of_the_great_expectations_types",
                    "kwargs": {
                        // parameters for the expectation
                    }
                }
            }
            
            Only return the JSON object without any additional text.
            """
            
            # Create user message with table details
            column_info_text = ""
            if columns_info:
                column_info_text = "Columns in this table:\n"
                for col_name, col_type in columns_info.items():
                    column_info_text += f"- {col_name} ({col_type})\n"
            
            column_specification = f"for column '{column_name}'" if column_name else "for the entire table"
            
            user_message = f"""
            Table name: {table_name}
            {column_info_text}
            
            Rule description {column_specification}: {description}
            
            Generate a Great Expectations rule configuration that addresses this description.
            """
            
            # Call OpenAI API
            completion = self.client.chat.completions.create(
                model="gpt-3.5-turbo-0125",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.2
            )
            
            # Parse response
            response_content = completion.choices[0].message.content.strip()
            
            # Try to parse JSON from response
            import json
            import re
            
            # Look for JSON object in the response
            json_pattern = r'({.*})'
            match = re.search(json_pattern, response_content, re.DOTALL)
            
            if match:
                json_str = match.group(1)
                rule_config = json.loads(json_str)
                
                # Ensure rule uses the specified column if provided
                if column_name and "expectation_config" in rule_config and "kwargs" in rule_config["expectation_config"]:
                    # For column-specific expectations, ensure the column is set
                    if rule_config["expectation_config"]["expectation_type"].startswith("expect_column_"):
                        rule_config["expectation_config"]["kwargs"]["column"] = column_name
                
                return rule_config
            else:
                # Fallback if parsing fails
                if column_name:
                    return {
                        "name": f"{column_name}_custom_rule",
                        "description": f"Custom rule for {column_name} in {table_name}: {description}",
                        "expectation_config": {
                            "expectation_type": "expect_column_values_to_not_be_null",
                            "kwargs": {
                                "column": column_name
                            }
                        }
                    }
                else:
                    return {
                        "name": f"{table_name}_custom_rule",
                        "description": f"Custom rule for {table_name}: {description}",
                        "expectation_config": {
                            "expectation_type": "expect_table_row_count_to_be_between",
                            "kwargs": {
                                "min_value": 1
                            }
                        }
                    }
            
        except Exception as e:
            print(f"Error generating rule: {str(e)}")
            # Fallback to a simple rule
            if column_name:
                return {
                    "name": f"{column_name}_simple_rule",
                    "description": description,
                    "expectation_config": {
                        "expectation_type": "expect_column_values_to_not_be_null",
                        "kwargs": {
                            "column": column_name
                        }
                    }
                }
            else:
                return {
                    "name": f"{table_name}_simple_rule",
                    "description": description,
                    "expectation_config": {
                        "expectation_type": "expect_table_row_count_to_be_between",
                        "kwargs": {
                            "min_value": 1
                        }
                    }
                }

    # Add this method after the generate_rule_from_description method
    async def generate_rule(self, table_name: str, description: str, column_name: Optional[str] = None) -> Dict[str, Any]:
        """
        Generate a Great Expectations rule from natural language description
        Wrapper around generate_rule_from_description for backward compatibility
        with additional fixes for common issues in auto-generated rules
        """
        result = self.generate_rule_from_description(
            table_name=table_name,
            description=description,
            column_name=column_name
        )
        
        # Fix common issues with auto-generated rules
        if result and "expectation_config" in result:
            expectation_type = result["expectation_config"].get("expectation_type")
            kwargs = result["expectation_config"].get("kwargs", {})
            
            # Fix issues with column pair comparisons in general
            if expectation_type in ["expect_column_pair_values_to_be_different", 
                                   "expect_column_pair_colequality_to_be_false",
                                   "expect_column_pair_values_to_be_equal",
                                   "expect_column_pair_colequality_to_be_true"]:
                
                column_a = kwargs.get("column_A", "")
                column_b = kwargs.get("column_B", "")
                
                if not column_a or not column_b:
                    # If either column is missing, create a basic rule instead
                    col_to_use = column_a or column_b or column_name or "id"
                    result["expectation_config"]["expectation_type"] = "expect_column_values_to_not_be_null"
                    result["expectation_config"]["kwargs"] = {
                        "column": col_to_use,
                        "mostly": 0.99  # Allow for some exceptions
                    }
                    result["description"] = f"Ensures {col_to_use} column is not null (converted from problematic rule)"
                    result["name"] = f"{col_to_use}_not_null_check"
                    return result
                
                # Add a mostly parameter to make the rule more flexible
                # This allows it to handle some number of exceptions
                if "mostly" not in kwargs:
                    kwargs["mostly"] = 0.95  # Allow for 5% exceptions
                
                # Convert old style expectation types to new style
                if expectation_type == "expect_column_pair_colequality_to_be_false":
                    result["expectation_config"]["expectation_type"] = "expect_column_pair_values_to_be_different"
                    if "description" in result:
                        columns = f"{column_a} and {column_b}"
                        result["description"] = f"Ensures {columns} contain different values in each row (mostly)"
                
                elif expectation_type == "expect_column_pair_colequality_to_be_true":
                    result["expectation_config"]["expectation_type"] = "expect_column_pair_values_to_be_equal"
                    if "description" in result:
                        columns = f"{column_a} and {column_b}"
                        result["description"] = f"Ensures {columns} contain equal values in each row (mostly)"
            
            # Make sure regex expectations have the right format
            elif expectation_type in ["expect_column_values_to_match_regex", "expect_column_values_to_not_match_regex"]:
                # Ensure regex is properly escaped
                if "regex" in kwargs and isinstance(kwargs["regex"], str):
                    # Try to compile the regex to check validity
                    try:
                        import re
                        re.compile(kwargs["regex"])
                    except re.error:
                        # If invalid regex, provide a more basic one
                        if expectation_type == "expect_column_values_to_match_regex":
                            kwargs["regex"] = "."  # Match any character
                        else:
                            kwargs["regex"] = "^$"  # Match empty string
            
            # Fix numeric comparison rules
            elif expectation_type in ["expect_column_values_to_be_between"]:
                # Ensure min_value and max_value are appropriate types
                if "min_value" in kwargs and isinstance(kwargs["min_value"], str):
                    try:
                        kwargs["min_value"] = float(kwargs["min_value"])
                    except (ValueError, TypeError):
                        kwargs["min_value"] = 0
                
                if "max_value" in kwargs and isinstance(kwargs["max_value"], str):
                    try:
                        kwargs["max_value"] = float(kwargs["max_value"])
                    except (ValueError, TypeError):
                        kwargs["max_value"] = 100
        
        return result 