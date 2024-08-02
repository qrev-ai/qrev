import os
from functools import wraps
from unittest.mock import Mock, patch

import pytest

from qai.agent.tools.google.google_places import (
    Circle,
    GooglePlaces,
    PlaceField,
    SearchNearbyField,
    TextSearchField,
)


def skip_env_not_set():
    env_var = "GOOGLE_PLACES_API_KEY"

    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if not os.environ.get(env_var):
                pytest.skip(f"Skipping test because {env_var} is not set")
            return func(*args, **kwargs)

        return wrapper

    return decorator


@pytest.fixture
def headers():
    return {"Content-Type": "application/json", "X-Goog-Api-Key": "your_api_key"}

@skip_env_not_set()
def test_post_init_no_api_key():
    """Test that ValueError is raised if GOOGLE_PLACES_API_KEY is not in environment."""
    with patch.dict("os.environ", {}, clear=True):
        with pytest.raises(ValueError):
            GooglePlaces()

@skip_env_not_set()
@patch("requests.post")
def test_text_search_successful(mock_post):
    """Test successful text search request."""
    mock_post.return_value = Mock(status_code=200)
    mock_post.return_value.json.return_value = {"result": "success"}
    fields = GooglePlaces.get_text_search_fields(TextSearchField.basic)
    response = GooglePlaces().text_search("coffee", fields)
    assert response == {"result": "success"}

@skip_env_not_set()
@patch("requests.post")
def test_search_nearby_error(mock_post):
    """Test handling of 400 response with error from search_nearby."""
    mock_post.return_value = Mock(status_code=400)
    mock_post.return_value.content = b"Error message"
    circle = Circle(latitude=0.0, longitude=0.0, radius=100.0)
    with pytest.raises(ValueError):
        GooglePlaces().search_nearby(
            included_types=["cafe"], circle=circle, fields=SearchNearbyField.basic
        )

@skip_env_not_set()
@patch("requests.post")
def test_get_place_successful(mock_post):
    """Test successful get_place request."""
    mock_post.return_value = Mock(status_code=200)
    mock_post.return_value.json.return_value = {"details": "some details"}
    fields = GooglePlaces.get_place_fields(PlaceField.basic)
    response = GooglePlaces().get_place("123", fields)
    assert response == {"details": "some details"}

@skip_env_not_set()
def test_get_fields_functionality():
    """Test that _get_fields function accumulates fields correctly when include_below is True."""
    result = GooglePlaces._get_fields(3, True, {0: ["id"], 1: ["name"], 2: ["details"], 3: ["all"]})
    expected = ["id", "name", "details", "all"]
    assert result == expected

if __name__ == "__main__":
    pytest.main(["-v", __file__])