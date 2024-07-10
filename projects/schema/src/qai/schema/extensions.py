import asyncio
from abc import abstractmethod
from typing import (
    Any,
    Dict,
    List,
    Mapping,
    Optional,
    Self,
    Sequence,
    Type,
    TypeVar,
    Union,
)
from urllib.parse import urlparse

from beanie import Document, View
from beanie.exceptions import CollectionWasNotInitialized
from beanie.odm.actions import ActionDirections, EventTypes, wrap_with_actions
from beanie.odm.documents import DocType, DocumentProjectionType
from beanie.odm.fields import WriteRules
from beanie.odm.settings.document import DocumentSettings
from beanie.odm.utils.self_validation import validate_self_before
from beanie.odm.utils.state import save_state_after
from motor.motor_asyncio import AsyncIOMotorCollection
from pydantic._internal._model_construction import ModelMetaclass
from pymongo.client_session import ClientSession

T = TypeVar("T", bound=Document)
ET = TypeVar("ET", bound="ExtendedDocument")

offline_settings = DocumentSettings()

# Create a global registry dictionary
extended_document_registry: dict[str, Any] = {}


# Define the metaclass for registering subclasses
class ExtendedDocumentMeta(type):
    def __new__(cls, name, bases, dct):
        new_class = super().__new__(cls, name, bases, dct)
        extended_document_registry[name] = new_class
        return new_class


# Define a combined metaclass
class CombinedMeta(ExtendedDocumentMeta, ModelMetaclass):
    pass


class ExtendedDocument(Document, metaclass=CombinedMeta):

    @classmethod
    def get_motor_collection(cls) -> AsyncIOMotorCollection:
        try:
            return super().get_motor_collection()
        except CollectionWasNotInitialized:
            """We don't mind if the collection is not initialized
            until we actually need the collection for db interactions
            """
            return None  # type: ignore

    @classmethod
    async def load(
        cls: type[ET],
        projection_model: Type["DocumentProjectionType"] = None,  # type: ignore
        session: Optional[ClientSession] = None,
        ignore_cache: bool = False,
        fetch_links: bool = False,
        with_children: bool = False,
        nesting_depth: Optional[int] = None,
        nesting_depths_per_field: Optional[Dict[str, int]] = None,
        *args: Union[Mapping[str, Any], bool],
    ) -> Optional[ET]:
        raise NotImplementedError("load must be implemented in the subclass of Extended")
        if not args:
            fields = cls.Settings.equality_fields
            args = tuple([params])  # type: ignore
        doc = await cls.find_one(
            args[0],
            projection_model=projection_model,
            session=session,
            ignore_cache=ignore_cache,
            fetch_links=fetch_links,
            with_children=with_children,
            nesting_depth=nesting_depth,
            nesting_depths_per_field=nesting_depths_per_field,
        )
        return doc

    @classmethod
    async def find_many_fetch(cls, *args) -> list[Self]:
        if args:
            ecs = await cls.find_many(*args).to_list()
        else:
            ecs = await cls.find_all().to_list()

        await asyncio.gather(*[ec.fetch_all_links() for ec in ecs])
        return ecs

    @wrap_with_actions(EventTypes.SAVE)
    @save_state_after
    @validate_self_before
    async def upsert(  # type: ignore
        self: ET,
        *args: Union[Mapping[str, Any], bool],
        projection_model: Type["DocumentProjectionType"] = None,  # type: ignore
        ignore_cache: bool = False,
        fetch_links: bool = False,
        with_children: bool = False,
        nesting_depth: Optional[int] = None,
        nesting_depths_per_field: Optional[Dict[str, int]] = None,
        session: Optional[ClientSession] = None,
        link_rule: WriteRules = WriteRules.DO_NOTHING,
        ignore_revision: bool = False,
        save_kwargs: Optional[dict] = None,  # type: ignore
        pymongo_kwargs: Optional[dict] = None,
        skip_actions: Optional[List[Union[ActionDirections, str]]] = None,
    ) -> ET:
        """
        Upsert document with provided args
        """
        if pymongo_kwargs is None:
            pymongo_kwargs = {}
        if save_kwargs is None:
            save_kwargs = {}

        ## Get all Settings.equality_fields
        if not args:
            params = self.match_query()
            args = tuple([params])  # type: ignore
        if skip_actions:
            raise NotImplementedError("skip_actions is not implemented")
        doc = await self.find_one(
            args[0],
            projection_model=projection_model,
            session=session,
            ignore_cache=ignore_cache,
            fetch_links=fetch_links,
            with_children=with_children,
            nesting_depth=nesting_depth,
            nesting_depths_per_field=nesting_depths_per_field,
        )

        if doc:
            return doc  # type: ignore
        return await self.save(
            session=session,
            link_rule=link_rule,
            ignore_revision=ignore_revision,
            **pymongo_kwargs,
        )

    @classmethod
    def from_str(cls: type[ET], s: str) -> ET:
        raise NotImplementedError("from_str must be implemented in the subclass of Extended")

    def __str__(self) -> str:
        """
        Return a string representation of the document. doesn't return the None fields
        """
        fields = []
        for field in self.dict().items():
            if field[1] is not None:
                fields.append(f"{field[0]}={field[1]}")
        return ", ".join(fields)

    def eq(self, other, nones_ok: bool = False, to_lower: bool = False):
        """
        Check if two documents are equal.
        Rules:
            1) If both have an id, compare the id.
            2) If any of the equality fields are None, return False unless nones_ok
            3) Compare the fields in equality_fields.
        """
        if not isinstance(other, self.__class__):
            return False
        if self.id is not None and other.id is not None:
            return self.id == other.id
        if not hasattr(self, "Settings") or not hasattr(self.Settings, "equality_fields"):
            raise ValueError("To use eq() equality_fields must be defined in Settings")

        ## iterate through fileds in equality_fields and compare them
        for field_name in self.Settings.equality_fields:
            val = getattr(self, field_name)
            if val is None and not nones_ok:
                return False
            try:
                other = getattr(other, field_name)
            except AttributeError:
                if not nones_ok:
                    return False
                other = None
            if to_lower:
                if isinstance(val, str):
                    val = val.lower()
                if isinstance(other, str):
                    other = other.lower()

            if val != other:
                return False
        return True

    def eq_none(self):
        if not hasattr(self, "Settings") or not hasattr(self.Settings, "equality_fields"):
            raise ValueError("To use eq_none() equality_fields must be defined in Settings")
        return all(
            getattr(self, field_name) is None for field_name in self.Settings.equality_fields
        )

    def match_query(self) -> dict[str, Any]:
        """
        Return a query that will match this document.
        """
        if not hasattr(self, "Settings") or not hasattr(self.Settings, "equality_fields"):
            raise ValueError("To use match_query() equality_fields must be defined in Settings")
        query = {}
        for field_name in self.Settings.equality_fields:
            query[field_name] = getattr(self, field_name)
        return query

    @staticmethod
    def get_base_url(url: str) -> str:
        if not url.startswith(("http://", "https://")):
            url = "http://" + url
        parsed_url = urlparse(url)

        # Get the hostname from parsed_url
        hostname = parsed_url.hostname
        if not hostname:
            raise ValueError(f"get_base_url: can't parse Invalid URL {url}")
        base_url = hostname[4:] if hostname.startswith("www.") else hostname

        return base_url

    async def load_self(self: ET) -> Optional[ET]:
        """
        ** Warning: This will overwrite any changes made to the document **
        Load self from the database
        """
        params = self.match_query()
        if not params:
            return None
        return await self.find_one(**params)


setattr(Document, "upsert", ExtendedDocument.upsert)


class DocExtensions:
    @wrap_with_actions(EventTypes.SAVE)
    @save_state_after
    @validate_self_before
    @abstractmethod
    async def upsert(  # type: ignore
        self: DocType,  # type: ignore
        *args: Union[Mapping[str, Any], bool],
        projection_model: Type["DocumentProjectionType"] = None,  # type: ignore
        ignore_cache: bool = False,
        fetch_links: bool = False,
        with_children: bool = False,
        nesting_depth: Optional[int] = None,
        nesting_depths_per_field: Optional[Dict[str, int]] = None,
        session: Optional[ClientSession] = None,
        link_rule: WriteRules = WriteRules.DO_NOTHING,
        ignore_revision: bool = False,
        save_kwargs: Optional[dict] = None,  # type: ignore
        pymongo_kwargs: Optional[dict] = None,
        skip_actions: Optional[list[ActionDirections | str]] = None,
    ) -> DocType: ...

    @abstractmethod
    def eq(self, other): ...

    @abstractmethod
    def eq_none(self): ...

    @staticmethod
    @abstractmethod
    def get_base_url(url): ...

    @classmethod
    @abstractmethod
    def from_str(cls, s: str): ...


def get_extended_documents(
    cls: type["Document"] = ExtendedDocument,
) -> list[type[Document] | type[View] | str]:
    return list(extended_document_registry.values())
