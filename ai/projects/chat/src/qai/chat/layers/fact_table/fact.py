# from dataclasses import dataclass, field
# from qai.chat.layers.query_return import QueryReturn

# @dataclass
# class Fact(QueryReturn):
#     fact: str = ""
#     id: str = ""
#     answers: list[str] = field(default_factory=list) 
#     is_impossible: bool = False
#     title: str = ""
#     source_url: str = ""
#     source_type: str = ""
#     answers_type: str = ""
#     category: str = ""
#     company_name: str = ""

#     @property
#     def response(self):
#         return self.fact
