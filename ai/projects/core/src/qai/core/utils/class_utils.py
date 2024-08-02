import inspect
from pathlib import Path


def get_full_class_name(cls_or_obj : type | object) -> str:
    """Get the full class name of a class or object."""
    cls = cls_or_obj if isinstance(cls_or_obj, type) else cls_or_obj.__class__
    
    module = cls.__module__
    if not module or module == "builtins":
        class_name = cls.__qualname__
    elif module == "__main__":
        file_path = Path(inspect.getfile(cls)).resolve()
        relative_path = file_path.relative_to(Path.cwd())
        module = ".".join(relative_path.with_suffix("").parts[1:])
        class_name = f"{module}.{cls.__qualname__}"
    else:
        class_name = f"{module}.{cls.__qualname__}"
    return class_name
