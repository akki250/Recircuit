import os
import io
import requests
import cloudinary
import cloudinary.uploader
import cloudinary.api


# Configure Cloudinary
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True,
)


def _check_cloudinary_config():
    required = [
        "CLOUDINARY_CLOUD_NAME",
        "CLOUDINARY_API_KEY",
        "CLOUDINARY_API_SECRET",
    ]

    missing = [key for key in required if not os.environ.get(key)]

    if missing:
        raise RuntimeError(
            f"Missing Cloudinary environment variables: {', '.join(missing)}"
        )


def init_storage(force: bool = False):
    """
    Compatibility function for the existing application.
    Cloudinary does not require storage initialization.
    """
    _check_cloudinary_config()
    return True


def put_object(path: str, data: bytes, content_type: str) -> dict:
    """
    Upload an image to Cloudinary.
    """

    _check_cloudinary_config()

    public_id = path.lstrip("/")

    # Remove file extension from public ID
    if "." in public_id.split("/")[-1]:
        public_id = public_id.rsplit(".", 1)[0]

    result = cloudinary.uploader.upload(
        io.BytesIO(data),
        public_id=public_id,
        resource_type="image",
        overwrite=True,
    )

    return {
        "path": path,
        "public_id": result.get("public_id"),
        "url": result.get("secure_url"),
        "secure_url": result.get("secure_url"),
        "format": result.get("format"),
        "resource_type": result.get("resource_type"),
        "width": result.get("width"),
        "height": result.get("height"),
    }


def get_object(path: str) -> tuple[bytes, str]:
    """
    Download an image from Cloudinary.
    """

    _check_cloudinary_config()

    public_id = path.lstrip("/")

    # Remove file extension
    if "." in public_id.split("/")[-1]:
        public_id = public_id.rsplit(".", 1)[0]

    result = cloudinary.api.resource(
        public_id,
        resource_type="image",
    )

    url = result.get("secure_url")

    if not url:
        raise RuntimeError(f"Cloudinary URL not found for: {path}")

    response = requests.get(url, timeout=60)
    response.raise_for_status()

    return (
        response.content,
        response.headers.get(
            "Content-Type",
            "application/octet-stream"
        ),
    )
