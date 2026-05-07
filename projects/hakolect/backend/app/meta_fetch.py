import asyncio
import aiohttp
from typing import Optional, Dict, Any
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup


async def fetch_meta(url: str) -> Dict[str, Any]:
    """
    Fetch URL metadata: title, description, OGP image, favicon.
    Never raises - returns partial results on any failure.
    """
    result: Dict[str, Any] = {
        "url": url,
        "title": None,
        "description": None,
        "ogp_image_url": None,
        "favicon_url": None,
    }

    try:
        timeout = aiohttp.ClientTimeout(total=10)
        headers = {
            "User-Agent": (
                "Mozilla/5.0 (compatible; Hakolect/1.0; +https://tool.terracek.com/hakolect)"
            )
        }
        async with aiohttp.ClientSession(timeout=timeout, headers=headers) as session:
            async with session.get(url, allow_redirects=True, ssl=False) as response:
                if response.status >= 400:
                    return result
                content_type = response.headers.get("Content-Type", "")
                if "text/html" not in content_type:
                    return result
                html = await response.text(errors="replace")
                final_url = str(response.url)

        soup = BeautifulSoup(html, "html.parser")
        parsed_base = urlparse(final_url)
        base_url = f"{parsed_base.scheme}://{parsed_base.netloc}"

        # Title: og:title -> <title>
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            result["title"] = og_title["content"].strip()
        else:
            title_tag = soup.find("title")
            if title_tag and title_tag.string:
                result["title"] = title_tag.string.strip()

        # Description: og:description -> meta[name=description]
        og_desc = soup.find("meta", property="og:description")
        if og_desc and og_desc.get("content"):
            result["description"] = og_desc["content"].strip()
        else:
            meta_desc = soup.find("meta", attrs={"name": "description"})
            if meta_desc and meta_desc.get("content"):
                result["description"] = meta_desc["content"].strip()

        # OGP image
        og_image = soup.find("meta", property="og:image")
        if og_image and og_image.get("content"):
            img = og_image["content"].strip()
            result["ogp_image_url"] = _resolve_url(img, base_url)

        # Favicon: apple-touch-icon -> link[rel=icon] -> /favicon.ico
        favicon = _extract_favicon(soup, base_url)
        result["favicon_url"] = favicon

    except asyncio.TimeoutError:
        pass
    except Exception:
        pass

    return result


def _resolve_url(url: str, base_url: str) -> str:
    if url.startswith("http://") or url.startswith("https://"):
        return url
    if url.startswith("//"):
        return "https:" + url
    return urljoin(base_url, url)


def _extract_favicon(soup: BeautifulSoup, base_url: str) -> Optional[str]:
    # apple-touch-icon
    apple = soup.find("link", rel=lambda r: r and "apple-touch-icon" in r)
    if apple and apple.get("href"):
        return _resolve_url(apple["href"], base_url)

    # link[rel~=icon] (shortcut icon, icon)
    for rel_val in ("shortcut icon", "icon"):
        icon = soup.find("link", rel=lambda r: r and rel_val in " ".join(r).lower())
        if icon and icon.get("href"):
            href = icon["href"]
            # skip SVG and data URIs for simplicity
            if href.startswith("data:"):
                continue
            return _resolve_url(href, base_url)

    # Fallback: /favicon.ico
    return f"{base_url}/favicon.ico"
