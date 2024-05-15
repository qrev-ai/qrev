import unittest
from unittest.mock import Mock, patch

from qai.agent.tools.google.google_places import (
    Circle,
    GooglePlaces,
    PlaceField,
    SearchNearbyField,
    TextSearchField,
)


class TestGooglePlaces(unittest.TestCase):

    def setUp(self):
        self.google_places = GooglePlaces()
        self.headers = {"Content-Type": "application/json", "X-Goog-Api-Key": "your_api_key"}

    def test_post_init_no_api_key(self):
        """Test that ValueError is raised if GOOGLE_PLACES_API_KEY is not in environment."""
        with patch.dict("os.environ", {}, clear=True):
            with self.assertRaises(ValueError):
                GooglePlaces()

    @patch("requests.post")
    def test_text_search_successful(self, mock_post):
        """Test successful text search request."""
        mock_post.return_value = Mock(status_code=200)
        mock_post.return_value.json.return_value = {"result": "success"}
        fields = GooglePlaces.get_text_search_fields(TextSearchField.basic)
        response = self.google_places.text_search("coffee", fields)
        self.assertEqual(response, {"result": "success"})

    @patch("requests.post")
    def test_search_nearby_error(self, mock_post):
        """Test handling of 400 response with error from search_nearby."""
        mock_post.return_value = Mock(status_code=400)
        mock_post.return_value.content = b"Error message"
        circle = Circle(latitude=0.0, longitude=0.0, radius=100.0)
        with self.assertRaises(ValueError):
            self.google_places.search_nearby(
                included_types=["cafe"], circle=circle, fields=SearchNearbyField.basic
            )

    @patch("requests.post")
    def test_get_place_successful(self, mock_post):
        """Test successful get_place request."""
        mock_post.return_value = Mock(status_code=200)
        mock_post.return_value.json.return_value = {"details": "some details"}
        fields = GooglePlaces.get_place_fields(PlaceField.basic)
        response = self.google_places.get_place("123", fields)
        self.assertEqual(response, {"details": "some details"})

    def test_get_fields_functionality(self):
        """Test that _get_fields function accumulates fields correctly when include_below is True."""
        result = GooglePlaces._get_fields(
            3, True, {0: ["id"], 1: ["name"], 2: ["details"], 3: ["all"]}
        )
        expected = ["id", "name", "details", "all"]
        self.assertEqual(result, expected)


if __name__ == "__main__":
    testmethod = ""

    if testmethod:
        suite = unittest.TestSuite()
        suite.addTest(TestGooglePlaces(testmethod))
        runner = unittest.TextTestRunner().run(suite)
    else:
        unittest.main()
