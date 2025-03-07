import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";

function Report() {
  const location = useLocation();
  const { parsingResult, documentInfo } = location.state || {};
  const documentDetails = {
    name: documentInfo?.name || "N/A",
    size: documentInfo?.size || "N/A",
    date: documentInfo?.date || "N/A",
    timestamp: new Date().toLocaleString(),
  };
  const [expandedSections, setExpandedSections] = useState({});

  // Counts for summary
  const passedChecks = Object.values(parsingResult || {}).filter(
    (r) => r?.status === "pass"
  ).length;
  const failedChecks = Object.values(parsingResult || {}).filter(
    (r) => r?.status === "fail"
  ).length;
  const warnings = Object.values(parsingResult || {}).filter(
    (r) => r?.status === "warning"
  ).length;

  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // Helper Components
  const CollapsibleSection = ({ id, title, children, status }) => {
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
                className={`ml-3 px-2 py-1 text-xs rounded ${
                  status === "success"
                    ? "bg-green-100 text-green-800"
                    : status === "fail"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
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
      // Handle null or undefined data
      if (!data) {
        return <p className="text-gray-500">No data available</p>;
      }

      switch (type) {
        case "list":
          // Handle reformatted_references specifically for References Validation
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

          // Handle structure_validation for SRS Validation
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
        <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
          {title}
          {data?.status && (
            <span
              className={`ml-2 px-2 py-1 text-xs rounded ${
                data.status === "success"
                  ? "bg-green-100 text-green-800"
                  : data.status === "fail"
                  ? "bg-red-100 text-red-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {data.status}
            </span>
          )}
        </h3>
        <div className="text-gray-600">{renderContent()}</div>
      </div>
    );
  };

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
                Generated on {new Date().toLocaleString()}
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
              <p className="mt-1 text-gray-900">
                {documentInfo?.name || "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">File Size</h3>
              <p className="mt-1 text-gray-900">
                {documentInfo?.size || "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Upload Date</h3>
              <p className="mt-1 text-gray-900">
                {documentInfo?.date || "N/A"}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Analysis Duration
              </h3>
              <p className="mt-1 text-gray-900">
                {documentInfo?.duration || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Executive Summary</h2>
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
          </div>

          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold mb-2">Key Findings</h3>
            <ul className="list-disc pl-5">
              {failedChecks > 0 && (
                <li className="text-red-600">
                  Critical issues found in document structure
                </li>
              )}
              {warnings > 0 && (
                <li className="text-yellow-600">
                  Minor issues require attention
                </li>
              )}
              {passedChecks > 0 && (
                <li className="text-green-600">
                  Several sections meet requirements
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Detailed Analysis Sections */}
        <div className="space-y-4">
          {parsingResult?.srs_validation && (
            <CollapsibleSection
              id="srs"
              title="SRS Structure Analysis"
              status={parsingResult.srs_validation.status}
            >
              <AnalysisCard
                title="SRS Validation"
                data={parsingResult.srs_validation}
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
              status={parsingResult.content_analysis.status}
            >
              <AnalysisCard
                title="Content Analysis"
                data={parsingResult.content_analysis}
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
            <AnalysisCard
              title="Business Value Analysis"
              data={parsingResult.business_value_analysis}
              type="text"
            />
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
            <ul className="space-y-2">
              {/* Add dynamic recommendations based on analysis results */}
              <li>Review and address all critical issues highlighted in red</li>
              <li>
                Consider implementing suggested improvements for warning items
              </li>
              <li>Maintain the quality of sections that passed validation</li>
            </ul>
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
            {/* Add more metadata as needed */}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
