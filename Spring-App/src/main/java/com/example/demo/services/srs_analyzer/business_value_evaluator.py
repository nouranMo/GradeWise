import logging
import openai
from concurrent.futures import ThreadPoolExecutor
import functools
import time
import random
from functools import wraps, lru_cache
from dotenv import load_dotenv
import os


load_dotenv()
openai.api_key = os.getenv("api_key")

logger = logging.getLogger(__name__)

# Rate Limiting Decorator
def rate_limited(max_per_minute):
    """
    Decorator to limit the number of API calls per minute.
    """
    min_interval = 60.0 / max_per_minute

    def decorate(func):
        last_time_called = 0.0

        @wraps(func)
        def rate_limited_function(*args, **kwargs):
            nonlocal last_time_called
            elapsed = time.time() - last_time_called
            wait_time = min_interval - elapsed

            if wait_time > 0:
                time.sleep(wait_time)

            last_time_called = time.time()
            return func(*args, **kwargs)

        return rate_limited_function

    return decorate

# Exponential Backoff Decorator
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

# Async Operation Decorator
def async_operation(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        with ThreadPoolExecutor() as executor:
            future = executor.submit(func, *args, **kwargs)
            return future.result()
    return wrapper

# BusinessValueEvaluator Class
class BusinessValueEvaluator:
    def __init__(self):
        """
        Initialize the BusinessValueEvaluator.
        """
        logger.info("Initializing BusinessValueEvaluator")

    @lru_cache(maxsize=100)  # Cache up to 100 responses
    @rate_limited(max_per_minute=30)  # Apply rate limiting
    @exponential_backoff(retries=3, initial_delay=1.0)  # Apply exponential backoff
    @async_operation  # Make the function asynchronous
    def evaluate_business_value(self, text):
        """
        Evaluate the business value of a given text (e.g., system scope or document).
        Returns a business value score and explanation.
        """
        logger.info("Evaluating business value...")
        try:
            prompt = (
                f"Analyze the following text and evaluate its business value based on:\n"
                f"1. Alignment with business goals\n"
                f"2. Feasibility and cost-effectiveness\n"
                f"3. Innovation and competitive advantage\n"
                f"4. Scalability and maintainability\n"
                f"5. Compliance with industry standards\n\n"
                f"Text:\n"
                f"{text}\n\n"
                f"Provide a business value score (1-10) and a short explanation."
            )
            logger.debug(f"Prompt sent to OpenAI: {prompt[:200]}...")  # Log first 200 chars of prompt

            response = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",  # Use GPT-4 Turbo
                messages=[
                    {"role": "system", "content": "You are an expert in evaluating business documents."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7  # Adjust for creativity vs. consistency
            )

            result = response["choices"][0]["message"]["content"]
            logger.info("Business value evaluation completed.")
            return result
        except Exception as e:
            logger.error(f"Error evaluating business value: {str(e)}")
            raise RuntimeError(f"Error evaluating business value: {str(e)}")