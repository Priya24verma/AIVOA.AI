REQUIRED_FIELDS = [
    "site",
    "date_of_occurrence",
    "product",
    "batch_number",
    "description",
    "expected",
    "actual"
]


def validate_extraction(extracted_data: dict) -> dict:

    missing_fields = []

    for field in REQUIRED_FIELDS:
        value = extracted_data.get(field)

        if value is None or str(value).strip() == "":
            missing_fields.append(field)

    if not missing_fields:
        status = "complete"
    elif len(missing_fields) <= 2:
        status = "partial"
    else:
        status = "insufficient"

    return {
        "status": status,
        "missing_fields": missing_fields,
        "field_count": len(REQUIRED_FIELDS) - len(missing_fields),
        "total_fields": len(REQUIRED_FIELDS)
    }