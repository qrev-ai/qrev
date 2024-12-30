
open_func = open
try:
    import fsspec  # type: ignore

    open_func = fsspec.open
    has_fsspec = True
except ImportError:
    has_fsspec = False

try:
    from smart_open import open as smart_open  # type: ignore

    open_func = smart_open
    has_smart_open = True
except ImportError:
    has_smart_open = False
