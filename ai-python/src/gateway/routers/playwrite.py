from pydantic import BaseModel
from playwright.async_api import async_playwright
import re
from fastapi import APIRouter, Depends
from bs4 import BeautifulSoup
# from src.chatflow_langchain.utils.playwright_info_fetcher import PageInfoFetcher
from typing import List
from src.gateway.jwt_decode import get_user_data
from src.chatflow_langchain.utils.url_validator import URLCheckerService

router = APIRouter()

class VideoRequest(BaseModel):
    url: str

async def get_fathom_transcript_with_playwright(url: str) -> str:
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(url)

        await page.wait_for_load_state("networkidle")

        # Use BeautifulSoup to parse the page source
        soup = BeautifulSoup(await page.content(), 'html.parser')
        entries = soup.find_all(['figcaption', 'blockquote'])

        output = []
        current_speaker = ""
        current_text = ""
        for entry in entries:
            text = entry.get_text(strip=True)
            if entry.name == 'figcaption':
                if current_text:
                    output.append(f"{current_speaker}: {current_text.strip()}")
                current_speaker = text
                current_text = ""
            elif entry.name == 'blockquote':
                if current_text:
                    current_text += " " + text
                else:
                    current_text = text

        if current_text:
            output.append(f"{current_speaker}: {current_text.strip()}")

        await browser.close()
        return "\n\n".join(output)



@router.post("/transcript")
async def get_transcript(request: VideoRequest):
    transcript = await get_fathom_transcript_with_playwright(request.url)
    print("transcript", transcript)
    return {"transcript": transcript}

class MultiPageInfoRequest(BaseModel):
    url: List[str]
class SinglePageInfoRequest(BaseModel):
    url: str

# @router.post("/page_info")
# async def get_page_info(page_request: SinglePageInfoRequest,current_user=Depends(get_user_data)):
#     # checker = URLCheckerService(base_name=page_request.url)
#     # reachable, not_reachable = await checker.check_urls_async()

#     # if not reachable:
#     #     response = {"url": None, "domain": None, "logo": None, "title": None, "snippet": None}
#     #     return response
    
#     fetcher = PageInfoFetcher(timeout_ms=5000)
#     response = await fetcher.fetch_single_page_info(page_request.url)
#     return response

# @router.post("/multi_page_info")
# async def get_multi_page_info(page_request: MultiPageInfoRequest,current_user=Depends(get_user_data)):
#     fetcher = PageInfoFetcher(timeout_ms=5000)
#     response = await fetcher.fetch_multiple_pages_info(page_request.url)
#     return response
