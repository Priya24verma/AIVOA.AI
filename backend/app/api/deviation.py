from datetime import datetime

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile
)

from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.ai.graph import build_deviation_graph
from app.database.connection import Base, engine, get_db
from app.database.crud import (
    create_deviation,
    get_deviation,
    save_final_deviation,
    update_deviation_review
)
from app.models.deviation import Deviation
from app.utils.document_parser import (
    extract_pdf_text,
    extract_text_content
)


Base.metadata.create_all(
    bind=engine
)


router = APIRouter(
    prefix="/api/deviation",
    tags=["Deviation"]
)


deviation_graph = build_deviation_graph()


class ReviewRequest(BaseModel):
    analysis_id: str
    decision: str


class SaveRequest(BaseModel):
    analysis_id: str
    extracted_data: dict
    review: dict | None = None


@router.post("/extract")
async def extract_deviation(
    file: UploadFile | None = File(default=None),
    text: str | None = Form(default=None),
    db: Session = Depends(get_db)
):

    if not file and not text:
        raise HTTPException(
            status_code=400,
            detail=(
                "Please upload a document or "
                "provide deviation text."
            )
        )

    extracted_text = ""

    if file:

        if file.content_type != "application/pdf":
            raise HTTPException(
                status_code=400,
                detail="Only PDF files are supported."
            )

        file_bytes = await file.read()

        if not file_bytes:
            raise HTTPException(
                status_code=400,
                detail="Uploaded file is empty."
            )

        extracted_text = extract_pdf_text(
            file_bytes
        )

    elif text:

        extracted_text = extract_text_content(
            text
        )

    if not extracted_text:
        raise HTTPException(
            status_code=400,
            detail="No readable text was found."
        )

    try:

        result = deviation_graph.invoke(
            {
                "text": extracted_text,
                "extracted_data": {},
                "validation": {},
                "evidence": {},
                "risk_assessment": {}
            }
        )

    except Exception as exc:

        raise HTTPException(
            status_code=500,
            detail=f"Deviation analysis failed: {str(exc)}"
        )

    analysis_id = (
        "DEV-"
        + datetime.now().strftime(
            "%Y%m%d-%H%M%S"
        )
    )

    validation = result.get(
        "validation",
        {}
    )

    review = {
        "status": "ready_for_human_review",
        "message": (
            "AI analysis completed. "
            "Review and edit the generated "
            "information before saving."
        )
    }

    audit = {
        "analysis_id": analysis_id,
        "events": [
            "Document received",
            "Fields extracted",
            "Validation completed",
            "Evidence identified",
            "Risk assessment completed",
            "Human review gate activated"
        ]
    }

    create_deviation(
        db=db,
        analysis_id=analysis_id,
        source_filename=(
            file.filename
            if file
            else None
        ),
        source_text=extracted_text,
        extracted_data=result[
            "extracted_data"
        ],
        evidence=result[
            "evidence"
        ],
        risk_assessment=result[
            "risk_assessment"
        ],
        validation=validation,
        review=review,
        audit=audit,
        status="draft"
    )

    return {
        "success": True,
        "filename": (
            file.filename
            if file
            else None
        ),
        "text": extracted_text,
        "character_count": len(
            extracted_text
        ),
        "extracted_data": result[
            "extracted_data"
        ],
        "validation": validation,
        "evidence": result[
            "evidence"
        ],
        "risk_assessment": result[
            "risk_assessment"
        ],
        "review": review,
        "audit": audit
    }


@router.post("/review")
def review_deviation(
    request: ReviewRequest,
    db: Session = Depends(get_db)
):

    if request.decision not in {
        "approved",
        "changes_requested"
    }:
        raise HTTPException(
            status_code=400,
            detail=(
                "Decision must be "
                "'approved' or "
                "'changes_requested'."
            )
        )

    deviation = get_deviation(
        db,
        request.analysis_id
    )

    if not deviation:
        raise HTTPException(
            status_code=404,
            detail="Deviation analysis not found."
        )

    if request.decision == "approved":

        review = {
            "status": "approved",
            "message": (
                "Human reviewer approved "
                "the AI assessment. "
                "The deviation is ready to be saved."
            )
        }

        status = "review_approved"

        event = (
            "Human assessment approved"
        )

    else:

        review = {
            "status": "changes_requested",
            "message": (
                "Changes were requested "
                "by the human reviewer."
            )
        }

        status = "changes_requested"

        event = (
            "Changes requested by "
            "human reviewer"
        )

    audit = dict(
        deviation.audit or {}
    )

    events = list(
        audit.get("events", [])
    )

    events.append(event)

    audit["events"] = events

    updated = update_deviation_review(
        db=db,
        deviation=deviation,
        review=review,
        audit=audit,
        status=status
    )

    return {
        "success": True,
        "review": updated.review,
        "audit": updated.audit,
        "status": updated.status
    }


@router.post("/save")
def save_deviation(
    request: SaveRequest,
    db: Session = Depends(get_db)
):

    deviation = get_deviation(
        db,
        request.analysis_id
    )

    if not deviation:
        raise HTTPException(
            status_code=404,
            detail="Deviation analysis not found."
        )

    if deviation.status != "review_approved":
        raise HTTPException(
            status_code=400,
            detail=(
                "Human approval is required "
                "before saving the deviation."
            )
        )

    extracted_data = request.extracted_data

    required_fields = [
        "site",
        "date_of_occurrence",
        "product",
        "batch_number",
        "description",
        "expected",
        "actual"
    ]

    missing_fields = []

    for field in required_fields:

        value = extracted_data.get(
            field
        )

        if (
            value is None
            or str(value).strip() == ""
        ):
            missing_fields.append(field)

    if missing_fields:

        raise HTTPException(
            status_code=400,
            detail={
                "message": (
                    "Cannot save the deviation "
                    "because required fields "
                    "are missing."
                ),
                "missing_fields": missing_fields
            }
        )

    review = (
        request.review
        if request.review
        else deviation.review
    )

    audit = dict(
        deviation.audit or {}
    )

    events = list(
        audit.get("events", [])
    )

    events.append(
        "Deviation saved to database"
    )

    audit["events"] = events

    saved = save_final_deviation(
        db=db,
        deviation=deviation,
        extracted_data=extracted_data,
        review=review,
        audit=audit
    )

    return {
        "success": True,
        "message": (
            "Deviation saved successfully."
        ),
        "analysis_id": saved.analysis_id,
        "status": saved.status,
        "extracted_data": saved.extracted_data,
        "review": saved.review,
        "audit": saved.audit
    }