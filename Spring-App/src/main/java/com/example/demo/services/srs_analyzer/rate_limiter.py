import random
import time
from functools import wraps
from collections import defaultdict
import threading
import logging

logger = logging.getLogger(__name__)

class TokenBucket:
    """Token bucket algorithm for rate limiting."""
    def __init__(self, tokens_per_second, max_tokens):
        self.tokens_per_second = tokens_per_second
        self.max_tokens = max_tokens
        self.tokens = max_tokens
        self.last_update = time.time()
        self.lock = threading.Lock()

    def get_token(self):
        with self.lock:
            now = time.time()
            # Add new tokens based on elapsed time
            elapsed = now - self.last_update
            new_tokens = elapsed * self.tokens_per_second
            self.tokens = min(self.tokens + new_tokens, self.max_tokens)
            self.last_update = now

            if self.tokens >= 1:
                self.tokens -= 1
                return True
            return False

class RateLimiter:
    """Rate limiter implementation with per-client tracking."""
    def __init__(self):
        self.clients = defaultdict(lambda: TokenBucket(tokens_per_second=0.2, max_tokens=5))  # 5 requests per 5 seconds
        self.lock = threading.Lock()

    def is_allowed(self, client_id):
        with self.lock:
            return self.clients[client_id].get_token()

def rate_limit(max_retries=3, initial_delay=1.0):
    """
    Decorator to apply rate limiting with exponential backoff.
    Usage:
        @rate_limit(max_retries=3, initial_delay=1.0)
        def your_function():
            pass
    """
    rate_limiter = RateLimiter()

    def decorate(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            client_id = kwargs.get('client_id', 'default')
            delay = initial_delay

            for attempt in range(max_retries):
                if rate_limiter.is_allowed(client_id):
                    try:
                        return func(*args, **kwargs)
                    except Exception as e:
                        if "RATE_LIMIT_EXCEEDED" in str(e) and attempt < max_retries - 1:
                            logger.warning(f"Rate limit exceeded. Retrying in {delay:.2f} seconds. Attempt {attempt + 1}/{max_retries}")
                            time.sleep(delay + random.uniform(0, 1))  # Add jitter
                            delay *= 2  # Double the delay
                        else:
                            raise
                else:
                    wait_time = delay + random.uniform(0, 1)
                    logger.warning(f"Rate limit reached. Waiting {wait_time:.2f} seconds before retry. Attempt {attempt + 1}/{max_retries}")
                    time.sleep(wait_time)
                    delay *= 2

            raise Exception("Rate limit exceeded after maximum retries")
        return wrapper
    return decorate

def exponential_backoff(retries=3, initial_delay=1.0):
    """
    Decorator to retry a function with exponential backoff.
    Usage:
        @exponential_backoff(retries=3, initial_delay=1.0)
        def your_function():
            pass
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
                        wait_time = delay + random.uniform(0, 1)  # Add jitter
                        logger.warning(f"Rate limit exceeded. Retrying in {wait_time:.2f} seconds. Attempt {attempt + 1}/{retries}")
                        time.sleep(wait_time)
                        delay *= 2  # Double the delay
                    else:
                        raise
            return func(*args, **kwargs)
        return retry_function
    return decorate