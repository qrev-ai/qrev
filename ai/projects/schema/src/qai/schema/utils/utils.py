import re
from enum import StrEnum


class MatchingAlgorithm(StrEnum):
    BAG_OF_WORDS = "Bag of Words"
    EXACT = "Exact"
    REGEX = "Regex"
    CONTAINS = "Contains"


def clean_domain(domain: str) -> str:
    # Remove protocol if present
    domain = re.sub(r"^https?://", "", domain)

    # Remove www. if present
    domain = re.sub(r"^www\.", "", domain)

    # Remove any trailing slash
    domain = domain.rstrip("/")

    return domain


def title_matches(
    title: str,
    filter_titles: list[str],
    matching_algorithms: list[MatchingAlgorithm] = [
        MatchingAlgorithm.BAG_OF_WORDS,
        MatchingAlgorithm.CONTAINS,
    ],
) -> bool:
    if not title:
        return False
    filter_titles_bow = [set(title.split(" ")) for title in filter_titles]

    for algorithm in matching_algorithms:
        if algorithm == MatchingAlgorithm.BAG_OF_WORDS:
            job_title = set(title.split(" "))
            if any(job_title.issubset(title) for title in filter_titles_bow):
                return True
        elif algorithm == MatchingAlgorithm.EXACT:
            if title in filter_titles:
                return True
        elif algorithm == MatchingAlgorithm.REGEX:
            if any(re.search(title, title, re.IGNORECASE) for title in filter_titles):
                return True
        elif algorithm == MatchingAlgorithm.CONTAINS:
            if any(title in title for title in filter_titles):
                return True
    return False
