import os
from typing import List, Optional

from llama_index.core import SQLDatabase
from llama_index.core.base.response.schema import Response
from llama_index.core.bridge.pydantic import BaseModel, Field
from llama_index.core.llms.llm import LLM
from llama_index.core.query_engine import NLSQLTableQueryEngine
from llama_index.core.tools.types import ToolOutput
from llama_index.tools.database import DatabaseToolSpec
from qai.ai import QueryReturn
from sqlalchemy import create_engine, text
from sqlalchemy.exc import NoSuchTableError
from sqlalchemy.schema import CreateTable

from qai.agent import ROOT_DIR

# Current supported fields in backend: email, name, phone_number, company_name, company_url, job_title, linkedin_url, timezone

PROJ_DIR = os.path.dirname(os.path.dirname(os.path.dirname(ROOT_DIR)))


# Settings.llm = OpenAI(model="gpt-4", temperature=0.0)


class PeopleIds(BaseModel):
    id: str = Field(..., description="The id of the person")


class CompanyIds(BaseModel):
    id: str = Field(..., description="The id of the company")


class IndustryIds(BaseModel):
    id: str = Field(..., description="The id of the industry")


class StepModel(BaseModel):
    sentence: str = Field(
        ...,
        description=(
            "A revised sentence that captures the business logic. the revised sentence keeps details such as numbers."
        ),
    )
    category: str = Field(
        ..., description="The category of the step, for example: company, people, etc."
    )

    class Config:
        arbitrary_types_allowed = True


class RefineSQLQuery(DatabaseToolSpec):
    """Simple Database tool."""

    ## List of tables in the database, None for all tables
    tables: Optional[list[str]] = None
    llm: Optional[LLM] = None
    limit: int = None  ## Limit the number of results returned

    refine_query_system_message: str = (
        "Separate the text into a list of logical execution steps for a business user and categorize the step."
        "Do not create steps, only refine the given sentences into logical execution steps."
        "The steps should be in the order of execution. "
        "If there are no steps ask for clarification."
        "Keep details such as quantities or numbers."
        "When choosing a category only use one of the following: [company, people, industry, location, time, campaign, email, extraneous]"
        "For example if the user query is 'Get me the head of sales for the top 5 companies in the seattle area' and the following database schema {schema}, the refined query should be: "
        "step: Get the top 5 companies in the seattle area, category: company"
        "step: Get the head of sales for each company, category: people"
        ""
    )
    spec_functions = [
        "find_steps",
        "load_data",
        "describe_tables",
        "list_tables",
        "load_people",
        "load_companies",
    ]

    def __init__(self, llm: LLM = None, limit: int = 5, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.llm = llm
        self.limit = limit
        ## get columns from the database
        self.columns = self.list_tables
        # self.spec_functions.extend(self.extra_spec_functions)

    def tables_to_json(self, tables: Optional[List[str]] = None) -> dict:
        """
        Converts the specified tables in the database into a simple json format

        Args:
            tables (List[str]): A list of table names to retrieve details about
        """
        table_names = tables or [table.name for table in self._metadata.sorted_tables]
        json_tables = {}
        for table_name in table_names:
            columns = []
            table = next(
                (table for table in self._metadata.sorted_tables if table.name == table_name),
                None,
            )
            if table is None:
                raise NoSuchTableError(f"Table '{table_name}' does not exist.")
            schema = CreateTable(table).compile(self.sql_database._engine)
            try:
                for col in schema.statement.columns:
                    s = str(col).split(" ")
                    name = s[0].strip('"')
                    type = s[1]
                    columns.append({"name": name, "type": type})
            except:
                raise
            json_tables[table_name] = columns
        return json_tables

    @staticmethod
    def sources_to_json(sources: list) -> list[dict]:
        if not sources:
            return {}
        source: ToolOutput
        for source in sources:
            if source.raw_output:
                return source.raw_output

    def query(self, query: str) -> QueryReturn:
        return self.query_engine.query(query)

    def find_steps(self, steps: list[StepModel]) -> list[StepModel]:
        """
        Separate the text into a list of logical execution steps for a business user and categorize the step.
        Do not create steps, only refine the given sentences into logical execution steps.
        The steps should be in the order of execution.
        Keep details such as quantities or numbers.
        When choosing a category only use one of the following: [company, people, industry, location, time, campaign, email, extraneous]
        For example if the user query is 'Get me the head of sales for the top 5 companies in the seattle area' the refined query should be:
        step: Get the top 5 companies in the seattle area, category: company
        step: Get the head of sales for each company, category: people

        Args:
            steps (List[StepModel]): A list of StepModel objects, each containing a sentence and a category

        """
        ## Input is not perfect from the llm, it can be a list of steps but in dict form
        ## or it can be a dict with a list of dicts
        ## comes in as a list of steps but in dict form
        if isinstance(steps, dict):
            steps = steps["steps"]
        steps = [StepModel(**step) for step in steps]
        steps = self._refine_step_queries(steps)
        print(f"Returning steps = {steps}")
        return steps

    ## separate company and people steps. Merge filters into the same step.
    def _merge_steps(self, steps: list[StepModel]) -> list[StepModel]:
        """Merge the steps into a list of steps with the same category.

        Args:
            steps (list[dict[str, str]]): The list of steps to merge.

        Returns:
            list[dict[str, str]]: The merged list of steps.
        """
        new_steps: list[StepModel] = []
        old_category = None
        for step in steps:
            if old_category is None or old_category != step.category:
                new_steps.append(step)
            else:
                new_steps[-1].sentence += " " + step.sentence
            old_category = step.category
        return new_steps

    def _fix_proper_nouns(self, sentence: str) -> str:
        """
        Fix the proper nouns in the sentence by replacing them with the correct case from the database.

        Args:
            sentence (str): The sentence to fix.

        Returns:
            str: The fixed sentence.
        """
        ## Replace the potentially wrong case technology name with the correct case from the database
        # sentence = re.sub(tech, proper_name, sentence, re.IGNORECASE)
        return sentence

    def _refine_step_queries(self, steps: list[StepModel]) -> list[StepModel]:
        """
        Refine the step queries by replacing the technology names with the correct case from the database.

        Args:
            steps (list[StepModel]): The list of steps to refine.

        Returns:
            list[StepModel]: The refined list of steps.
        """

        steps = self._merge_steps(steps)
        return steps

    def load_people(self, query: str) -> List[dict]:
        """
        Load people from the database using the query.
        Args:
            query (str): Natural language of the query to load people from the database.
        Returns:
            List[dict[str, str]]: A list of dict, containing the people information.
        """
        if isinstance(query, dict):
            query = query["query"]
        engine = create_engine(self.uri)
        tables = ["Companies", "Industries", "CompanyIndustries", "People"]

        sql_database = SQLDatabase(engine, include_tables=tables)
        query += "return all the people information using '*' in the resulting sql query."
        if self.limit:
            query += f" Place a limit of {self.limit} on the resulting query"

        query_engine = NLSQLTableQueryEngine(
            sql_database=sql_database,
            tables=tables,
        )
        return_dict = []
        r: Response = query_engine.query(str(query))
        if r.metadata and "sql_query" in r.metadata:
            sql_query = r.metadata["sql_query"]
            print("##", sql_query)
            with self.sql_database.engine.connect() as connection:
                result = connection.execute(text(sql_query))
                for item in result.fetchall():
                    return_dict.append({k: v for k, v in zip(item._fields, item._t)})
        return return_dict

    def load_companies(self, query: str) -> List[dict]:
        """
        Load companies from the database using the query.
        Args:
            query (str): Natural language of the query to load companies from the database.
        Returns:
            List[dict]: A list of dict, containing the company information.
        """
        if isinstance(query, dict):
            query = query["query"]
        engine = create_engine(self.uri)
        tables = ["Companies", "Industries", "CompanyIndustries", "People"]
        query += "Return all the company information using '*' in the resulting sql query."
        if self.limit:
            query += f" place a limit of {self.limit} on the resulting query"

        sql_database = SQLDatabase(engine, include_tables=tables)

        query_engine = NLSQLTableQueryEngine(
            sql_database=sql_database,
            tables=tables,
        )
        return_dict = []
        r: Response = query_engine.query(str(query))
        if r.metadata and "sql_query" in r.metadata:
            sql_query = r.metadata["sql_query"]
            print("##", sql_query)
            with self.sql_database.engine.connect() as connection:
                result = connection.execute(text(sql_query))
                for item in result.fetchall():
                    return_dict.append({k: v for k, v in zip(item._fields, item._t)})
        return return_dict

    def get_return_query(self, return_result: QueryReturn) -> str:
        query_list = []
        try:
            source = return_result.sources[-1]
            for raw_output in source.raw_output:
                print("   ###########")
                sm: StepModel = raw_output
                query_list.append(sm.sentence)
            return " ".join(query_list)
        except:
            raise
