"""Search tools — agents use these to research prospects and companies via web search.

Uses the connected LLM provider to generate research (since we don't have a
dedicated search API yet). Can be extended with Serper, Tavily, etc. later.
"""

import httpx


async def web_search(
    query: str,
    num_results: int = 5,
    **kwargs,
) -> list[dict]:
    """Search the web for information. Returns a list of results.

    Currently a stub that returns a placeholder. Extend with a real search
    API (Serper, Tavily, Brave Search) by adding the provider.
    """
    # TODO: Integrate a real search API (Serper, Tavily, Brave Search)
    # For now, return a structured note so the agent knows to use its training data
    return [
        {
            "title": f"Search results for: {query}",
            "snippet": (
                "Web search is not yet connected. Use your training knowledge to provide "
                "the best available information. Recommend the user connect a search API "
                "in Settings > Providers for real-time web data."
            ),
            "url": "",
        }
    ]


async def fetch_url(
    url: str,
    **kwargs,
) -> dict:
    """Fetch the text content of a URL."""
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url, headers={"User-Agent": "QRev/1.0"})
            if resp.status_code != 200:
                return {"success": False, "error": f"HTTP {resp.status_code}"}

            # Return first 5000 chars of text content
            text = resp.text[:5000]
            return {"success": True, "content": text, "url": str(resp.url)}
    except Exception as e:
        return {"success": False, "error": str(e)}
