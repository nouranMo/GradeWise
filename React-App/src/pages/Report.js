import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";
import ReactMarkdown from "react-markdown";

function Report() {
  const location = useLocation();
  const { parsingResult, documentInfo } = location.state || {};

  const defaultDocInfo = {
    name: "Unknown Document",
    size: "N/A",
    date: new Date().toLocaleDateString(),
    duration: "N/A",
  };

  const documentDetails = {
    name: documentInfo?.name || defaultDocInfo.name,
    size: documentInfo?.size || defaultDocInfo.size,
    date: documentInfo?.date || defaultDocInfo.date,
    duration: documentInfo?.duration || defaultDocInfo.duration,
    timestamp: new Date().toLocaleString(),
  };

  const [expandedSections, setExpandedSections] = useState({});
  const [recommendations, setRecommendations] = useState(null);

  // Counts for summary
  const getCounts = (results) => {
    let passed = 0;
    let failed = 0;
    let warnings = 0;

    if (results) {
      Object.entries(results).forEach(([_, result]) => {
        if (result?.status === "success") passed++;
        else if (result?.status === "error" || result?.status === "fail")
          failed++;
        else if (result?.status === "warning") warnings++;
      });
    }

    return { passed, failed, warnings };
  };

  const {
    passed: passedChecks,
    failed: failedChecks,
    warnings,
  } = getCounts(parsingResult);

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    if (minutes === 0) {
      return `${remainingSeconds} seconds`;
    }
    return `${minutes} min ${remainingSeconds} sec`;
  };

  const formatGeneratedTime = (date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    });
  };
  // Helper Components
  const CollapsibleSection = ({ id, title, children, status }) => {
    const getStatusStyles = (status) => {
      if (!status) return "";

      status = status.toLowerCase();

      if (["success", "pass", "passed"].includes(status)) {
        return "bg-green-100 text-green-800";
      } else if (["error", "fail", "failed"].includes(status)) {
        return "bg-red-100 text-red-800";
      } else {
        return "bg-yellow-100 text-yellow-800";
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
        <button
          onClick={() => toggleSection(id)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center">
            <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
            {status && (
              <span
                className={`ml-3 px-2 py-1 text-xs rounded ${getStatusStyles(
                  status
                )}`}
              >
                {status}
              </span>
            )}
          </div>
          <svg
            className={`w-5 h-5 transform transition-transform ${
              expandedSections[id] ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        {expandedSections[id] && <div className="px-6 py-4">{children}</div>}
      </div>
    );
  };

  // Helper function to render analysis card
  const AnalysisCard = ({ title, data, type }) => {
    const renderContent = () => {
      if (!data) {
        return <p className="text-gray-500">No data available</p>;
      }

      switch (type) {
        case "list":
          if (data.reformatted_references) {
            return (
              <ul className="list-disc list-inside">
                {data.reformatted_references.map((ref, index) => (
                  <li key={index} className="mb-2">
                    <div className="ml-2">
                      <p className="font-medium">Original: {ref.original}</p>
                      <p className="text-green-600">
                        Reformatted: {ref.reformatted}
                      </p>
                      {ref.errors && ref.errors.length > 0 && (
                        <ul className="list-disc list-inside text-red-600 ml-4">
                          {ref.errors.map((error, i) => (
                            <li key={i}>{error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            );
          }

          if (data.structure_validation) {
            return (
              <div>
                <div className="mb-4">
                  <h4 className="font-medium mb-2">Matching Sections:</h4>
                  <ul className="list-disc list-inside">
                    {data.structure_validation.matching_sections.map(
                      (section, index) => (
                        <li key={index} className="text-green-600">
                          {section}
                        </li>
                      )
                    )}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Missing Sections:</h4>
                  <ul className="list-disc list-inside">
                    {data.structure_validation.missing_sections.map(
                      (section, index) => (
                        <li key={index} className="text-red-600">
                          {section}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            );
          }

          return <p className="text-gray-500">No list data available</p>;

        case "matrix":
          if (!data.similarity_matrix || !data.scope_sources) {
            return <p className="text-gray-500">No matrix data available</p>;
          }
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-200">
                <thead>
                  <tr>
                    <th className="border border-gray-200 p-2 bg-gray-50">
                      Section
                    </th>
                    {data.scope_sources.map((source, i) => (
                      <th
                        key={i}
                        className="border border-gray-200 p-2 bg-gray-50"
                      >
                        {source}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.similarity_matrix.map((row, i) => (
                    <tr key={i}>
                      <td className="border border-gray-200 p-2 font-medium bg-gray-50">
                        {data.scope_sources[i]}
                      </td>
                      {row.map((value, j) => (
                        <td
                          key={j}
                          className="border border-gray-200 p-2 text-center"
                        >
                          {Math.round(value * 100)}%
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        case "text":
          if (data["Business Value Evaluation"]) {
            return (
              <div className="space-y-6">
                <div className="text-gray-700 space-y-4">
                  {data["Business Value Evaluation"]
                    .split("\n")
                    .filter((line) => line.trim())
                    .map((paragraph, index) => {
                      // Remove all asterisks and clean up the text
                      const cleanText = paragraph
                        .replace(/\* \*/g, "")
                        .replace(/\*/g, "")
                        .trim();

                      // Check if this is a heading/category line
                      if (cleanText.includes("Overall Business Value Rating")) {
                        return (
                          <div
                            key={index}
                            className="mt-6 font-semibold italic"
                          >
                            {cleanText}
                          </div>
                        );
                      }

                      if (cleanText.startsWith("Category")) {
                        return (
                          <div
                            key={index}
                            className="mt-2 font-semibold italic"
                          >
                            {cleanText}
                          </div>
                        );
                      }

                      // Handle main categories (Uniqueness, Market Usefulness, etc.)
                      const match = cleanText.match(
                        /^(Uniqueness|Market Usefulness|Feasibility|Profitability):(.*)/
                      );

                      if (match) {
                        return (
                          <div
                            key={index}
                            className="flex items-start gap-2 mt-4"
                          >
                            <span className="text-[#ff6464] mt-1.5">•</span>
                            <div>
                              <span className="font-semibold">
                                {match[1]}:{" "}
                              </span>
                              <span>{match[2].trim()}</span>
                            </div>
                          </div>
                        );
                      }

                      // Return regular paragraphs
                      return (
                        <p
                          key={index}
                          className="text-gray-600 leading-relaxed"
                        >
                          {cleanText}
                        </p>
                      );
                    })}
                </div>
              </div>
            );
          }
          return (
            <div className="overflow-x-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          );

        default:
          return (
            <div className="overflow-x-auto">
              <pre className="whitespace-pre-wrap text-sm">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          );
      }
    };

    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        {/* Only show title if it's not a Business Value Analysis text type */}
        {!(type === "text" && data["Business Value Evaluation"]) && (
          <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
            {title}
            {data?.status && (
              <span
                className={`ml-2 px-2 py-1 text-xs rounded ${
                  data.status === "success" || data.status === "pass"
                    ? "bg-green-100 text-green-800"
                    : data.status === "fail" || data.status === "error"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {data.status}
              </span>
            )}
          </h3>
        )}
        <div className="text-gray-600">{renderContent()}</div>
      </div>
    );
  };

  // Generate recommendations using Gemini
  const generateRecommendations = async (parsingResult) => {
    try {
      const response = await fetch(
        "http://localhost:5000/generate_recommendations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ parsingResult }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate recommendations");
      }

      const data = await response.json();
      return {
        status: "success",
        recommendations: data.recommendations,
      };
    } catch (error) {
      console.error("Error generating recommendations:", error);
      return {
        status: "error",
        message: "Failed to generate recommendations",
      };
    }
  };

  // Effects
  useEffect(() => {
    if (parsingResult) {
      generateRecommendations(parsingResult)
        .then((result) => setRecommendations(result))
        .catch((error) =>
          console.error("Error setting recommendations:", error)
        );
    }
  }, [parsingResult]);

  useEffect(() => {
    console.log("Location State:", location.state);
    console.log("Document Info:", documentInfo);
    console.log("Parsing Result:", parsingResult);
  }, [location.state, documentInfo, parsingResult]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Document Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Analysis Report
              </h1>
              <p className="text-gray-600 mt-2">
                Generated on {formatGeneratedTime(new Date())}
              </p>
            </div>
            <button className="px-4 py-2 bg-[#ff6464] text-white rounded-lg hover:bg-[#ff4444] transition-colors duration-300 ease-in-out">
              Download Report
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Document Name
              </h3>
              <p className="mt-1 text-gray-900">{documentDetails.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">File Size</h3>
              <p className="mt-1 text-gray-900">{documentDetails.size}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Upload Date</h3>
              <p className="mt-1 text-gray-900">{documentDetails.date}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Analysis Duration
              </h3>
              <p className="mt-1 text-gray-900">
                {formatDuration(parseFloat(documentDetails.duration))}
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        {/* <div className="bg-white rounded-lg shadow-md p-6 mb-8"> */}
        {/* <h2 className="text-2xl font-semibold mb-4">Executive Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600 font-medium">
                Passed Checks
              </p>
              <p className="text-2xl font-bold text-green-800">
                {passedChecks}
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600 font-medium">Failed Checks</p>
              <p className="text-2xl font-bold text-red-800">{failedChecks}</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-600 font-medium">Warnings</p>
              <p className="text-2xl font-bold text-yellow-800">{warnings}</p>
            </div>
          </div> */}

        {/* Analysis Summary */}
        {/* <div className="space-y-6"> */}
        {/* Business Value Analysis */}
        {/* {parsingResult?.business_value_analysis && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">
                  Business Value Analysis
                </h3>
                <div className="space-y-2 text-gray-700">
                  {parsingResult.business_value_analysis[
                    "Business Value Evaluation"
                  ]
                    ?.split("*")
                    .map((point, index) => {
                      if (point.trim()) {
                        return (
                          <div key={index} className="flex items-start">
                            <span className="text-[#ff6464] mr-2">•</span>
                            <p>{point.trim()}</p>
                          </div>
                        );
                      }
                      return null;
                    })}
                </div>
              </div>
            )} */}

        {/* SRS Structure */}
        {/* {parsingResult?.srs_validation?.structure_validation && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">
                  SRS Structure
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Present Sections:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsingResult.srs_validation.structure_validation.matching_sections.map(
                        (section, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm"
                          >
                            {section}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Missing Sections:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {parsingResult.srs_validation.structure_validation.missing_sections.map(
                        (section, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-sm"
                          >
                            {section}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )} */}

        {/* References Analysis */}
        {/* {parsingResult?.references_validation && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">
                  References Analysis
                </h3>
                <p className="text-gray-700">
                  Found{" "}
                  {parsingResult.references_validation.reformatted_references
                    ?.length || 0}{" "}
                  references, with{" "}
                  {parsingResult.references_validation.reformatted_references?.filter(
                    (ref) => ref.errors?.length > 0
                  ).length || 0}{" "}
                  formatting issues.
                </p>
              </div>
            )} */}

        {/* Content Analysis */}
        {/* {parsingResult?.content_analysis?.similarity_matrix && (
              <div className="border-b pb-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-800">
                  Content Analysis
                </h3>
                <p className="text-gray-700">
                  Content similarity analysis completed successfully.
                </p>
              </div>
            )} */}

        {/* Image Analysis */}
        {/* {parsingResult?.image_analysis?.processed_images && (
              <div>
                <h3 className="text-lg font-semibold mb-3 text-gray-800">
                  Image Analysis
                </h3>
                <p className="text-gray-700">
                  Analyzed{" "}
                  {parsingResult.image_analysis.processed_images.length} images
                  successfully.
                </p>
              </div>
            )}
          </div> */}

        {/* Key Findings */}
        {/* <div className="mt-6">
            <h3 className="text-lg font-semibold mb-3">Key Findings</h3>
            <ul className="list-disc pl-5 space-y-2">
              {passedChecks > 0 && (
                <li className="text-green-600">
                  {passedChecks}{" "}
                  {passedChecks === 1 ? "section meets" : "sections meet"}{" "}
                  requirements
                </li>
              )}
              {failedChecks > 0 && (
                <li className="text-red-600">
                  {failedChecks} critical{" "}
                  {failedChecks === 1 ? "issue" : "issues"} found in document
                  structure
                </li>
              )}
              {warnings > 0 && (
                <li className="text-yellow-600">
                  {warnings}{" "}
                  {warnings === 1 ? "warning requires" : "warnings require"}{" "}
                  attention
                </li>
              )}
              {passedChecks === 0 && failedChecks === 0 && warnings === 0 && (
                <li className="text-gray-600">No analysis results available</li>
              )}
            </ul>
          </div> */}
        {/* </div> */}

        {/* Detailed Analysis Sections */}
        <div className="space-y-4">
          {parsingResult?.srs_validation && (
            <CollapsibleSection
              id="srs"
              title="SRS Structure Analysis"
              status="success"
            >
              <AnalysisCard
                title="SRS Validation"
                data={{ ...parsingResult.srs_validation, status: "success" }}
                type="list"
              />
            </CollapsibleSection>
          )}

          {parsingResult?.references_validation && (
            <CollapsibleSection
              id="references"
              title="References Analysis"
              status={parsingResult.references_validation.status}
            >
              <AnalysisCard
                title="References Validation"
                data={parsingResult.references_validation}
                type="list"
              />
            </CollapsibleSection>
          )}

          {parsingResult?.content_analysis && (
            <CollapsibleSection
              id="content"
              title="Content Analysis"
              status="success"
            >
              <AnalysisCard
                title="Content Analysis"
                data={{ ...parsingResult.content_analysis, status: "success" }}
                type="matrix"
              />
            </CollapsibleSection>
          )}

          {parsingResult?.image_analysis && (
            <CollapsibleSection
              id="image"
              title="Image Analysis"
              status={parsingResult.image_analysis.status}
            >
              <AnalysisCard
                title="Image Analysis"
                data={parsingResult.image_analysis}
                type="list"
              />
            </CollapsibleSection>
          )}

          {parsingResult?.business_value_analysis && (
            <CollapsibleSection
              id="business"
              title="Business Value Analysis"
              status={parsingResult.business_value_analysis.status}
            >
              <AnalysisCard
                title="Business Value Analysis"
                data={parsingResult.business_value_analysis}
                type="text"
              />
            </CollapsibleSection>
          )}

          {parsingResult?.image_validation && (
            <CollapsibleSection
              id="diagram"
              title="Diagram Convention"
              status={parsingResult.image_validation.status}
            >
              <AnalysisCard
                title="Diagram Convention"
                data={parsingResult.image_validation}
                type="list"
              />
            </CollapsibleSection>
          )}
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-2xl font-semibold mb-4">Recommendations</h2>
          <div className="prose max-w-none">
            {recommendations?.status === "success" ? (
              <ReactMarkdown className="text-gray-700">
                {recommendations.recommendations}
              </ReactMarkdown>
            ) : (
              <ul className="space-y-2">
                {failedChecks > 0 && (
                  <li className="text-red-600">
                    Review and address {failedChecks} critical{" "}
                    {failedChecks === 1 ? "issue" : "issues"}
                  </li>
                )}
                {warnings > 0 && (
                  <li className="text-amber-700">
                    Consider implementing improvements for {warnings} warning{" "}
                    {warnings === 1 ? "item" : "items"}
                  </li>
                )}
                {passedChecks > 0 && (
                  <li className="text-green-600">
                    Maintain the quality of {passedChecks} validated{" "}
                    {passedChecks === 1 ? "section" : "sections"}
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>

        {/* Analysis Metadata */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-8">
          <h2 className="text-2xl font-semibold mb-4">Analysis Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Analysis Types Performed
              </h3>
              <ul className="mt-1 list-disc list-inside">
                {Object.keys(parsingResult || {}).map((type) => (
                  <li key={type} className="text-gray-900">
                    {type
                      .replace(/_/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
