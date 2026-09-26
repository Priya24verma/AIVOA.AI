import { useState } from "react";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";

import {
  setAnalysisResult,
  updateField,
  updateReview,
  markSaved,
  resetAnalysis as resetReduxAnalysis
} from "./analysisSlice";

import "./App.css";


function App() {

  const dispatch = useDispatch();

  const {
    analysisResult,
    editedData,
    saved
  } = useSelector((state) => state.analysis);


  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [error, setError] = useState("");

  const [reviewDecision, setReviewDecision] = useState(null);

  const [showChangeComment, setShowChangeComment] =
    useState(false);

  const [reviewComment, setReviewComment] =
    useState("");

  const [submittedComment, setSubmittedComment] =
    useState("");


  /*
   * ============================================================
   * FILE HANDLING
   * ============================================================
   */

  const handleFileChange = (event) => {

    const selectedFile =
      event.target.files[0];

    if (!selectedFile) {
      return;
    }

    if (
      selectedFile.type !== "application/pdf" &&
      !selectedFile.name
        .toLowerCase()
        .endsWith(".pdf")
    ) {

      setError(
        "Please upload a PDF file."
      );

      setFile(null);

      return;
    }

    setFile(selectedFile);

    setText("");

    setError("");

    dispatch(resetReduxAnalysis());

    setReviewDecision(null);

    setShowChangeComment(false);

    setReviewComment("");

    setSubmittedComment("");
  };


  /*
   * ============================================================
   * TEXT HANDLING
   * ============================================================
   */

  const handleTextChange = (event) => {

    setText(event.target.value);

    setFile(null);

    setError("");

    dispatch(resetReduxAnalysis());

    setReviewDecision(null);

    setShowChangeComment(false);

    setReviewComment("");

    setSubmittedComment("");
  };


  /*
   * ============================================================
   * AI ANALYSIS
   * ============================================================
   */

  const analyzeDeviation = async () => {

    if (!text.trim() && !file) {

      setError(
        "Please upload a PDF or enter a deviation report."
      );

      return;
    }

    setLoading(true);

    setError("");

    dispatch(resetReduxAnalysis());

    setReviewDecision(null);

    setShowChangeComment(false);

    setReviewComment("");

    setSubmittedComment("");


    try {

      const formData =
        new FormData();


      if (file) {

        formData.append(
          "file",
          file
        );

      } else {

        formData.append(
          "text",
          text
        );

      }


      const response =
        await axios.post(
          "http://127.0.0.1:8000/api/deviation/extract",
          formData
        );


      dispatch(
        setAnalysisResult(
          response.data
        )
      );


    } catch (err) {

      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Unable to analyze the deviation."
      );

    } finally {

      setLoading(false);
    }
  };


  /*
   * ============================================================
   * RESET
   * ============================================================
   */

  const resetAnalysis = () => {

    setText("");

    setFile(null);

    setError("");

    setLoading(false);

    setReviewLoading(false);

    setSaveLoading(false);

    setReviewDecision(null);

    setShowChangeComment(false);

    setReviewComment("");

    setSubmittedComment("");

    dispatch(
      resetReduxAnalysis()
    );


    const fileInput =
      document.getElementById(
        "pdf-upload"
      );


    if (fileInput) {

      fileInput.value = "";
    }
  };


  /*
   * ============================================================
   * FIELD UPDATE
   * ============================================================
   */

  const handleFieldChange =
    (field, value) => {

      dispatch(
        updateField({
          field,
          value
        })
      );


      /*
       * If the reviewer had already approved
       * the assessment and then edits a field,
       * approval must be obtained again.
       */

      if (
        reviewDecision === "approved"
      ) {

        setReviewDecision(null);

        setShowChangeComment(false);

        setSubmittedComment("");

        if (analysisResult) {

          dispatch(
            updateReview({

              review: {
                status:
                  "ready_for_human_review",

                message:
                  "Information was edited. Human approval is required again."
              },

              audit:
                analysisResult.audit
            })
          );
        }
      }
    };


  /*
   * ============================================================
   * HUMAN REVIEW
   * ============================================================
   */

  const submitReviewDecision =
    async (decision) => {

      const analysisId =
        analysisResult
          ?.audit
          ?.analysis_id;


      if (!analysisId) {

        setError(
          "Analysis ID is missing. Please run the analysis again."
        );

        return;
      }


      setReviewLoading(true);

      setError("");


      try {

        const response =
          await axios.post(
            "http://127.0.0.1:8000/api/deviation/review",
            {
              analysis_id:
                analysisId,

              decision:
                decision
            }
          );


        setReviewDecision(
          decision
        );


        dispatch(
          updateReview({

            review:
              response.data.review,

            audit:
              response.data.audit
          })
        );


      } catch (err) {

        console.error(err);

        setError(
          err.response?.data?.detail ||
          "Unable to submit the review decision."
        );

      } finally {

        setReviewLoading(false);
      }
    };


  /*
   * ============================================================
   * APPROVE ASSESSMENT
   * ============================================================
   */

  const approveAssessment = () => {

    submitReviewDecision(
      "approved"
    );
  };


  /*
   * ============================================================
   * REQUEST CHANGES
   *
   * First open the comment box.
   * Do NOT call the backend yet.
   * ============================================================
   */

  const requestChanges = () => {

    setShowChangeComment(true);

    setError("");
  };


  /*
   * ============================================================
   * SUBMIT CHANGE REQUEST WITH COMMENT
   * ============================================================
   */

  const submitChangesRequest =
    async () => {

      if (
        !reviewComment.trim()
      ) {

        setError(
          "Please enter a comment before requesting changes."
        );

        return;
      }


      await submitReviewDecision(
        "changes_requested"
      );


      setSubmittedComment(
        reviewComment.trim()
      );


      setShowChangeComment(false);

      setReviewComment("");
    };


  /*
   * ============================================================
   * SAVE DEVIATION
   * ============================================================
   */

  const saveDeviation = async () => {

    const analysisId =
      analysisResult
        ?.audit
        ?.analysis_id;


    if (!analysisId) {

      setError(
        "Analysis ID is missing. Please run the analysis again."
      );

      return;
    }


    if (
      reviewDecision !==
      "approved"
    ) {

      setError(
        "Human approval is required before saving the deviation."
      );

      return;
    }


    setSaveLoading(true);

    setError("");


    try {

      const response =
        await axios.post(
          "http://127.0.0.1:8000/api/deviation/save",
          {
            analysis_id:
              analysisId,

            decision:
              "approved",

            extracted_data:
              editedData
          }
        );


      if (
        response.data?.success
      ) {

        dispatch(
          markSaved()
        );


        dispatch(
          updateReview({

            review:
              response.data.review ||
              analysisResult.review,

            audit:
              response.data.audit ||
              analysisResult.audit
          })
        );
      }


    } catch (err) {

      console.error(err);

      setError(
        err.response?.data?.detail ||
        "Unable to save the deviation."
      );

    } finally {

      setSaveLoading(false);
    }
  };


  /*
   * ============================================================
   * RESULT DATA
   * ============================================================
   */

  const extractedData =
    analysisResult
      ?.extracted_data ||
    {};


  const validation =
    analysisResult
      ?.validation ||
    {};


  const review =
    analysisResult
      ?.review ||
    {};


  const evidenceData =
    analysisResult
      ?.evidence ||
    {};


  const riskAssessment =
    analysisResult
      ?.risk_assessment ||
    {};


  const audit =
    analysisResult
      ?.audit ||
    {};


  /*
   * ============================================================
   * EVIDENCE
   * ============================================================
   */

  const evidenceList =
    Array.isArray(
      evidenceData?.evidence
    )
      ? evidenceData.evidence
      : [];


  /*
   * ============================================================
   * RISK FACTORS
   * ============================================================
   */

  const riskFactors =
    riskAssessment
      ?.risk_factors ||
    {};


  const riskFactorEntries =
    Array.isArray(
      riskFactors
    )

      ? riskFactors.map(
          (item, index) => {

            if (
              !item ||
              typeof item !==
                "object"
            ) {

              return [
                `Factor ${index + 1}`,
                item
              ];
            }


            const name =
              item.name ||
              item.factor ||
              item.category ||
              item.type ||
              item.title ||
              item.factor_name;


            return [
              name ||
                `Factor ${index + 1}`,

              item
            ];
          }
        )

      : Object.entries(
          riskFactors
        );


  const getRiskFactorLevel =
    (factorData) => {

      if (
        !factorData ||
        typeof factorData !==
          "object"
      ) {

        return "";
      }


      return (
        factorData.level ||
        factorData.impact ||
        factorData.rating ||
        factorData.severity ||
        ""
      );
    };


  const getRiskFactorDescription =
    (factorData) => {

      if (!factorData) {
        return "";
      }


      if (
        typeof factorData ===
        "string"
      ) {

        return factorData;
      }


      return (
        factorData.reason ||
        factorData.description ||
        factorData.observation ||
        factorData.value ||
        factorData.details ||
        ""
      );
    };


  const formatFactorName =
    (name, index) => {

      if (
        !name ||
        String(name).trim() ===
          ""
      ) {

        return `Factor ${index + 1}`;
      }


      return String(name)

        .replace(
          /_/g,
          " "
        )

        .replace(
          /-/g,
          " "
        )

        .replace(
          /\b\w/g,
          (letter) =>
            letter.toUpperCase()
        );
    };


  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (

    <div className="app">


      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="header">

        <div>

          <h1>
            AIVOA Deviation Copilot
          </h1>

          <p>
            AI-powered pharmaceutical
            deviation intake and risk assessment
          </p>

        </div>


        <div className="status">

          <span className="status-dot"></span>

          AI System Ready

        </div>

      </header>


      {/* =====================================================
          MAIN
      ====================================================== */}

      <main className="container">


        {/* ===================================================
            STEP 1
        ==================================================== */}

        <section className="input-section">

          <div className="section-title">

            <h2>
              Deviation Report
            </h2>

            <span>
              Step 1
            </span>

          </div>


          <p className="description">

            Upload a deviation PDF or paste
            the report text below. The Copilot
            will extract and structure the
            deviation information.

          </p>


          <div className="upload-box">

            <div className="upload-icon">
              📄
            </div>


            <h3>
              Upload Deviation PDF
            </h3>


            <p>
              Select a PDF deviation report
              from your computer.
            </p>


            <label
              htmlFor="pdf-upload"
              className="upload-button"
            >
              Choose PDF
            </label>


            <input
              id="pdf-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={
                handleFileChange
              }
            />


            {file && (

              <div className="selected-file">

                <span>
                  ✓
                </span>

                {file.name}

              </div>

            )}

          </div>


          <div className="divider">

            <span>
              OR
            </span>

          </div>


          <textarea
            value={text}
            onChange={
              handleTextChange
            }
            placeholder="Paste deviation report here..."
            disabled={!!file}
          />


          <div className="action-row">

            <button
              onClick={
                analyzeDeviation
              }
              disabled={loading}
            >

              {loading
                ? "Analyzing..."
                : "Analyze Deviation"}

            </button>


            {(text ||
              file ||
              analysisResult) && (

              <button
                className="reset-button"
                onClick={
                  resetAnalysis
                }
              >
                New Analysis
              </button>

            )}

          </div>


          {error && (

            <div className="error">
              {error}
            </div>

          )}

        </section>


        {/* ===================================================
            STEP 2
        ==================================================== */}

        {loading && (

          <section
            className="card processing-card"
          >

            <div className="section-title">

              <h2>
                AI Processing
              </h2>

              <span>
                Step 2
              </span>

            </div>


            <p className="card-subtitle">

              Processing the deviation report
              through the AI workflow.

            </p>


            <div className="processing-list">

              <div className="processing-item">

                <span>
                  ●
                </span>

                Document received

              </div>


              <div className="processing-item">

                <span>
                  ●
                </span>

                Extracting deviation information

              </div>


              <div className="processing-item">

                <span>
                  ●
                </span>

                Validating extracted fields

              </div>


              <div className="processing-item">

                <span>
                  ●
                </span>

                Identifying supporting evidence

              </div>


              <div className="processing-item">

                <span>
                  ●
                </span>

                Preparing impact and severity assessment

              </div>

            </div>

          </section>

        )}


        {/* ===================================================
            RESULTS
        ==================================================== */}

        {analysisResult && (

          <section className="results">


            <div className="section-title">

              <h2>
                Analysis Results
              </h2>

              <span>
                AI Generated
              </span>

            </div>


            {/* =================================================
                STEP 3
            ================================================== */}

            <div className="card">

              <div className="section-title">

                <h2>
                  Log Deviation
                </h2>

                <span>
                  Step 3
                </span>

              </div>


              <p className="card-subtitle">

                AI-generated deviation information.
                Review and edit the information
                before approval.

              </p>


              <div className="editable-form">


                <div className="form-group">

                  <label>
                    Site
                  </label>

                  <input
                    value={
                      editedData.site ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "site",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Date of Occurrence
                  </label>

                  <input
                    value={
                      editedData.date_of_occurrence ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "date_of_occurrence",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Product
                  </label>

                  <input
                    value={
                      editedData.product ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "product",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Batch Number
                  </label>

                  <input
                    value={
                      editedData.batch_number ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "batch_number",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="form-group full-width">

                  <label>
                    Title
                  </label>

                  <input
                    value={
                      editedData.title ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "title",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="form-group full-width">

                  <label>
                    Description
                  </label>

                  <textarea
                    value={
                      editedData.description ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "description",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Expected Condition
                  </label>

                  <input
                    value={
                      editedData.expected ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "expected",
                        e.target.value
                      )
                    }
                  />

                </div>


                <div className="form-group">

                  <label>
                    Observed Condition
                  </label>

                  <input
                    value={
                      editedData.actual ||
                      ""
                    }
                    onChange={(e) =>
                      handleFieldChange(
                        "actual",
                        e.target.value
                      )
                    }
                  />

                </div>

              </div>


              <div className="edit-note">

                AI-generated information can be
                reviewed and edited before human
                approval.

              </div>


              <h3 className="subsection-title">

                Condition Assessment

              </h3>


              <div className="comparison-grid">


                <div className="card">

                  <h3>
                    Expected Condition
                  </h3>

                  <div className="value expected">

                    {editedData.expected ||
                      "Not available"}

                  </div>

                </div>


                <div className="card">

                  <h3>
                    Observed Condition
                  </h3>

                  <div className="value actual">

                    {editedData.actual ||
                      "Not available"}

                  </div>

                </div>

              </div>


              <div className="completeness-inline">

                <h3>
                  Data Completeness
                </h3>


                <div className="completeness-status">

                  {validation.status ===
                  "complete"

                    ? "Complete"

                    : validation.status ===
                      "partial"

                    ? "Partial"

                    : validation.status ===
                      "insufficient"

                    ? "Insufficient"

                    : "Complete"}

                </div>


                <strong>

                  {validation.field_count ??
                    7}

                  /

                  {validation.total_fields ??
                    7}

                  {" "}
                  required fields detected

                </strong>


                {validation.missing_fields &&
                validation.missing_fields.length >
                  0 ? (

                  <p className="missing-fields">

                    Missing:{" "}

                    {validation.missing_fields.join(
                      ", "
                    )}

                  </p>

                ) : (

                  <p className="success-text">

                    ✓ All required deviation
                    fields were detected.

                  </p>

                )}

              </div>

            </div>


            {/* =================================================
                STEP 4
            ================================================== */}

            <div className="risk-card">

              <div className="section-title">

                <h2>
                  AI Impact & Severity
                </h2>

                <span>
                  Step 4
                </span>

              </div>


              <div className="risk-header">

                <div>

                  <p>

                    AI-generated assessment
                    based on the deviation
                    information and evidence.

                  </p>

                </div>


                <div className="risk-level">

                  {riskAssessment.risk_level ||
                    "Not assessed"}

                </div>

              </div>


              <div className="risk-content">


                <div>

                  <h4>
                    Reason
                  </h4>

                  <p>

                    {riskAssessment.risk_reason ||
                      "No risk rationale available."}

                  </p>

                </div>


                <div>

                  <h4>
                    Recommended Action
                  </h4>

                  <p>

                    {riskAssessment.recommended_action ||
                      "No recommended action available."}

                  </p>

                </div>

              </div>


              {riskFactorEntries.length >
                0 && (

                <div className="risk-factors">

                  <h4>
                    Risk Factor Analysis
                  </h4>


                  <div className="risk-factor-list">

                    {riskFactorEntries.map(
                      (
                        [
                          factorName,
                          factorData
                        ],
                        index
                      ) => {

                        const level =
                          getRiskFactorLevel(
                            factorData
                          );


                        const description =
                          getRiskFactorDescription(
                            factorData
                          );


                        return (

                          <div
                            className="risk-factor"
                            key={index}
                          >

                            <div className="risk-factor-top">

                              <div className="risk-factor-name">

                                {formatFactorName(
                                  factorName,
                                  index
                                )}

                              </div>


                              {level && (

                                <div className="risk-factor-impact">

                                  {String(level)}

                                </div>

                              )}

                            </div>


                            {description && (

                              <div className="risk-factor-description">

                                {description}

                              </div>

                            )}

                          </div>

                        );
                      }
                    )}

                  </div>

                </div>

              )}


              <div className="evidence-section">

                <h4>
                  Supporting Evidence
                </h4>


                <div className="evidence-list">

                  {evidenceList.length >
                  0 ? (

                    evidenceList.map(
                      (
                        item,
                        index
                      ) => {

                        const evidenceText =
                          typeof item ===
                          "string"

                            ? item

                            : item?.text ||
                              item?.evidence ||
                              item?.statement ||
                              "";


                        const evidenceSource =
                          typeof item ===
                          "object"

                            ? item?.source ||
                              evidenceData?.source ||
                              "Original deviation report"

                            : evidenceData?.source ||
                              "Original deviation report";


                        return (

                          <div
                            className="evidence-item"
                            key={index}
                          >

                            <div className="evidence-main">

                              <span>
                                ✓
                              </span>

                              <p>

                                {item?.label
                                  ? `${item.label}: `
                                  : ""}

                                {evidenceText}

                              </p>

                            </div>


                            <div className="evidence-source">

                              Source:{" "}

                              {evidenceSource}

                            </div>

                          </div>

                        );
                      }
                    )

                  ) : (

                    <p>

                      No supporting evidence
                      identified.

                    </p>

                  )}

                </div>

              </div>

            </div>


            {/* =================================================
                STEP 5 — HUMAN REVIEW
            ================================================== */}

            <div className="card human-review-card">

              <div className="section-title">

                <h2>
                  Human Review
                </h2>

                <span>
                  Step 5
                </span>

              </div>


              <p className="card-subtitle">

                Review the AI-generated deviation
                information and impact assessment
                before saving.

              </p>


              <div className="review-status">

                {reviewDecision ===
                "approved"

                  ? "Assessment Approved"

                  : reviewDecision ===
                    "changes_requested"

                  ? "Changes Requested"

                  : "Ready for Review"}

              </div>


              <p>

                {reviewDecision ===
                "approved"

                  ? "The human reviewer approved the AI-generated assessment."

                  : reviewDecision ===
                    "changes_requested"

                  ? "Changes were requested. Review and edit the deviation information before approval."

                  : review.message ||
                    "All generated information is ready for human review."}

              </p>


              {/* =================================================
                  COMMENT BOX
              ================================================== */}

              {showChangeComment && (

                <div className="change-request-box">

                  <label>
                    Reviewer Comment
                  </label>


                  <textarea
                    value={
                      reviewComment
                    }
                    onChange={(e) =>
                      setReviewComment(
                        e.target.value
                      )
                    }
                    placeholder="Enter the reason for requesting changes..."
                  />


                  <div className="change-request-actions">

                    <button
                      className="submit-changes-button"
                      onClick={
                        submitChangesRequest
                      }
                      disabled={
                        reviewLoading
                      }
                    >

                      {reviewLoading
                        ? "Submitting..."
                        : "Submit Changes Request"}

                    </button>


                    <button
                      className="cancel-changes-button"
                      onClick={() => {

                        setShowChangeComment(
                          false
                        );

                        setReviewComment(
                          ""
                        );

                        setError("");

                      }}
                    >
                      Cancel
                    </button>

                  </div>

                </div>

              )}


              {/* =================================================
                  REVIEW BUTTONS
              ================================================== */}

              {!showChangeComment &&
                reviewDecision !==
                  "approved" && (

                <div className="review-actions">

                  <button
                    className="approve-button"
                    onClick={
                      approveAssessment
                    }
                    disabled={
                      reviewLoading
                    }
                  >

                    {reviewLoading
                      ? "Submitting..."
                      : "✓ Approve Assessment"}

                  </button>


                  <button
                    className="changes-button"
                    onClick={
                      requestChanges
                    }
                    disabled={
                      reviewLoading
                    }
                  >
                    Request Changes
                  </button>

                </div>

              )}


              {/* =================================================
                  REVIEWER COMMENT
              ================================================== */}

              {submittedComment && (

                <div className="review-comment">

                  <div className="review-comment-title">

                    Reviewer Comment

                  </div>


                  <p>
                    {submittedComment}
                  </p>

                </div>

              )}


              {/* =================================================
                  APPROVED MESSAGE
              ================================================== */}

              {reviewDecision ===
                "approved" && (

                <div className="review-approved">

                  ✓ Human reviewer approved
                  the assessment.

                </div>

              )}


              {/* =================================================
                  CHANGES REQUESTED
              ================================================== */}

              {reviewDecision ===
                "changes_requested" &&
                !showChangeComment && (

                <div className="review-changes">

                  ⚠ Changes requested.
                  Review the generated
                  information and approve
                  when ready.

                </div>

              )}

            </div>


            {/* =================================================
                STEP 6 — SAVE
            ================================================== */}

            <div className="card save-card">

              <div className="section-title">

                <h2>
                  Save Deviation
                </h2>

                <span>
                  Step 6
                </span>

              </div>


              {saved ? (

                <>

                  <h3 className="success-text">

                    ✓ Deviation saved successfully.

                  </h3>


                  <div className="analysis-id">

                    <span>
                      Analysis ID
                    </span>

                    <strong>

                      {audit.analysis_id ||
                        "N/A"}

                    </strong>

                  </div>

                </>

              ) : (

                <>

                  <p className="card-subtitle">

                    {reviewDecision ===
                    "approved"

                      ? "The deviation has been approved and is ready to be saved."

                      : "Human approval is required before the deviation can be saved."}

                  </p>


                  <button
                    onClick={
                      saveDeviation
                    }
                    disabled={
                      reviewDecision !==
                        "approved" ||
                      saveLoading
                    }
                  >

                    {saveLoading
                      ? "Saving..."
                      : "Save Deviation"}

                  </button>

                </>

              )}

            </div>


            {/* =================================================
                AUDIT TRAIL
            ================================================== */}

            <div className="card audit-card">

              <h3>
                Audit Trail
              </h3>


              <p className="card-subtitle">

                Traceable record of the
                deviation workflow

              </p>


              {audit.analysis_id && (

                <div className="analysis-id">

                  <span>
                    Analysis ID
                  </span>

                  <strong>
                    {audit.analysis_id}
                  </strong>

                </div>

              )}


              <div className="audit-list">

                <div className="audit-item">
                  <span>✓</span>
                  Document received
                </div>


                <div className="audit-item">
                  <span>✓</span>
                  Fields extracted
                </div>


                <div className="audit-item">
                  <span>✓</span>
                  Validation completed
                </div>


                <div className="audit-item">
                  <span>✓</span>
                  Evidence identified
                </div>


                <div className="audit-item">
                  <span>✓</span>
                  Risk assessment completed
                </div>


                <div className="audit-item">
                  <span>✓</span>
                  Human review gate activated
                </div>


                {reviewDecision ===
                  "changes_requested" && (

                  <div className="audit-item">

                    <span>✓</span>

                    Changes requested by human reviewer

                  </div>

                )}


                {reviewDecision ===
                  "approved" && (

                  <div className="audit-item">

                    <span>✓</span>

                    Human assessment approved

                  </div>

                )}


                {saved && (

                  <div className="audit-item">

                    <span>✓</span>

                    Deviation saved to database

                  </div>

                )}

              </div>


              <div className="audit-tags">

                <span>

                  Validation:{" "}

                  {validation.status ||
                    "complete"}

                </span>


                <span>

                  Risk:{" "}

                  {riskAssessment.risk_level ||
                    "Not assessed"}

                </span>


                <span>

                  Review:{" "}

                  {reviewDecision ||
                    review.status ||
                    "ready_for_human_review"}

                </span>


                <span>

                  Saved:{" "}

                  {saved
                    ? "Yes"
                    : "No"}

                </span>

              </div>

            </div>


            {/* =================================================
                NEW ANALYSIS
            ================================================== */}

            <div className="action-row">

              <button
                className="reset-button"
                onClick={
                  resetAnalysis
                }
              >
                Start New Analysis
              </button>

            </div>

          </section>

        )}

      </main>

    </div>
  );
}


export default App;