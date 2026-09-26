import json
import os

from dotenv import load_dotenv
from groq import Groq


load_dotenv()


client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)


# ============================================================
# RISK PROMPT
# ============================================================

RISK_PROMPT = """
You are a pharmaceutical deviation risk assessment assistant.

You are analyzing a deviation report.

Use the ORIGINAL REPORT as the primary source of truth.

Use the extracted fields and evidence only to organize the information.

IMPORTANT RULES:

1. Do not invent facts.
2. Do not assume a duration if the report does not state one.
3. Do not assume product impact if the report does not establish it.
4. If information is missing, explicitly say "Insufficient information".
5. Every risk factor explanation must be traceable to the report.
6. Do not treat missing information as Low risk.
7. "Insufficient" means the report does not contain enough information to assess that factor.
8. Distinguish between observed facts and potential impact.
9. The final risk level must consider the available evidence.
10. Human review is required before any operational or batch decision.

Assess these risk factors:

- Severity
- Magnitude
- Duration
- Process Stage
- Detection
- Potential Impact

Risk factor levels must be exactly one of:

- Low
- Medium
- High
- Insufficient

Overall risk level must be exactly one of:

- Low
- Medium
- High
- Critical

Return valid JSON only.

Required JSON structure:

{{
    "risk_level": "Low | Medium | High | Critical",

    "risk_reason": "Short factual explanation based only on the report.",

    "recommended_action": "Specific investigation or review action supported by the report.",

    "risk_factors": {{
        "severity": {{
            "level": "Low | Medium | High | Insufficient",
            "reason": "Evidence-based explanation."
        }},

        "magnitude": {{
            "level": "Low | Medium | High | Insufficient",
            "reason": "Evidence-based explanation."
        }},

        "duration": {{
            "level": "Low | Medium | High | Insufficient",
            "reason": "Evidence-based explanation."
        }},

        "process_stage": {{
            "level": "Low | Medium | High | Insufficient",
            "reason": "Evidence-based explanation."
        }},

        "detection": {{
            "level": "Low | Medium | High | Insufficient",
            "reason": "Evidence-based explanation."
        }},

        "potential_impact": {{
            "level": "Low | Medium | High | Insufficient",
            "reason": "Evidence-based explanation."
        }}
    }}
}}

============================================================
ORIGINAL DEVIATION REPORT
============================================================

{text}

============================================================
EXTRACTED INFORMATION
============================================================

Site:
{site}

Date:
{date_of_occurrence}

Product:
{product}

Batch:
{batch_number}

Title:
{title}

Description:
{description}

Expected:
{expected}

Actual:
{actual}

============================================================
IDENTIFIED EVIDENCE
============================================================

{evidence}

============================================================
FINAL INSTRUCTION
============================================================

Assess the deviation using the original report.

Do not fill missing information with assumptions.

If the report explicitly provides a preliminary risk consideration,
use that information as evidence.

Return JSON only.
"""


# ============================================================
# RISK ASSESSMENT
# ============================================================

def assess_deviation_risk(
    text: str,
    extracted_data: dict,
    evidence: dict
) -> dict:

    if not os.getenv("GROQ_API_KEY"):

        raise ValueError(
            "GROQ_API_KEY is not configured."
        )


    evidence_items = evidence.get(
        "evidence",
        []
    )


    if isinstance(evidence_items, list):

        evidence_text = "\n".join(
            str(item)
            for item in evidence_items
        )

    else:

        evidence_text = str(
            evidence_items
        )


    prompt = RISK_PROMPT.format(

        text=text,

        site=extracted_data.get(
            "site"
        ),

        date_of_occurrence=extracted_data.get(
            "date_of_occurrence"
        ),

        product=extracted_data.get(
            "product"
        ),

        batch_number=extracted_data.get(
            "batch_number"
        ),

        title=extracted_data.get(
            "title"
        ),

        description=extracted_data.get(
            "description"
        ),

        expected=extracted_data.get(
            "expected"
        ),

        actual=extracted_data.get(
            "actual"
        ),

        evidence=evidence_text
    )


    response = client.chat.completions.create(

        model="openai/gpt-oss-120b",

        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ],

        temperature=0,

        response_format={
            "type": "json_object"
        }
    )


    content = response.choices[0].message.content


    if not content:

        raise ValueError(
            "Groq returned an empty response."
        )


    result = json.loads(
        content
    )


    # --------------------------------------------------------
    # NORMALIZE RISK FACTORS
    # --------------------------------------------------------

    risk_factors = result.get(
        "risk_factors",
        {}
    )


    expected_factors = [
        "severity",
        "magnitude",
        "duration",
        "process_stage",
        "detection",
        "potential_impact"
    ]


    normalized_factors = {}


    for factor in expected_factors:

        factor_data = risk_factors.get(
            factor,
            {}
        )


        if not isinstance(
            factor_data,
            dict
        ):

            factor_data = {
                "level": "Insufficient",
                "reason": (
                    "Insufficient information "
                    "in the deviation report."
                )
            }


        level = factor_data.get(
            "level",
            "Insufficient"
        )


        reason = factor_data.get(
            "reason",
            ""
        )


        allowed_levels = {
            "Low",
            "Medium",
            "High",
            "Insufficient"
        }


        if level not in allowed_levels:

            level = "Insufficient"


        if not reason:

            reason = (
                "Insufficient information "
                "in the deviation report."
            )


        normalized_factors[factor] = {

            "level": level,

            "reason": reason
        }


    result["risk_factors"] = normalized_factors


    # --------------------------------------------------------
    # NORMALIZE OVERALL RISK
    # --------------------------------------------------------

    allowed_overall_levels = {
        "Low",
        "Medium",
        "High",
        "Critical"
    }


    if result.get(
        "risk_level"
    ) not in allowed_overall_levels:

        result["risk_level"] = "Medium"


    if not result.get(
        "risk_reason"
    ):

        result["risk_reason"] = (
            "Risk assessment generated from "
            "the available deviation evidence."
        )


    if not result.get(
        "recommended_action"
    ):

        result["recommended_action"] = (
            "Perform documented Quality review "
            "before final disposition."
        )


    return result