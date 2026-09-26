from typing import TypedDict

from langgraph.graph import StateGraph, START, END

from app.ai.extraction import extract_deviation_fields
from app.ai.validation import validate_extraction
from app.ai.evidence import extract_evidence
from app.ai.risk_assessment import assess_deviation_risk


class DeviationState(TypedDict):
    text: str
    extracted_data: dict
    validation: dict
    evidence: dict
    risk_assessment: dict


def extract_fields_node(state: DeviationState):
    result = extract_deviation_fields(
        state["text"]
    )

    return {
        "extracted_data": result
    }


def validation_node(state: DeviationState):
    result = validate_extraction(
        state["extracted_data"]
    )

    return {
        "validation": result
    }


def evidence_node(state: DeviationState):
    result = extract_evidence(
        state["text"],
        state["extracted_data"]
    )

    return {
        "evidence": result
    }


def risk_assessment_node(state: DeviationState):
    result = assess_deviation_risk(
        state["text"],
        state["extracted_data"],
        state["evidence"]
    )

    return {
        "risk_assessment": result
    }


def build_deviation_graph():

    graph = StateGraph(DeviationState)

    graph.add_node(
        "extract_fields",
        extract_fields_node
    )

    graph.add_node(
        "validation",
        validation_node
    )

    graph.add_node(
        "evidence",
        evidence_node
    )

    graph.add_node(
        "risk_assessment",
        risk_assessment_node
    )

    graph.add_edge(
        START,
        "extract_fields"
    )

    graph.add_edge(
        "extract_fields",
        "validation"
    )

    graph.add_edge(
        "validation",
        "evidence"
    )

    graph.add_edge(
        "evidence",
        "risk_assessment"
    )

    graph.add_edge(
        "risk_assessment",
        END
    )

    return graph.compile()