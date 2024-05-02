import os

from llama_index.core.llms.llm import LLM
from llama_index.core.tools.tool_spec.base import BaseToolSpec

from qai.agent import ROOT_DIR
from qai.agent.models import OutreachType

PROJ_DIR = os.path.dirname(os.path.dirname(os.path.dirname(ROOT_DIR)))


class OutreachToolSpec(BaseToolSpec):
    """Simple Find Outreach tool."""

    spec_functions = ["find_outreach"]

    def __init__(self, llm: LLM = None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.llm = llm

    def find_outreach(self, outreach_types: list[OutreachType]) -> list[OutreachType]:
        """
        Find the correct outreach types given a list of outreach types.
        Args:
            outreach_types: The list of outreach types to find the correct outreach type for.
        Returns:
            The list of outreach types.
        """
        ## Input is not perfect from the llm, it can be a list of steps but in dict form
        ## or it can be a dict with a list of dicts
        ## comes in as a list of steps but in dict form
        if isinstance(outreach_types, dict):
            outreach_types = outreach_types["outreach_types"]
        outreach_types = [OutreachType(**outreach_type) for outreach_type in outreach_types]
        outreach_types = self._refine_step_queries(outreach_types)
        print(f"Returning types = {outreach_types}")
        return outreach_types
