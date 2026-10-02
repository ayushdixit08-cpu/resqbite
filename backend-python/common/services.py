from math import asin, cos, radians, sin, sqrt

from django.core.exceptions import ValidationError


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

    max_size = 5 * 1024 * 1024
    if image.size > max_size:
        raise ValidationError("Image exceeds the maximum allowed size of 5 MB.")
    if image.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValidationError("Only JPEG, PNG, and WebP images are accepted.")

    try:
        image.seek(0)
        with Image.open(image) as decoded:
            decoded.verify()
            if decoded.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValidationError("Unsupported image format.")
        image.seek(0)
    except (UnidentifiedImageError, OSError) as exc:
        raise ValidationError("Uploaded file is not a valid image.") from exc
