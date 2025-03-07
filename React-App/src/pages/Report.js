import React from "react";
import { useLocation } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";

function Report() {
  const location = useLocation();
  console.log("Report received data:", location.state);
  const { parsingResult } = location.state || {};

  // Add this to see the actual counts
  const passedChecks = Object.values(parsingResult || {}).filter(
    (r) => r?.status === "pass"
  ).length;
  const failedChecks = Object.values(parsingResult || {}).filter(
    (r) => r?.status === "fail"
  ).length;
  const warnings = Object.values(parsingResult || {}).filter(
    (r) => r?.status === "warning"
  ).length;

  console.log("Counts:", { passedChecks, failedChecks, warnings });

  // Helper function to render analysis card
  const AnalysisCard = ({ title, data, type }) => {
    const renderContent = () => {
      switch (type) {
        case "list":
          if (!Array.isArray(data)) {
            return <p>No list data available</p>;
          }
          return (
            <ul className="list-disc list-inside">
              {data.map((item, index) => (
                <li key={index} className="mb-2">
                  {String(item)}
                </li>
              ))}
            </ul>
          );

        case "matrix":
          if (!data.similarity_matrix || !data.scope_sources) {
            return <p>No matrix data available</p>;
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

        case "table":
          if (!data || typeof data !== "object" || Array.isArray(data)) {
            return <p>No table data available</p>;
          }
          return (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <tbody>
                  {Object.entries(data).map(([key, value]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 px-4 font-medium">{key}</td>
                      <td className="py-2 px-4">
                        {typeof value === "object"
                          ? JSON.stringify(value)
                          : String(value)}
                      </td>
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
          <span
            className={`ml-2 px-2 py-1 text-xs rounded ${
              data?.status === "pass"
                ? "bg-green-100 text-green-800"
                : data?.status === "fail"
                ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {data?.status || "Info"}
          </span>
        </h3>
        <div className="text-gray-600">{renderContent()}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analysis Report</h1>
          <p className="text-gray-600 mt-2">
            Comprehensive analysis results for your document
          </p>
        </div>

        {/* Summary Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold mb-4">Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </div>

        {/* Analysis Results */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {parsingResult?.srs_validation && (
            <AnalysisCard
              title="SRS Validation"
              data={parsingResult.srs_validation}
              type="list"
            />
          )}

          {parsingResult?.references_validation && (
            <AnalysisCard
              title="References Validation"
              data={parsingResult.references_validation}
              type="list"
            />
          )}

          {parsingResult?.content_analysis && (
            <AnalysisCard
              title="Content Analysis"
              data={parsingResult.content_analysis}
              type="table"
            />
          )}

          {parsingResult?.image_analysis && (
            <AnalysisCard
              title="Image Analysis"
              data={parsingResult.image_analysis}
              type="list"
            />
          )}

          {parsingResult?.business_value_analysis && (
            <AnalysisCard
              title="Business Value Analysis"
              data={parsingResult.business_value_analysis}
              type="text"
            />
          )}

          {parsingResult?.image_validation && (
            <AnalysisCard
              title="Diagram Convention"
              data={parsingResult.image_validation}
              type="list"
            />
          )}
        </div>

        {/* Show when no results available */}
        {!parsingResult && (
          <div className="text-center py-12">
            <p className="text-gray-500">No analysis results available</p>
          </div>
        )}

        {/* Debug section - remove in production */}
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Debug Information</h3>
          <pre className="whitespace-pre-wrap text-sm">
            {JSON.stringify(parsingResult, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default Report;
