from typing import Annotated, Optional
from bson import ObjectId
from pydantic import BaseModel, BeforeValidator, ConfigDict, Field

PyObjectId = Annotated[str, BeforeValidator(lambda v: str(v) if isinstance(v, ObjectId) else v)]


class BaseDocument(BaseModel):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")
    id: Optional[PyObjectId] = Field(default=None, alias="_id")

    def to_mongo(self) -> dict:
        data = self.model_dump(by_alias=True, exclude_none=True)
        data.pop("_id", None)
        return data

    @classmethod
    def from_mongo(cls, doc: dict):
        return cls.model_validate(doc)


class Listing(BaseDocument):
    collector_id: str
    collector_name: str
    title: str
    description: str = ""
    location: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    category: str
    category_label: str
    weight_kg: float
    condition: str
    photo_path: Optional[str] = None
    price_per_kg: float
    multiplier: float
    estimated_price: float
    status: str = "open"
    recycler_id: Optional[str] = None
    recycler_name: Optional[str] = None
    payment_session_id: Optional[str] = None
    handover_code: Optional[str] = None
    pickup_slots: list[str] = []
    pickup_at: Optional[str] = None
    pickup_status: str = "none"
    created_at: str
    matched_at: Optional[str] = None
    paid_at: Optional[str] = None
    handover_at: Optional[str] = None


class PaymentTransaction(BaseDocument):
    session_id: str
    listing_id: str
    recycler_id: str
    collector_id: str
    amount: float
    currency: str = "inr"
    status: str = "initiated"
    payment_status: str = "pending"
    created_at: str
    updated_at: str
