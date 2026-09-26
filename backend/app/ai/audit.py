from datetime import datetime


def generate_audit_trail(
    validation: dict,
    evidence: dict,
    risk_assessment: dict,
    review: dict
) -> dict:

    events = [
        {
            "step": "Document received",
            "status": "completed"
        },
        {
            "step": "Fields extracted",
            "status": "completed"
        },
        {
            "step": "Validation completed",
            "status": "completed"
        },
        {
            "step": "Evidence identified",
            "status": "completed"
        },
        {
            "step": "Risk assessment completed",
            "status": "completed"
        },
        {
            "step": "Human review gate activated",
            "status": "completed"
        }
    ]

    return {
        "analysis_id": f"DEV-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        "timestamp": datetime.now().isoformat(),
        "events": events,
        "validation_status": validation.get("status"),
        "risk_level": risk_assessment.get("risk_level"),
        "review_status": review.get("review_status"),
        "reviewer_decision": None,
        "reviewer_comment": None
    }


def add_reviewer_decision(
    audit: dict,
    decision: str,
    comment: str | None = None
) -> dict:

    updated_audit = dict(audit)

    events = list(
        updated_audit.get("events", [])
    )

    if decision == "approved":

        events.append(
            {
                "step": "Human assessment approved",
                "status": "completed"
            }
        )

        updated_audit["review_status"] = "approved"

    elif decision == "changes_requested":

        events.append(
            {
                "step": "Changes requested by human reviewer",
                "status": "completed"
            }
        )

        updated_audit["review_status"] = "changes_requested"

    updated_audit["events"] = events

    updated_audit["reviewer_decision"] = decision

    updated_audit["reviewer_comment"] = comment

    updated_audit[
        "review_decision_timestamp"
    ] = datetime.now().isoformat()

    return updated_audit