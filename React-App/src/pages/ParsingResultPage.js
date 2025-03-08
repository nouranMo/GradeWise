import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

function ParsingResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { parsingResult } = location.state || {};

  // Debug log for references validation
  React.useEffect(() => {
    if (parsingResult?.references_validation) {
      console.log(
        "References validation data:",
        parsingResult.references_validation
      );
    }
  }, [parsingResult]);

  if (!parsingResult || parsingResult.status === "error") {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          {parsingResult?.message || "No Parsing Result Found"}
        </h2>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700"
        >
          Go Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Analysis Results</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 bg-[#ff6464] text-white rounded-lg hover:bg-[#ff4444] transition-colors duration-300 ease-in-out"
          >
            Back to Dashboard
          </button>
        </div>

        {/* SRS Structure Validation */}
        {parsingResult.srs_validation && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              SRS Structure Analysis
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title="Matching Sections"
                  value={
                    parsingResult.srs_validation.structure_validation
                      .matching_sections.length
                  }
                  color="green"
                />
                <StatCard
                  title="Missing Sections"
                  value={
                    parsingResult.srs_validation.structure_validation
                      .missing_sections.length
                  }
                  color="red"
                />
              </div>

              {/* Missing Sections */}
              {parsingResult.srs_validation.structure_validation
                .missing_sections.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-600">
                    Missing Sections:
                  </h3>
                  <ul className="list-disc list-inside">
                    {parsingResult.srs_validation.structure_validation.missing_sections.map(
                      (section, index) => (
                        <li key={index} className="text-gray-700">
                          {section}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* References Analysis */}
        {parsingResult.references_validation && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              References Analysis
            </h2>

            {/* Debug information - remove in production */}
            {process.env.NODE_ENV !== "production" && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded mb-4 text-xs">
                <p>Available data:</p>
                <pre className="overflow-auto max-h-40">
                  {JSON.stringify(parsingResult.references_validation, null, 2)}
                </pre>
              </div>
            )}

            {/* Statistics - Only show if available */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                title="Total References"
                value={
                  parsingResult.references_validation.statistics
                    ?.total_references ||
                  (Array.isArray(
                    parsingResult.references_validation.reformatted_references
                  )
                    ? parsingResult.references_validation.reformatted_references
                        .length
                    : 0)
                }
                color="blue"
              />
              <StatCard
                title="Valid Format"
                value={
                  parsingResult.references_validation.statistics
                    ?.valid_references ||
                  parsingResult.references_validation.reference_validation
                    ?.valid_count ||
                  (parsingResult.references_validation.reference_validation
                    ?.status === "valid"
                    ? Array.isArray(
                        parsingResult.references_validation
                          .reformatted_references
                      )
                      ? parsingResult.references_validation
                          .reformatted_references.length
                      : 0
                    : 0)
                }
                color="green"
              />
              <StatCard
                title="Cited References"
                value={
                  parsingResult.references_validation.statistics
                    ?.cited_references ||
                  (Array.isArray(
                    parsingResult.references_validation.reference_details
                  )
                    ? parsingResult.references_validation.reference_details.filter(
                        (ref) => ref.is_cited
                      ).length
                    : 0)
                }
                color="green"
              />
              <StatCard
                title="Verified Online"
                value={
                  parsingResult.references_validation.statistics
                    ?.verified_references ||
                  (Array.isArray(
                    parsingResult.references_validation.reference_details
                  )
                    ? parsingResult.references_validation.reference_details.filter(
                        (ref) => ref.online_verification?.verified
                      ).length
                    : Array.isArray(
                        parsingResult.references_validation
                          .reformatted_references
                      )
                    ? parsingResult.references_validation.reformatted_references.filter(
                        (ref) => ref.verification?.verified
                      ).length
                    : 0)
                }
                color="blue"
              />
            </div>

            {/* References List */}
            <div className="space-y-4">
              {/* Enhanced format */}
              {parsingResult.references_validation.reference_details &&
              Array.isArray(
                parsingResult.references_validation.reference_details
              ) &&
              parsingResult.references_validation.reference_details.length >
                0 ? (
                parsingResult.references_validation.reference_details.map(
                  (ref, index) => (
                    <EnhancedReferenceCard
                      key={index}
                      reference={ref}
                      validationDetails={
                        parsingResult.references_validation.reference_validation
                          ?.validation_details?.[index]
                      }
                    />
                  )
                )
              ) : parsingResult.references_validation.reformatted_references ? (
                // Legacy format - direct array of references
                Array.isArray(
                  parsingResult.references_validation.reformatted_references
                ) ? (
                  parsingResult.references_validation.reformatted_references.map(
                    (ref, index) => (
                      <ReferenceCard
                        key={index}
                        reference={ref}
                        index={index + 1}
                      />
                    )
                  )
                ) : (
                  // Handle case where reformatted_references is not an array but a direct property
                  <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="text-lg font-medium mb-2">References</h4>
                    <pre className="text-gray-600 whitespace-pre-wrap text-sm">
                      {JSON.stringify(
                        parsingResult.references_validation
                          .reformatted_references,
                        null,
                        2
                      )}
                    </pre>
                  </div>
                )
              ) : parsingResult.references_validation.reference_validation
                  ?.errors ? (
                // Legacy format - errors in validation
                <div>
                  <p className="text-red-600 font-medium">Validation Errors:</p>
                  <ul className="list-disc list-inside">
                    {Array.isArray(
                      parsingResult.references_validation.reference_validation
                        .errors
                    ) ? (
                      parsingResult.references_validation.reference_validation.errors.map(
                        (error, i) => (
                          <li key={i} className="text-gray-600">
                            <p className="font-medium">
                              {typeof error.reference === "string"
                                ? error.reference
                                : JSON.stringify(error.reference)}
                            </p>
                            <ul className="list-disc list-inside ml-4">
                              {Array.isArray(error.issues) ? (
                                error.issues.map((issue, j) => (
                                  <li key={j} className="text-red-500">
                                    {issue}
                                  </li>
                                ))
                              ) : (
                                <li className="text-red-500">
                                  {JSON.stringify(error.issues)}
                                </li>
                              )}
                            </ul>
                          </li>
                        )
                      )
                    ) : (
                      <li className="text-gray-600">Invalid error format</li>
                    )}
                  </ul>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-2">
                    No references found or invalid format
                  </p>
                  <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto max-h-40">
                    {JSON.stringify(
                      parsingResult.references_validation,
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Analysis */}
        {parsingResult.content_analysis && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Content Analysis
            </h2>

            {/* Similarity Matrix */}
            {parsingResult.content_analysis.scope_sources &&
              parsingResult.content_analysis.similarity_matrix && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-3">
                    Similarity Matrix
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                      <thead>
                        <tr>
                          <th className="border p-2 bg-gray-50">Section</th>
                          {parsingResult.content_analysis.scope_sources.map(
                            (source, i) => (
                              <th key={i} className="border p-2 bg-gray-50">
                                {source}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsingResult.content_analysis.similarity_matrix.map(
                          (row, i) => (
                            <tr key={i}>
                              <td className="border p-2 font-medium bg-gray-50">
                                {
                                  parsingResult.content_analysis.scope_sources[
                                    i
                                  ]
                                }
                              </td>
                              {row.map((value, j) => (
                                <td key={j} className="border p-2 text-center">
                                  {Math.round(value * 100)}%
                                </td>
                              ))}
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Spelling and Grammar */}
            {parsingResult.content_analysis.spelling_grammar &&
              parsingResult.content_analysis.spelling_grammar.length > 0 && (
                <div>
                  <h3 className="text-xl font-semibold mb-3">
                    Spelling and Grammar
                  </h3>
                  {parsingResult.content_analysis.spelling_grammar.map(
                    (result, index) => (
                      <div
                        key={index}
                        className="mb-4 p-4 bg-gray-50 rounded-lg"
                      >
                        <h4 className="font-medium mb-2">
                          {parsingResult.content_analysis.scope_sources[
                            index
                          ] || `Section ${index + 1}`}
                        </h4>
                        {result.misspelled &&
                          Object.keys(result.misspelled).length > 0 && (
                            <div className="mb-2">
                              <p className="text-sm font-medium text-red-600">
                                Spelling Issues:
                              </p>
                              <ul className="list-disc list-inside">
                                {Object.entries(result.misspelled).map(
                                  ([word, suggestion], i) => (
                                    <li key={i} className="text-sm">
                                      {word} → {suggestion}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}
                        {result.grammar_suggestions &&
                          result.grammar_suggestions.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-orange-600">
                                Grammar Issues:
                              </p>
                              <ul className="list-disc list-inside">
                                {result.grammar_suggestions.map((issue, i) => (
                                  <li key={i} className="text-sm">
                                    {issue.message}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>
              )}
          </div>
        )}

        {/* Image Analysis */}
        {parsingResult.image_analysis && (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Image Analysis
            </h2>
            <div className="space-y-4">
              {parsingResult.image_analysis.processed_images.map(
                (image, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">
                      Image {image.image_index}
                    </h3>
                    <p className="text-sm text-gray-700">
                      {image.extracted_text}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, color }) {
  const colors = {
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-700 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  };

  return (
    <div className={`${colors[color]} border rounded-lg p-4`}>
      <h4 className="text-sm font-medium">{title}</h4>
      <p className="text-2xl font-bold mt-2">{value}</p>
    </div>
  );
}

function ReferenceCard({ reference, index }) {
  // Check if reference is an object or a string
  const isObject = typeof reference === "object" && reference !== null;

  // If it's an object, extract the properties
  const formatCheck = isObject
    ? reference.format_check || { valid: false, errors: [] }
    : { valid: false, errors: [] };
  const verification = isObject
    ? reference.verification || { verified: false }
    : { verified: false };
  const citations = isObject
    ? reference.citations || { count: 0, is_cited: false, contexts: [] }
    : { count: 0, is_cited: false, contexts: [] };
  const referenceText = isObject
    ? reference.reformatted || reference.original || JSON.stringify(reference)
    : reference;

  // State for showing/hiding citations
  const [showCitations, setShowCitations] = React.useState(false);

  const handleVerificationClick = () => {
    if (verification.verified && verification.details?.search_url) {
      window.open(verification.details.search_url, "_blank");
    }
  };

  const toggleCitations = () => {
    setShowCitations(!showCitations);
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-lg font-medium">Reference [{index}]</h4>
        <div className="flex gap-2">
          <Badge
            text={formatCheck.valid ? "Valid Format" : "Invalid Format"}
            color={formatCheck.valid ? "green" : "red"}
          />
          <Badge
            text={citations.is_cited ? `Cited (${citations.count})` : "Uncited"}
            color={citations.is_cited ? "green" : "red"}
            onClick={citations.is_cited ? toggleCitations : undefined}
            className={
              citations.is_cited ? "cursor-pointer hover:opacity-80" : ""
            }
          />
          <Badge
            text={verification.verified ? "Verified Online" : "Unverified"}
            color={verification.verified ? "green" : "yellow"}
            onClick={
              verification.verified ? handleVerificationClick : undefined
            }
            className={
              verification.verified ? "cursor-pointer hover:opacity-80" : ""
            }
          />
        </div>
      </div>

      <div className="space-y-2">
        {isObject && (
          <>
            {reference.original && (
              <div className="text-sm">
                <p className="font-medium">Original:</p>
                <p className="text-gray-600">{reference.original}</p>
              </div>
            )}
            {reference.reformatted && (
              <div className="text-sm">
                <p className="font-medium">Reformatted:</p>
                <p className="text-gray-600">{reference.reformatted}</p>
              </div>
            )}
          </>
        )}

        {!isObject && (
          <div className="text-sm">
            <p className="text-gray-600">{referenceText}</p>
          </div>
        )}

        {/* Format Issues */}
        {!formatCheck.valid &&
          formatCheck.errors &&
          formatCheck.errors.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-red-600">Format Issues:</p>
              <ul className="list-disc list-inside text-red-500">
                {formatCheck.errors.map((error, i) => (
                  <li key={i}>{error}</li>
                ))}
              </ul>
            </div>
          )}

        {/* Verification Details */}
        {verification.verified && (
          <div className="text-sm">
            <p className="font-medium text-green-600">Verification:</p>
            <p className="text-gray-600">
              Source: {verification.source || "Web Search"}
              {verification.details?.search_term && (
                <span className="block mt-1">
                  Search term: "{verification.details.search_term}"
                </span>
              )}
            </p>
          </div>
        )}

        {/* Citations in Document */}
        {citations.is_cited &&
          citations.contexts &&
          citations.contexts.length > 0 && (
            <div className="text-sm mt-4">
              <div className="flex items-center justify-between">
                <p className="font-medium text-blue-600">
                  Citations in Document ({citations.count}):
                </p>
                <button
                  onClick={toggleCitations}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  {showCitations ? "Hide Citations" : "Show Citations"}
                </button>
              </div>

              {showCitations && (
                <div className="mt-2 space-y-2">
                  {citations.contexts.map((context, i) => (
                    <div
                      key={i}
                      className="p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <p
                        className="text-gray-600"
                        dangerouslySetInnerHTML={{
                          __html: context
                            ? context.replace(
                                /\*\*(.*?)\*\*/g,
                                '<span class="font-bold text-blue-600">$1</span>'
                              )
                            : "Context not available",
                        }}
                      ></p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  );
}

function EnhancedReferenceCard({ reference, validationDetails }) {
  // Ensure reference is an object
  const ref =
    typeof reference === "object" && reference !== null ? reference : {};
  const refNumber = ref.reference_number || "?";
  const isValid = validationDetails?.is_valid || false;
  const isCited = ref.is_cited || false;
  const citationCount = ref.citations_in_document?.length || 0;
  const isVerified = ref.online_verification?.verified || false;

  // State for showing/hiding citations
  const [showCitations, setShowCitations] = React.useState(false);

  const handleVerificationClick = () => {
    if (isVerified && ref.online_verification?.url) {
      window.open(ref.online_verification.url, "_blank");
    }
  };

  const toggleCitations = () => {
    setShowCitations(!showCitations);
  };

  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <h4 className="text-lg font-medium">Reference [{refNumber}]</h4>
        <div className="flex gap-2">
          <Badge
            text={isValid ? "Valid IEEE Format" : "Invalid Format"}
            color={isValid ? "green" : "red"}
          />
          <Badge
            text={isCited ? `Cited (${citationCount})` : "Uncited"}
            color={isCited ? "green" : "red"}
            onClick={isCited ? toggleCitations : undefined}
            className={isCited ? "cursor-pointer hover:opacity-80" : ""}
          />
          <Badge
            text={isVerified ? "Verified Online" : "Unverified"}
            color={isVerified ? "green" : "yellow"}
            onClick={isVerified ? handleVerificationClick : undefined}
            className={isVerified ? "cursor-pointer hover:opacity-80" : ""}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="text-sm">
          <p className="font-medium">Reference:</p>
          <p className="text-gray-600">
            {typeof ref.reference === "string"
              ? ref.reference
              : JSON.stringify(ref.reference)}
          </p>
        </div>

        {/* Format Issues */}
        {validationDetails &&
          !isValid &&
          validationDetails.issues &&
          Array.isArray(validationDetails.issues) &&
          validationDetails.issues.length > 0 && (
            <div className="text-sm">
              <p className="font-medium text-red-600">IEEE Format Issues:</p>
              <ul className="list-disc list-inside text-red-500">
                {validationDetails.issues.map((issue, i) => (
                  <li key={i}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

        {/* Online Verification */}
        {isVerified && (
          <div className="text-sm">
            <p className="font-medium text-green-600">Verified Online:</p>
            <p className="text-gray-600">
              Source: {ref.online_verification?.source || "Unknown"}
              {ref.online_verification?.match_score &&
                ` (Match: ${ref.online_verification.match_score}%)`}
            </p>
            {ref.online_verification?.search_term && (
              <p className="text-gray-600">
                Search term: "{ref.online_verification.search_term}"
              </p>
            )}
            {ref.online_verification?.found_title && (
              <p className="text-gray-600">
                Found: {ref.online_verification.found_title}
              </p>
            )}
          </div>
        )}

        {/* Citations in Document */}
        {isCited && (
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium text-blue-600">
                Citations in Document ({citationCount}):
              </p>
              <button
                onClick={toggleCitations}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                {showCitations ? "Hide Citations" : "Show Citations"}
              </button>
            </div>

            {showCitations &&
              ref.citations_in_document &&
              Array.isArray(ref.citations_in_document) &&
              ref.citations_in_document.length > 0 && (
                <div className="mt-2 space-y-2">
                  {ref.citations_in_document.map((citation, i) => (
                    <div
                      key={i}
                      className="p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      {citation.section && (
                        <p className="text-xs font-medium text-blue-500 mb-1">
                          Section: {citation.section}
                        </p>
                      )}
                      <p
                        className="text-gray-600"
                        dangerouslySetInnerHTML={{
                          __html: citation.context
                            ? citation.context.replace(
                                /\*\*(.*?)\*\*/g,
                                '<span class="font-bold text-blue-600">$1</span>'
                              )
                            : "Context not available",
                        }}
                      ></p>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ text, color, onClick, className = "" }) {
  const colors = {
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
  };

  return (
    <span
      className={`${colors[color]} text-xs px-2 py-1 rounded-full ${className}`}
      onClick={onClick}
      title={onClick ? "Click to view online" : ""}
    >
      {text}
    </span>
  );
}

export default ParsingResult;
