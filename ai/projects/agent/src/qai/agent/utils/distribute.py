import atexit
import multiprocessing
import threading
import traceback
from logging import getLogger
from queue import Queue
from typing import Any, Callable

log = getLogger(__name__)
pool_id = 0

pool_handlers: dict[int, "PoolHandler"] = {}


class Worker:
    """
    A worker class that can be used to distribute work across multiple processes.
    """
    def __init__(
        self,
        func: Callable,
        results_queue: Queue,
        error_queue: Queue,
        nexpected_results: int = None,
        on_complete: Callable = None,
    ):
        self.func = func
        self.results_queue = results_queue
        self.error_queue = error_queue

        self.on_complete = on_complete
        self.nexpected_results = nexpected_results

    def _on_complete(self):
        try:
            self.on_complete(self.results_queue.qsize(), self.error_queue.qsize())
        except Exception as e:
            log.error(f"Error in on_complete: {e}")
            self.on_complete(-1, 1)

    def __call__(self, *args, **kwargs):
        try:
            log.debug(f"Worker: Processing {self.func} args={args} with kwargs={kwargs}")
            result = self.func(*args, **kwargs)

            self.results_queue.put(result)
            return result
        except Exception as e:
            # Send error information to the main process via error_queue
            log.error(traceback.format_exc())
            log.error(f"Worker: Error Processing {self.func} args={args} with kwargs={kwargs}")

            self.error_queue.put(e)
            return None
        finally:
            # print(len(self.successes) + len(self.errors), self.nexpected_results)
            if self.on_complete:
                ncompleted = self.results_queue.qsize() + self.error_queue.qsize()

                if self.on_complete and self.nexpected_results == ncompleted:
                    self._on_complete()


class PoolHandler:
    """
    A PoolHandler class that can be used to manage a pool of processes.
    """
    def __init__(
        self,
        pool_id: int,
        pool: multiprocessing.Pool,
        results_queue: Queue,
        error_queue: Queue,
        manager: multiprocessing.Manager,
    ):
        self.pool_id = pool_id
        self.pool = pool
        self.results_queue = results_queue
        self.error_queue = error_queue
        self.manager = manager
        self.results = []
        self.errors = []

    def close(self):
        self.pool.close()
        self.pool.join()
        pool_handlers.pop(self.pool_id, None)

    def _get_results(self):
        while not self.results_queue.empty():
            a = self.results_queue.get()
            self.results.append(a)
        while not self.error_queue.empty():
            self.errors.append(self.error_queue.get())
        return self.results, self.errors

    def get_results(self):
        return self._get_results()[0]

    def get_errors(self):
        return self._get_results()[1]

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()


def distribute(
    func,
    args_list: list[Any] = None,
    kwargs_list: list[Any] = None,
    nprocs: int = None,
    callback: Callable = None,
    error_callback: Callable = None,
    on_complete: Callable = None,
):
    """
    Distribute a function across multiple processes.
    Args:
        func (Callable): The function to distribute.
        args_list (list): A list of arguments to pass to the function.
        kwargs_list (list): A list of keyword arguments to pass to the function.
        nprocs (int): The number of processes to use.
        callback (Callable): A callback function to call when the function completes.
        error_callback (Callable): A callback function to call when an error occurs.
        on_complete (Callable): A callback function to call when all functions have completed.
            on_complete(successes: List, errors: List)
    """
    pool_handler = _distribute(
        func,
        args_list=args_list,
        kwargs_list=kwargs_list,
        nprocs=nprocs,
        callback=callback,
        error_callback=error_callback,
        on_complete=on_complete,
    )
    # Close the pool and wait for work to finish
    pool_handler.close()
    results = pool_handler.get_results()
    return results


def adistribute(
    func,
    args_list: list[Any] = None,
    kwargs_list: list[Any] = None,
    nprocs: int = None,
    callback: Callable = None,
    error_callback: Callable = None,
    on_complete: Callable = None,
) -> PoolHandler:
    """
    Start a distribution across multiple processes and return immediately.
    Args:
        func (Callable): The function to distribute.
        args_list (list): A list of arguments to pass to the function.
        kwargs_list (list): A list of keyword arguments to pass to the function.
        nprocs (int): The number of processes to use.
        callback (Callable): A callback function to call when the function completes.
        error_callback (Callable): A callback function to call when an error occurs.
        on_complete (Callable): A callback function to call when all functions have completed.
            on_complete(successes: List, errors: List)
    """
    pool_handler = _distribute(
        func,
        args_list=args_list,
        kwargs_list=kwargs_list,
        nprocs=nprocs,
        callback=callback,
        error_callback=error_callback,
        on_complete=on_complete,
    )

    with threading.Lock():
        global pool_id
        pool_handlers[pool_handler.pool_id] = pool_handler
        pool_id += 1
    return pool_handler


def _distribute(
    func,
    args_list: list[Any] = None,
    kwargs_list: list[Any] = None,
    nprocs: int = None,
    callback: Callable = None,
    error_callback: Callable = None,
    on_complete: Callable = None,
) -> PoolHandler:
    """
    Distribute a function across multiple processes.
    Args:
        func (Callable): The function to distribute.
        args_list (list): A list of arguments to pass to the function.
        kwargs_list (list): A list of keyword arguments to pass to the function.
        nprocs (int): The number of processes to use.
        callback (Callable): A callback function to call when the function completes.
        error_callback (Callable): A callback function to call when an error occurs.
        on_complete (Callable): A callback function to call when all functions have completed.
            on_complete(successes: List, errors: List)
    """
    # Creating a Queue
    manager = multiprocessing.Manager()

    nprocs = nprocs or multiprocessing.cpu_count()
    if args_list is None and kwargs_list is None:
        raise ValueError("args_list and kwargs_list cannot both be None")
    size_args = len(args_list) if args_list else 0
    size_kwargs = len(kwargs_list) if kwargs_list else 0
    size = max(size_args, size_kwargs)
    if not args_list:
        args_list = [None] * size
    if kwargs_list is None:
        kwargs_list = [{}] * size  # Empty dictionaries for kwargs if none provided

    ## Create a pool of processes
    pool = multiprocessing.Pool(processes=nprocs)
    results_queue = manager.Queue()
    error_queue = manager.Queue()

    worker = Worker(
        func=func,
        results_queue=results_queue,
        error_queue=error_queue,
        nexpected_results=size,
        on_complete=on_complete,
    )

    ## Distribute the work
    for i in range(size):
        args = (args_list[i],) if i < size_args else ()
        kwargs = kwargs_list[i] if i < size_kwargs else {}
        pool.apply_async(
            worker,
            args=args,
            kwds=kwargs,
            callback=callback,
            error_callback=error_callback,
        )
    ph = PoolHandler(pool_id, pool, results_queue, error_queue, manager)
    return ph


def wait_all():
    """Wait for all pool handlers to finish and close."""
    for k in list(pool_handlers.keys()):
        ph = pool_handlers.pop(k, None)
        try:
            ph.close()
        except Exception as e:
            log.error(f"Error closing pool handler: {e}")


atexit.register(wait_all)
