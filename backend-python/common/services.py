from math import asin, cos, isfinite, radians, sin, sqrt

from django.conf import settings
from rest_framework.exceptions import ValidationError


def parse_nearby_parameters(query_params):
    try:
        latitude = float(query_params["latitude"])
        longitude = float(query_params["longitude"])
        radius = float(query_params.get("radius", 25))
    except (KeyError, TypeError, ValueError) as exc:
        raise ValidationError(
            {"location": "Valid latitude, longitude, and radius are required."}
        ) from exc

    if (
        not all(isfinite(value) for value in (latitude, longitude, radius))
        or not -90 <= latitude <= 90
        or not -180 <= longitude <= 180
        or not 0 < radius <= 500
    ):
        raise ValidationError(
            {"location": "Latitude must be between -90 and 90, longitude between -180 and 180, and radius between 0 and 500 km."}
        )

    return latitude, longitude, radius


def haversine_km(latitude_a, longitude_a, latitude_b, longitude_b):
    values = (latitude_a, longitude_a, latitude_b, longitude_b)
    if any(value is None for value in values):
        raise ValueError("All four coordinates are required.")

    lat_a, lon_a, lat_b, lon_b = map(float, values)
    if not (-90 <= lat_a <= 90 and -90 <= lat_b <= 90):
        raise ValueError("Latitude must be between -90 and 90 degrees.")
    if not (-180 <= lon_a <= 180 and -180 <= lon_b <= 180):
        raise ValueError("Longitude must be between -180 and 180 degrees.")

    delta_lat = radians(lat_b - lat_a)
    delta_lon = radians(lon_b - lon_a)
    haversine = sin(delta_lat / 2) ** 2 + cos(radians(lat_a)) * cos(radians(lat_b)) * sin(delta_lon / 2) ** 2
    return 6371.0088 * 2 * asin(sqrt(haversine))


def validate_image(image):
    from PIL import Image, UnidentifiedImageError

    max_size = settings.FILE_UPLOAD_MAX_MEMORY_SIZE
    if image.size > max_size:
        raise ValidationError(f"Image exceeds the maximum allowed size of {max_size // (1024 * 1024)} MB.")
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValidationError("Only JPEG, PNG, and WebP images are accepted.")

    try:
        image.seek(0)
        with Image.open(image) as decoded:
            decoded.verify()
            if decoded.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValidationError("Unsupported image format.")
            if decoded.width * decoded.height > 40_000_000:
                raise ValidationError("Image dimensions exceed the maximum allowed pixel count.")
            expected_mime = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}[decoded.format]
            if image.content_type != expected_mime:
                raise ValidationError("Image content does not match the declared file type.")
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValidationError("Uploaded file is not a valid image.") from exc
    finally:
        image.seek(0)
