def generate_review_status(
    validation: dict,
    risk_assessment: dict
) -> dict:

    validation_status = validation.get("status", "insufficient")
    risk_level = risk_assessment.get("risk_level")

    if validation_status == "complete" and risk_level:
        review_status = "ready_for_human_review"
        message = "All required fields are available for human review."

    elif validation_status == "partial":
        review_status = "human_review_required"
        message = "Some required information is missing. Human review is required."

    else:
        review_status = "human_review_required"
        message = "Insufficient information is available for reliable assessment."

    return {
        "review_status": review_status,
        "message": message,
        "requires_human_review": True
    }