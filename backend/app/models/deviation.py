from datetime import datetime

from sqlalchemy import DateTime, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.connection import Base


class Deviation(Base):
    __tablename__ = "deviations"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )

    analysis_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="draft",
        nullable=False
    )

    source_filename: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True
    )

    source_text: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    extracted_data: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    evidence: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    risk_assessment: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    validation: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    review: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    audit: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )