"""
Google Places API Fields (for Places API (new))

Billing https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
"""

import os
import sys
from dataclasses import dataclass
from enum import Enum, IntEnum, StrEnum
from logging import getLogger
from typing import ClassVar, Optional

import requests
from pydantic import BaseModel, Field

log = getLogger(__name__)


class PlaceField(IntEnum):
    ids_only = 0
    location_only = 1
    basic = 2
    advanced = 3
    preferred = 4


class SearchNearbyField(IntEnum):
    basic = 0
    advanced = 1
    preferred = 2


class TextSearchField(IntEnum):
    ids_only = 0
    basic = 1
    advanced = 2
    preferred = 3


class LocationRestriction(BaseModel):
    pass


class Coordinate(BaseModel):
    latitude: float
    longitude: float


class Circle(LocationRestriction):
    center: Coordinate
    radius: float = Field(ge=0.0, le=50000.0)

    def __init__(self, latitude: float, longitude: float, radius: float):
        super().__init__(center=Coordinate(latitude=latitude, longitude=longitude), radius=radius)

    def to_location_restriction(self) -> dict:
        return {
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": self.center.latitude,
                        "longitude": self.center.longitude,
                    },
                    "radius": self.radius,
                }
            }
        }


class PlaceCategory(StrEnum):
    automotive = "automotive"
    business = "business"
    culture = "culture"
    education = "education"
    entertainment_and_recreation = "entertainment and recreation"
    finance = "finance"
    food_and_drink = "food and drink"
    geographical_areas = "geographical areas"
    government = "government"
    health_and_wellness = "health and wellness"
    lodging = "lodging"
    places_of_worship = "places of worship"
    services = "services"
    shopping = "shopping"
    sports = "sports"
    transportation = "transportation"


class PlaceType(Enum):
    car_dealer = ("automotive", "car_dealer")
    car_rental = ("automotive", "car_rental")
    car_repair = ("automotive", "car_repair")
    car_wash = ("automotive", "car_wash")
    electric_vehicle_charging_station = ("automotive", "electric_vehicle_charging_station")
    gas_station = ("automotive", "gas_station")
    parking = ("automotive", "parking")
    rest_stop = ("automotive", "rest_stop")
    farm = ("business", "farm")
    art_gallery = ("culture", "art_gallery")
    museum = ("culture", "museum")
    performing_arts_theater = ("culture", "performing_arts_theater")
    library = ("education", "library")
    preschool = ("education", "preschool")
    primary_school = ("education", "primary_school")
    school = ("education", "school")
    secondary_school = ("education", "secondary_school")
    university = ("education", "university")
    amusement_center = ("entertainment and recreation", "amusement_center")
    amusement_park = ("entertainment and recreation", "amusement_park")
    aquarium = ("entertainment and recreation", "aquarium")
    banquet_hall = ("entertainment and recreation", "banquet_hall")
    bowling_alley = ("entertainment and recreation", "bowling_alley")
    casino = ("entertainment and recreation", "casino")
    community_center = ("entertainment and recreation", "community_center")
    convention_center = ("entertainment and recreation", "convention_center")
    cultural_center = ("entertainment and recreation", "cultural_center")
    dog_park = ("entertainment and recreation", "dog_park")
    event_venue = ("entertainment and recreation", "event_venue")
    hiking_area = ("entertainment and recreation", "hiking_area")
    historical_landmark = ("entertainment and recreation", "historical_landmark")
    marina = ("entertainment and recreation", "marina")
    movie_rental = ("entertainment and recreation", "movie_rental")
    movie_theater = ("entertainment and recreation", "movie_theater")
    national_park = ("entertainment and recreation", "national_park")
    night_club = ("entertainment and recreation", "night_club")
    park = ("entertainment and recreation", "park")
    tourist_attraction = ("entertainment and recreation", "tourist_attraction")
    visitor_center = ("entertainment and recreation", "visitor_center")
    wedding_venue = ("entertainment and recreation", "wedding_venue")
    zoo = ("entertainment and recreation", "zoo")
    accounting = ("finance", "accounting")
    atm = ("finance", "atm")
    bank = ("finance", "bank")
    american_restaurant = ("food and drink", "american_restaurant")
    bakery = ("food and drink", "bakery")
    bar = ("food and drink", "bar")
    barbecue_restaurant = ("food and drink", "barbecue_restaurant")
    brazilian_restaurant = ("food and drink", "brazilian_restaurant")
    breakfast_restaurant = ("food and drink", "breakfast_restaurant")
    brunch_restaurant = ("food and drink", "brunch_restaurant")
    cafe = ("food and drink", "cafe")
    chinese_restaurant = ("food and drink", "chinese_restaurant")
    coffee_shop = ("food and drink", "coffee_shop")
    fast_food_restaurant = ("food and drink", "fast_food_restaurant")
    french_restaurant = ("food and drink", "french_restaurant")
    greek_restaurant = ("food and drink", "greek_restaurant")
    hamburger_restaurant = ("food and drink", "hamburger_restaurant")
    ice_cream_shop = ("food and drink", "ice_cream_shop")
    indian_restaurant = ("food and drink", "indian_restaurant")
    indonesian_restaurant = ("food and drink", "indonesian_restaurant")
    italian_restaurant = ("food and drink", "italian_restaurant")
    japanese_restaurant = ("food and drink", "japanese_restaurant")
    korean_restaurant = ("food and drink", "korean_restaurant")
    lebanese_restaurant = ("food and drink", "lebanese_restaurant")
    meal_delivery = ("food and drink", "meal_delivery")
    meal_takeaway = ("food and drink", "meal_takeaway")
    mediterranean_restaurant = ("food and drink", "mediterranean_restaurant")
    mexican_restaurant = ("food and drink", "mexican_restaurant")
    middle_eastern_restaurant = ("food and drink", "middle_eastern_restaurant")
    pizza_restaurant = ("food and drink", "pizza_restaurant")
    ramen_restaurant = ("food and drink", "ramen_restaurant")
    restaurant = ("food and drink", "restaurant")
    sandwich_shop = ("food and drink", "sandwich_shop")
    seafood_restaurant = ("food and drink", "seafood_restaurant")
    spanish_restaurant = ("food and drink", "spanish_restaurant")
    steak_house = ("food and drink", "steak_house")
    sushi_restaurant = ("food and drink", "sushi_restaurant")
    thai_restaurant = ("food and drink", "thai_restaurant")
    turkish_restaurant = ("food and drink", "turkish_restaurant")
    vegan_restaurant = ("food and drink", "vegan_restaurant")
    vegetarian_restaurant = ("food and drink", "vegetarian_restaurant")
    vietnamese_restaurant = ("food and drink", "vietnamese_restaurant")
    administrative_area_level_1 = ("geographical areas", "administrative_area_level_1")
    administrative_area_level_2 = ("geographical areas", "administrative_area_level_2")
    country = ("geographical areas", "country")
    locality = ("geographical areas", "locality")
    postal_code = ("geographical areas", "postal_code")
    school_district = ("geographical areas", "school_district")
    city_hall = ("government", "city_hall")
    courthouse = ("government", "courthouse")
    embassy = ("government", "embassy")
    fire_station = ("government", "fire_station")
    local_government_office = ("government", "local_government_office")
    police = ("government", "police")
    post_office = ("government", "post_office")
    dental_clinic = ("health and wellness", "dental_clinic")
    dentist = ("health and wellness", "dentist")
    doctor = ("health and wellness", "doctor")
    drugstore = ("health and wellness", "drugstore")
    hospital = ("health and wellness", "hospital")
    medical_lab = ("health and wellness", "medical_lab")
    pharmacy = ("health and wellness", "pharmacy")
    physiotherapist = ("health and wellness", "physiotherapist")
    spa = ("health and wellness", "spa")
    bed_and_breakfast = ("lodging", "bed_and_breakfast")
    campground = ("lodging", "campground")
    camping_cabin = ("lodging", "camping_cabin")
    cottage = ("lodging", "cottage")
    extended_stay_hotel = ("lodging", "extended_stay_hotel")
    farmstay = ("lodging", "farmstay")
    guest_house = ("lodging", "guest_house")
    hostel = ("lodging", "hostel")
    hotel = ("lodging", "hotel")
    lodging = ("lodging", "lodging")
    motel = ("lodging", "motel")
    private_guest_room = ("lodging", "private_guest_room")
    resort_hotel = ("lodging", "resort_hotel")
    rv_park = ("lodging", "rv_park")
    church = ("places of worship", "church")
    hindu_temple = ("places of worship", "hindu_temple")
    mosque = ("places of worship", "mosque")
    synagogue = ("places of worship", "synagogue")
    barber_shop = ("services", "barber_shop")
    beauty_salon = ("services", "beauty_salon")
    cemetery = ("services", "cemetery")
    child_care_agency = ("services", "child_care_agency")
    consultant = ("services", "consultant")
    courier_service = ("services", "courier_service")
    electrician = ("services", "electrician")
    florist = ("services", "florist")
    funeral_home = ("services", "funeral_home")
    hair_care = ("services", "hair_care")
    hair_salon = ("services", "hair_salon")
    insurance_agency = ("services", "insurance_agency")
    laundry = ("services", "laundry")
    lawyer = ("services", "lawyer")
    locksmith = ("services", "locksmith")
    moving_company = ("services", "moving_company")
    painter = ("services", "painter")
    plumber = ("services", "plumber")
    real_estate_agency = ("services", "real_estate_agency")
    roofing_contractor = ("services", "roofing_contractor")
    storage = ("services", "storage")
    tailor = ("services", "tailor")
    telecommunications_service_provider = ("services", "telecommunications_service_provider")
    travel_agency = ("services", "travel_agency")
    veterinary_care = ("services", "veterinary_care")
    auto_parts_store = ("shopping", "auto_parts_store")
    bicycle_store = ("shopping", "bicycle_store")
    book_store = ("shopping", "book_store")
    cell_phone_store = ("shopping", "cell_phone_store")
    clothing_store = ("shopping", "clothing_store")
    convenience_store = ("shopping", "convenience_store")
    department_store = ("shopping", "department_store")
    discount_store = ("shopping", "discount_store")
    electronics_store = ("shopping", "electronics_store")
    furniture_store = ("shopping", "furniture_store")
    gift_shop = ("shopping", "gift_shop")
    grocery_store = ("shopping", "grocery_store")
    hardware_store = ("shopping", "hardware_store")
    home_goods_store = ("shopping", "home_goods_store	")
    home_improvement_store = ("shopping", "home_improvement_store")
    jewelry_store = ("shopping", "jewelry_store")
    liquor_store = ("shopping", "liquor_store")
    market = ("shopping", "market")
    pet_store = ("shopping", "pet_store")
    shoe_store = ("shopping", "shoe_store")
    shopping_mall = ("shopping", "shopping_mall")
    sporting_goods_store = ("shopping", "sporting_goods_store")
    store = ("shopping", "store")
    supermarket = ("shopping", "supermarket")
    wholesaler = ("shopping", "wholesaler")
    athletic_field = ("sports", "athletic_field")
    fitness_center = ("sports", "fitness_center")
    golf_course = ("sports", "golf_course")
    gym = ("sports", "gym")
    playground = ("sports", "playground")
    ski_resort = ("sports", "ski_resort")
    sports_club = ("sports", "sports_club")
    sports_complex = ("sports", "sports_complex")
    stadium = ("sports", "stadium")
    swimming_pool = ("sports", "swimming_pool")
    airport = ("transportation", "airport")
    bus_station = ("transportation", "bus_station")
    bus_stop = ("transportation", "bus_stop")
    ferry_terminal = ("transportation", "ferry_terminal")
    heliport = ("transportation", "heliport")
    light_rail_station = ("transportation", "light_rail_station")
    park_and_ride = ("transportation", "park_and_ride")
    subway_station = ("transportation", "subway_station")
    taxi_stand = ("transportation", "taxi_stand")
    train_station = ("transportation", "train_station")
    transit_depot = ("transportation", "transit_depot")
    transit_station = ("transportation", "transit_station")
    truck_stop = ("transportation", "truck_stop")
    administrative_area_level_3 = ("additional", "administrative_area_level_3")
    administrative_area_level_4 = ("additional", "administrative_area_level_4")
    administrative_area_level_5 = ("additional", "administrative_area_level_5")
    administrative_area_level_6 = ("additional", "administrative_area_level_6")
    administrative_area_level_7 = ("additional", "administrative_area_level_7")
    archipelago = ("additional", "archipelago")
    colloquial_area = ("additional", "colloquial_area")
    continent = ("additional", "continent")
    establishment = ("additional", "establishment")
    floor = ("additional", "floor")
    food = ("additional", "food")
    general_contractor = ("additional", "general_contractor")
    geocode = ("additional", "geocode")
    health = ("additional", "health")
    intersection = ("additional", "intersection")
    landmark = ("additional", "landmark")
    natural_feature = ("additional", "natural_feature")
    neighborhood = ("additional", "neighborhood")
    place_of_worship = ("additional", "place_of_worship")
    plus_code = ("additional", "plus_code	")
    point_of_interest = ("additional", "point_of_interest")
    political = ("additional", "political")
    post_box = ("additional", "post_box")
    postal_code_prefix = ("additional", "postal_code_prefix")
    postal_code_suffix = ("additional", "postal_code_suffix")
    postal_town = ("additional", "postal_town")
    premise = ("additional", "premise")
    room = ("additional", "room")
    route = ("additional", "route")
    street_address = ("additional", "street_address")
    street_number = ("additional", "street_number")
    sublocality = ("additional", "sublocality")
    sublocality_level_1 = ("additional", "sublocality_level_1")
    sublocality_level_2 = ("additional", "sublocality_level_2")
    sublocality_level_3 = ("additional", "sublocality_level_3")
    sublocality_level_4 = ("additional", "sublocality_level_4")
    sublocality_level_5 = ("additional", "sublocality_level_5")
    subpremise = ("additional", "subpremise")
    town_square = ("additional", "town_square")

    @property
    def category(self):
        return self.value[0]

    @property
    def name(self):
        return self.value[1]


## Place details
place_details_ids_only = ["id", "name", "photos"]

place_details_location_only = [
    "addressComponents",
    "adrFormatAddress",
    "formattedAddress",
    "location",
    "plusCode",
    "shortFormattedAddress",
    "types",
    "viewport",
]

place_details_basic = [
    "accessibilityOptions",
    "businessStatus",
    "displayName",
    "googleMapsUri",
    "iconBackgroundColor",
    "iconMaskBaseUri",
    "primaryType",
    "primaryTypeDisplayName",
    "subDestinations",
    "utcOffsetMinutes",
]

place_details_advanced = [
    "currentOpeningHours",
    "currentSecondaryOpeningHours",
    "internationalPhoneNumber",
    "nationalPhoneNumber",
    "priceLevel",
    "rating",
    "regularOpeningHours",
    "regularSecondaryOpeningHours",
    "userRatingCount",
    "websiteUri",
]

place_details_preferred = [
    "allowsDogs",
    "curbsidePickup",
    "delivery",
    "dineIn",
    "editorialSummary",
    "evChargeOptions",
    "fuelOptions",
    "goodForChildren",
    "goodForGroups",
    "goodForWatchingSports",
    "liveMusic",
    "menuForChildren",
    "parkingOptions",
    "paymentOptions",
    "outdoorSeating",
    "reservable",
    "restroom",
    "reviews",
    "servesBeer",
    "servesBreakfast",
    "servesBrunch",
    "servesCocktails",
    "servesCoffee",
    "servesDesserts",
    "servesDinner",
    "servesLunch",
    "servesVegetarianFood",
    "servesWine",
    "takeout",
]


## Nearby Search
nearby_search_basic = [
    "places.accessibilityOptions",
    "places.addressComponents",
    "places.adrFormatAddress",
    "places.businessStatus",
    "places.displayName",
    "places.formattedAddress",
    "places.googleMapsUri",
    "places.iconBackgroundColor",
    "places.iconMaskBaseUri",
    "places.id",
    "places.location",
    "places.name",
    "places.photos",
    "places.plusCode",
    "places.primaryType",
    "places.primaryTypeDisplayName",
    "places.shortFormattedAddress",
    "places.subDestinations",
    "places.types",
    "places.utcOffsetMinutes",
    "places.viewport",
]

nearby_search_advanced = [
    "places.currentOpeningHours",
    "places.currentSecondaryOpeningHours",
    "places.internationalPhoneNumber",
    "places.nationalPhoneNumber",
    "places.priceLevel",
    "places.rating",
    "places.regularOpeningHours",
    "places.regularSecondaryOpeningHours",
    "places.userRatingCount",
    "places.websiteUri",
]

nearby_search_preferred = [
    "places.allowsDogs",
    "places.curbsidePickup",
    "places.delivery",
    "places.dineIn",
    "places.editorialSummary",
    "places.evChargeOptions",
    "places.fuelOptions",
    "places.goodForChildren",
    "places.goodForGroups",
    "places.goodForWatchingSports",
    "places.liveMusic",
    "places.menuForChildren",
    "places.parkingOptions",
    "places.paymentOptions",
    "places.outdoorSeating",
    "places.reservable",
    "places.restroom",
    "places.reviews",
    "places.servesBeer",
    "places.servesBreakfast",
    "places.servesBrunch",
    "places.servesCocktails",
    "places.servesCoffee",
    "places.servesDesserts",
    "places.servesDinner",
    "places.servesLunch",
    "places.servesVegetarianFood",
    "places.servesWine",
    "places.takeout",
]

text_search_ids_only = ["places.id", "places.name"]

text_search_basic = [
    "places.accessibilityOptions",
    "places.addressComponents",
    "places.adrFormatAddress",
    "places.businessStatus",
    "places.displayName",
    "places.formattedAddress",
    "places.googleMapsUri",
    "places.iconBackgroundColor",
    "places.iconMaskBaseUri",
    "places.location",
    "places.photos",
    "places.plusCode",
    "places.primaryType",
    "places.primaryTypeDisplayName",
    "places.shortFormattedAddress",
    "places.subDestinations",
    "places.types",
    "places.utcOffsetMinutes",
    "places.viewport",
]

text_search_advanced = [
    "places.currentOpeningHours",
    "places.currentSecondaryOpeningHours",
    "places.internationalPhoneNumber",
    "places.nationalPhoneNumber",
    "places.priceLevel",
    "places.rating",
    "places.regularOpeningHours",
    "places.regularSecondaryOpeningHours",
    "places.userRatingCount",
    "places.websiteUri",
]

text_search_preferred = [
    "places.allowsDogs",
    "places.curbsidePickup",
    "places.delivery",
    "places.dineIn",
    "places.editorialSummary",
    "places.evChargeOptions",
    "places.fuelOptions",
    "places.goodForChildren",
    "places.goodForGroups",
    "places.goodForWatchingSports",
    "places.liveMusic",
    "places.menuForChildren",
    "places.parkingOptions",
    "places.paymentOptions",
    "places.outdoorSeating",
    "places.reservable",
    "places.restroom",
    "places.reviews",
    "places.servesBeer",
    "places.servesBreakfast",
    "places.servesBrunch",
    "places.servesCocktails",
    "places.servesCoffee",
    "places.servesDesserts",
    "places.servesDinner",
    "places.servesLunch",
    "places.servesVegetarianFood",
    "places.servesWine",
    "places.takeout",
]

## Maps

_place_details_map = {
    PlaceField.ids_only.value: place_details_ids_only,
    PlaceField.location_only.value: place_details_location_only,
    PlaceField.basic.value: place_details_basic,
    PlaceField.advanced.value: place_details_advanced,
    PlaceField.preferred.value: place_details_preferred,
}

_nearby_search_map = {
    SearchNearbyField.basic.value: nearby_search_basic,
    SearchNearbyField.advanced.value: nearby_search_advanced,
    SearchNearbyField.preferred.value: nearby_search_preferred,
}

_text_search_map = {
    TextSearchField.ids_only.value: text_search_ids_only,
    TextSearchField.basic.value: text_search_basic,
    TextSearchField.advanced.value: text_search_advanced,
    TextSearchField.preferred.value: text_search_preferred,
}


class SearchNearbyInputModel(BaseModel):
    included_types: list[str]
    maxResultCount: int = 10
    location_restriction: dict = None
    access_token: str = None
    quotaUser: str = None
    callback: str = None
    uploadType: str = None
    fields: list[PlaceType] = None


@dataclass
class GooglePlaces:
    api_key: Optional[str] = None
    search_text_url: ClassVar[str] = "https://places.googleapis.com/v1/places:searchText"
    nearby_search_url: ClassVar[str] = "https://places.googleapis.com/v1/places:searchNearby"
    place_url: ClassVar[str] = "https://places.googleapis.com/v1/places:searchText"
    default_headers: ClassVar[dict] = None

    def __post_init__(self):
        if not self.api_key:
            self.api_key = os.getenv("GOOGLE_PLACES_API_KEY")
            if not self.api_key:
                raise ValueError(
                    "Google Places api key was not found, it either must be passed in "
                    "or set in the environment, GOOGLE_PLACES_API_KEY=<your_key>"
                )

        GooglePlaces.default_headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": self.api_key,
        }

    """
    Class to get the fields and urls for the Google Places API
    """

    @staticmethod
    def _get_fields(level: int, include_below: bool, field_map: dict):
        if not include_below:
            return field_map[level]
        return [field for v in range(level + 1) for field in field_map[v]]

    @staticmethod
    def get_place_fields(level: PlaceField, include_below: bool = True):
        return GooglePlaces._get_fields(level, include_below, _place_details_map)

    @staticmethod
    def get_nearby_search_fields(level: SearchNearbyField, include_below: bool = True):
        return GooglePlaces._get_fields(level, include_below, _nearby_search_map)

    @staticmethod
    def get_text_search_fields(level: TextSearchField, include_below: bool = True):
        return GooglePlaces._get_fields(level, include_below, _text_search_map)

    def _request(
        self,
        url: str,
        headers: dict,
        json_data: dict,
        **kwargs,
    ) -> dict:
        response = requests.post(url, headers=headers, json=json_data, **kwargs)
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 400:
            lines = response.content.splitlines()
            for line in lines:
                log.error(line)
            raise ValueError("Failed to get a response from Google Places API")
        else:
            raise ValueError("Failed to get a response from Google Places API")

    def text_search(
        self,
        text_query: str,
        fields: TextSearchField | list[PlaceType | str],
        maxResultCount: int = 20,
        **kwargs,
    ) -> dict:
        """
        Search for places by text query
        Args:
            text_query: Text query to search for
            fields: Fields to include in the response
            maxResultCount: Maximum number of results to return
        Returns:
            dict: Response from Google Places API
        """
        if isinstance(fields, TextSearchField):
            fields = GooglePlaces.get_text_search_fields(fields)
        headers = GooglePlaces.default_headers.copy()
        headers["X-Goog-FieldMask"] = ",".join(fields)
        json_data = {
            "textQuery": text_query,
            "maxResultCount": maxResultCount,
        }
        return self._request(
            url=GooglePlaces.search_text_url,
            headers=headers,
            json_data=json_data,
            **kwargs,
        )

    def search_nearby(
        self,
        included_types: list[str | PlaceType],
        circle: Circle,
        fields: SearchNearbyField | list[PlaceType | str],
        maxResultCount: int = 20,
        **kwargs,
    ):
        """
        Search for places near a location
        Args:
            included_types: List of place types to include
            circle: Circle object with the center and radius (in meters)
            fields: Fields to include in the response
            maxResultCount: Maximum number of results to return
        Returns:
            dict: Response from Google Places API
        """
        if not included_types:
            raise ValueError("included_types must be a non-empty list")
        types = []
        for t in included_types:
            types.append(t.name if isinstance(t, PlaceType) else t)

        if isinstance(fields, SearchNearbyField):
            fields = GooglePlaces.get_nearby_search_fields(fields)

        headers = GooglePlaces.default_headers.copy()
        headers["X-Goog-FieldMask"] = ",".join(fields)

        restriction_params = circle.to_location_restriction()
        json_data = {
            "includedTypes": types,
            "maxResultCount": maxResultCount,
        }
        json_data.update(restriction_params)

        return self._request(
            url=GooglePlaces.nearby_search_url,
            headers=headers,
            json_data=json_data,
            **kwargs,
        )

    def get_place(self, place_id: str, fields: PlaceField | list[PlaceType | str], **kwargs):
        """
        Get place details by place id
        Args:
            place_id: Place id to get details for
            fields: Fields to include in the response
        Returns:
            dict: Response from Google Places API
        """
        if isinstance(fields, PlaceField):
            fields = GooglePlaces.get_place_fields(fields)
        headers = GooglePlaces.default_headers.copy()
        headers["X-Goog-FieldMask"] = ",".join(fields)
        json_data = {"placeId": place_id}
        return self._request(
            url=GooglePlaces.place_url,
            headers=headers,
            json_data=json_data,
            **kwargs,
        )
