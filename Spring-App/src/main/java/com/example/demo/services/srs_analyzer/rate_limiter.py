import random
import time
from functools import wraps


def exponential_backoff(retries=3, initial_delay=1.0):
    """
    Decorator to retry a function with exponential backoff.
    """
    def decorate(func):
        @wraps(func)
        def retry_function(*args, **kwargs):
            delay = initial_delay
            for attempt in range(retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    if "RATE_LIMIT_EXCEEDED" in str(e) and attempt < retries - 1:
                        time.sleep(delay + random.uniform(0, 1))  # Add jitter
                        delay *= 2  # Double the delay
                    else:
                        raise
        return retry_function
    return decorate