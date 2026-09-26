from sqlalchemy.orm import Session

from app.models.deviation import Deviation


def create_deviation(
    db: Session,
    analysis_id: str,
    source_filename: str | None,
    source_text: str,
    extracted_data: dict,
    evidence: dict,
    risk_assessment: dict,
    validation: dict,
    review: dict,
    audit: dict,
    status: str = "draft"
):
    deviation = Deviation(
        analysis_id=analysis_id,
        status=status,
        source_filename=source_filename,
        source_text=source_text,
        extracted_data=extracted_data,
        evidence=evidence,
        risk_assessment=risk_assessment,
        validation=validation,
        review=review,
        audit=audit
    )

    db.add(deviation)
    db.commit()
    db.refresh(deviation)

    return deviation


def get_deviation(
    db: Session,
    analysis_id: str
):
    return (
        db.query(Deviation)
        .filter(
            Deviation.analysis_id == analysis_id
        )
        .first()
    )


def update_deviation_review(
    db: Session,
    deviation: Deviation,
    review: dict,
    audit: dict,
    status: str
):
    deviation.review = review
    deviation.audit = audit
    deviation.status = status

    db.commit()
    db.refresh(deviation)

    return deviation


def save_final_deviation(
    db: Session,
    deviation: Deviation,
    extracted_data: dict,
    review: dict,
    audit: dict
):
    deviation.extracted_data = extracted_data
    deviation.review = review
    deviation.audit = audit
    deviation.status = "saved"

    db.commit()
    db.refresh(deviation)

    return deviation