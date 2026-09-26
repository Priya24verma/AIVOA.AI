import re


def extract_evidence(
    text: str,
    extracted_data: dict
) -> dict:

    evidence = []


    # ========================================================
    # EXPECTED CONDITION
    # ========================================================

    expected = extracted_data.get(
        "expected"
    )

    if expected:

        evidence.append(
            {
                "label": "Approved condition",
                "text": expected,
                "source": "Original deviation report"
            }
        )


    # ========================================================
    # OBSERVED CONDITION
    # ========================================================

    actual = extracted_data.get(
        "actual"
    )

    if actual:

        evidence.append(
            {
                "label": "Observed condition",
                "text": actual,
                "source": "Original deviation report"
            }
        )


    # ========================================================
    # DURATION
    # ========================================================

    duration_patterns = [

        r"approximately\s+(\d+\s+minutes?)",

        r"(\d+)\s+minutes?\s+(?:below|above|outside)",

        r"persisted\s+for\s+approximately\s+(\d+\s+minutes?)",

        r"excursion\s+duration\s*[:\-]?\s*(approximately\s+)?(\d+\s+minutes?)"
    ]


    duration_found = None


    for pattern in duration_patterns:

        match = re.search(
            pattern,
            text,
            re.IGNORECASE
        )

        if match:

            duration_found = match.group(
                match.lastindex
            )

            break


    if duration_found:

        evidence.append(
            {
                "label": "Deviation duration",
                "text": duration_found,
                "source": "Original deviation report"
            }
        )

    else:

        evidence.append(
            {
                "label": "Deviation duration",
                "text": "Not stated in the report",
                "source": "Original deviation report"
            }
        )


    # ========================================================
    # DETECTION
    # ========================================================

    detection_patterns = [

        r"detected by an operator",

        r"detected by the operator",

        r"identified by an operator",

        r"routine monitoring",

        r"environmental monitoring system"
    ]


    detection_found = False


    for pattern in detection_patterns:

        if re.search(
            pattern,
            text,
            re.IGNORECASE
        ):

            detection_found = True

            break


    if detection_found:

        evidence.append(
            {
                "label": "Detection",
                "text": (
                    "Event was detected during "
                    "monitoring as stated in the report"
                ),
                "source": "Original deviation report"
            }
        )


    # ========================================================
    # IMMEDIATE ACTION
    # ========================================================

    action_patterns = [

        r"batch was placed on hold",

        r"batch placed on hold",

        r"filling was stopped",

        r"filling stopped",

        r"process was stopped"
    ]


    for pattern in action_patterns:

        if re.search(
            pattern,
            text,
            re.IGNORECASE
        ):

            evidence.append(
                {
                    "label": "Immediate action",
                    "text": (
                        "Process activity was stopped "
                        "and/or batch was placed on hold"
                    ),
                    "source": "Original deviation report"
                }
            )

            break


    # ========================================================
    # PRODUCT IMPACT
    # ========================================================

    if re.search(
        r"product impact.*not established",
        text,
        re.IGNORECASE
    ) or re.search(
        r"product impact.*not confirmed",
        text,
        re.IGNORECASE
    ):

        evidence.append(
            {
                "label": "Product impact",
                "text": "Not established",
                "source": "Original deviation report"
            }
        )


    # ========================================================
    # ENVIRONMENTAL MONITORING
    # ========================================================

    if re.search(
        r"environmental monitoring",
        text,
        re.IGNORECASE
    ):

        evidence.append(
            {
                "label": "Environmental monitoring",
                "text": (
                    "Environmental monitoring "
                    "information is referenced in "
                    "the deviation report."
                ),
                "source": "Original deviation report"
            }
        )


    return {

        "evidence": evidence,

        "expected_value": expected,

        "actual_value": actual,

        "source": "Original deviation report"
    }