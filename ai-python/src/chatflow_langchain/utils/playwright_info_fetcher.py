import asyncio
import contextlib
from typing import List, Dict, Any
import aiohttp
import tldextract
import favicon
from aiohttp import ClientSession, ClientTimeout
# from playwright.async_api import async_playwright, TimeoutError as PlaywrightTimeoutError
# from playwright._impl._errors import TargetClosedError
from tldextract import extract
from src.logger.default_logger import logger

# class PageInfoFetcher:
#     def __init__(self, default_logo_url: str = None, timeout_ms: int = 5000):
#         self.default_logo_url = default_logo_url
#         self.timeout_ms = timeout_ms

#     async def fetch_title_meta_and_html(self, url: str) -> Dict[str, Any]:
#         """
#         Fetch the title, meta description, and HTML content of a webpage using Playwright.
#         """
#         try:
#             async with async_playwright() as p:
#                 browser = await p.chromium.launch(headless=True)
#                 context = await browser.new_context()
#                 page = await context.new_page()

#                 await page.goto(url, timeout=self.timeout_ms, wait_until="domcontentloaded")
#                 await page.route("**/*", lambda route, request: route.abort() if request.resource_type in {"image", "stylesheet", "font", "media", "xhr", "fetch"} else route.continue_())

#                 title = await page.title()
#                 meta_description = await page.locator("meta[name='description']").get_attribute("content")

#                 await context.close()
#                 await browser.close()
#                 await page.close()

#                 return {
#                     "title": title,
#                     "meta_description": meta_description,
#                 }
#         except (PlaywrightTimeoutError, TargetClosedError, Exception):
#             return {"title": None, "meta_description": None}

#     async def fetch_title_meta_and_html_safe(self, url: str) -> Dict[str, Any]:
#         """
#         Wrapper for `fetch_title_meta_and_html` with asyncio timeout handling.
#         """
#         task = asyncio.create_task(self.fetch_title_meta_and_html(url))
#         try:
#             return await asyncio.wait_for(task, timeout=self.timeout_ms / 1000)
#         except asyncio.TimeoutError:
#             task.cancel()
#             with contextlib.suppress(asyncio.CancelledError, Exception):
#                 await task
#             return {"title": None, "meta_description": None}

#     async def fetch_logo(self, session: ClientSession, website_url: str) -> str:
#         """
#         Attempt to fetch the favicon URL for a given website.
#         """
#         try:
#             if not website_url.startswith(("http://", "https://")):
#                 website_url = f"https://{website_url}"

#             icons = await asyncio.to_thread(favicon.get, website_url, timeout=5)
#             return icons[0].url if icons else None
#         except Exception:
#             return self.default_logo_url

#     def fetch_domain_name(self, website_url: str) -> str:
#         """
#         Extracts and returns the domain name from a URL.
#         """
#         try:
#             extracted = tldextract.extract(website_url)
#             return extracted.domain or "unknown"
#         except Exception:
#             return "unknown"

#     async def fetch_single_page_info(self, url: str) -> Dict[str, Any]:
#         """
#         Fetches all page info and returns it as a JSON object.
#         """
#         title_meta_html = await self.fetch_title_meta_and_html_safe(url)

#         async with aiohttp.ClientSession(timeout=ClientTimeout(total=5)) as session:
#             logo_url = await self.fetch_logo(session, url)

#         return {
#             "url": url,
#             "domain": self.fetch_domain_name(url),
#             "logo": logo_url,
#             "title": title_meta_html.get("title") or None,
#             "snippet": title_meta_html.get("meta_description") or None,
#         }

#     async def fetch_multiple_pages_info(self, url: List[str]) -> List[Dict[str, Any]]:
#         """
#         Fetches page info for multiple URLs concurrently and returns a list of JSON objects.
#         """
#         results = await asyncio.gather(
#             *(self.fetch_single_page_info(web) for web in url),
#             return_exceptions=True
#         )

#         page_info_list = []
#         for result in results:
#             if isinstance(result, Exception):
#                 page_info_list.append({"title": None, "meta_description": None})
#             else:
#                 page_info_list.append(result)

#         return page_info_list

class LogoFetcherService:
    def fetch_domain_name(self, website_url: str) -> str:
        """Extract the domain name from a given URL."""
        try:
            extracted = extract(website_url)
            return extracted.domain or "google"
        except Exception:
            return "google"

    def google_favicon_url(self, url: str) -> str:
        """Generate Google favicon URL for a given domain."""
        try:
            return f"https://www.google.com/s2/favicons?sz=64&domain_url={url}"
        except Exception as e:
            logger.exception(f"Error generating favicon for URL {url}: {e}")
            return "https://www.google.com/s2/favicons?sz=64&domain_url=google.com"

    async def _fetch_logo_for_url(self, url: str) -> Dict[str, str]:
        """Prepare logo metadata for a single URL."""
        try:
            domain = self.fetch_domain_name(url)
            logo_url = self.google_favicon_url(url)
            return {
                "original_url": url,
                "domain": domain,
                "logo_url": logo_url
            }
        except Exception as e:
            return {
                "original_url": url,
                "domain": None,
                "logo_url": None
            }

    async def get_logos_async(self, urls: List[str]) -> List[Dict[str, str]]:
        """Fetch logos asynchronously for a list of unique URLs."""
        unique_urls = list(set(urls))
        tasks = [self._fetch_logo_for_url(url) for url in unique_urls]
        return await asyncio.gather(*tasks, return_exceptions=False)