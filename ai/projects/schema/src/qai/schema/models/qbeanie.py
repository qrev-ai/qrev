from typing import TYPE_CHECKING, TypeAlias, TypeVar

from beanie import Document
from beanie import Link as BeanieLink
from beanie.odm.queries.find import FindOne as BeanieFindOne

if TYPE_CHECKING:
    _T = TypeVar("_T", bound=Document)
    Link: TypeAlias = _T
    FindOne: TypeAlias = _T
else:
    Link = BeanieLink
    FindOne = BeanieFindOne

