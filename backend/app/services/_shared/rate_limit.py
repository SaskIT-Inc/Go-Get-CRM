"""Sliding-window per-key rate limiter — the same in-process bucket
algorithm used to live copy-pasted four times (auth resend/login, public
chatbot/webhook). In-process only, fine for this project's single-container
deployment; swap for a shared store (e.g. Redis) if this is ever scaled to
multiple replicas.
"""

import time

from fastapi import HTTPException, status


class RateLimiter:
    def __init__(self, window_seconds: int, max_requests: int):
        self.window_seconds = window_seconds
        self.max_requests = max_requests
        self._buckets: dict[str, list[float]] = {}

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        bucket = self._buckets.setdefault(key, [])
        cutoff = now - self.window_seconds
        while bucket and bucket[0] < cutoff:
            bucket.pop(0)
        if len(bucket) >= self.max_requests:
            return False
        bucket.append(now)
        return True

    def enforce(self, key: str, message: str) -> None:
        if not self.allow(key):
            raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, message)
