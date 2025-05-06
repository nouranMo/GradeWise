import React, { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { useLocation, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

function PdfDownloadButton() {
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePdf = async () => {
    setIsGenerating(true);
    try {
      // Target the entire document content
      const element = document.querySelector(".max-w-6xl");
      if (!element) {
        alert("Could not find content to download");
        return;
      }

      // Create PDF with A4 size
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10; // margin in mm

      // Get the total height of the element
      const totalHeight = element.scrollHeight;
      const totalWidth = element.scrollWidth;

      // Calculate how many canvas captures we need
      const pageHeightInPx = (pageHeight - 2 * margin) * 3.779; // Convert mm to px (approximate)
      const numPages = Math.ceil(totalHeight / pageHeightInPx);

      // Function to capture and add a section of the page
      const captureAndAddPage = async (pageNum) => {
        const yPosition = pageNum * pageHeightInPx;

        // Create canvas for this section
        const canvas = await html2canvas(element, {
          scale: 2, // Higher scale for better quality
          useCORS: true,
          logging: false,
          windowHeight: totalHeight,
          y: yPosition,
          height: Math.min(pageHeightInPx, totalHeight - yPosition),
        });

        // Convert to image
        const imgData = canvas.toDataURL("image/jpeg", 0.95);

        // Add new page if not the first page
        if (pageNum > 0) {
          pdf.addPage();
        }

        // Calculate image dimensions to fit the page
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add image to PDF
        pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);

        return true;
      };

      // Process each page sequentially
      for (let i = 0; i < numPages; i++) {
        await captureAndAddPage(i);
        // Update progress if needed for larger documents
        if (numPages > 3 && i % 2 === 0) {
          console.log(
            `PDF Generation: ${Math.round((i / numPages) * 100)}% complete`
          );
        }
      }

      // Save the PDF
      pdf.save("document_analysis_report.pdf");
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      onClick={generatePdf}
      disabled={isGenerating}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 ease-in-out ml-4"
    >
      {isGenerating ? "Generating PDF..." : "Download PDF"}
    </button>
  );
}

// Helper function to determine if a section is a figure
function isFigureSection(sectionName) {
  if (!sectionName) return false;

  const lowerName = sectionName.toLowerCase();
  return (
    lowerName.includes("diagram") ||
    lowerName.includes("figure") ||
    lowerName.includes("chart") ||
    lowerName.includes("graph") ||
    lowerName.includes("eerd") ||
    lowerName.includes("uml") ||
    lowerName.includes("class diagram") ||
    lowerName.includes("sequence diagram") ||
    lowerName.includes("use case") ||
    lowerName.includes("entity relationship")
  );
}

// Helper function to clean up section names
function getCleanSectionName(sectionName) {
  if (!sectionName) return "";
  let cleanName = sectionName.replace(/^Figure:\s*/, "");
  cleanName = cleanName.replace(/^\d+(\.\d+)*\s+/, "");
  return cleanName;
}

function RelationshipGraph({
  matrix,
  scopeSources,
  relationshipAnalyses = {},
}) {
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  const [showDiagrams, setShowDiagrams] = useState(true);

  // Skip rendering if no data
  if (
    !matrix ||
    !scopeSources ||
    matrix.length === 0 ||
    scopeSources.length === 0
  ) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h3 className="text-xl font-semibold mb-4">Section Relationships</h3>
        <p className="text-gray-500">No relationship data available.</p>
      </div>
    );
  }

  // Check if we have relationship analyses
  const hasRelationshipAnalyses =
    relationshipAnalyses && Object.keys(relationshipAnalyses).length > 0;

  // If we have relationship analyses, use them directly
  let relationships = [];

  let diagramRels = []; // New array for diagram relationships

  if (hasRelationshipAnalyses) {
    // Create relationships from the relationship analyses
    relationships = Object.keys(relationshipAnalyses).map((key) => {
      const [source, target] = key.split("|");
      const analysis = relationshipAnalyses[key];

      return {
        source,
        target,
        key,
        strength: analysis.similarity_score,
        hasAnalysis: true,
        isDiagram: isFigureSection(source) || isFigureSection(target), // Check if either section is a diagram
      };
    });
  } else {
    // If no relationship analyses, create them from the similarity matrix
    for (let i = 0; i < matrix.length; i++) {
      for (let j = i + 1; j < matrix[i].length; j++) {
        if (matrix[i][j] > 0.3) {
          // Only show relationships above threshold
          const isDiagram =
            isFigureSection(scopeSources[i]) ||
            isFigureSection(scopeSources[j]);

          relationships.push({
            source: scopeSources[i],
            target: scopeSources[j],
            strength: matrix[i][j],
            key: `${scopeSources[i]}|${scopeSources[j]}`,
            hasAnalysis: false,
            isDiagram,
          });
        }
      }
    }
  }

  // Extract diagram relationships
  diagramRels = relationships.filter((rel) => rel.isDiagram);

  // Filter out diagram relationships from main relationships if not showing diagrams
  const textRelationships = relationships.filter((rel) => !rel.isDiagram);

  // Combine relationships based on toggle
  const displayRelationships = showDiagrams ? relationships : textRelationships;

  // Sort relationships by strength
  displayRelationships.sort((a, b) => b.strength - a.strength);

  // Get the top relationships (limit to 10 for clarity)
  const topRelationships = displayRelationships.slice(0, 10);

  // Get the selected relationship analysis
  const selectedAnalysis = selectedRelationship
    ? relationshipAnalyses[selectedRelationship]
    : null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold">Key Section Relationships</h3>

        {/* Toggle for diagram relationships */}
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2">Include Diagrams</span>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showDiagrams}
              onChange={() => setShowDiagrams(!showDiagrams)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {diagramRels.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-800">
            <span className="font-medium">📊 Note:</span> {diagramRels.length}{" "}
            diagram-to-section relationships found.
            {showDiagrams
              ? " These are included in the list below."
              : " Toggle the switch above to include them."}
          </p>
        </div>
      )}

      {topRelationships.length === 0 ? (
        <p className="text-gray-500">
          No significant relationships found between sections.
        </p>
      ) : (
        <div>
          <div className="grid grid-cols-1 gap-4">
            {topRelationships.map((rel) => {
              const analysis = relationshipAnalyses[rel.key];
              const strengthColor =
                rel.strength > 0.7
                  ? "bg-green-100 border-green-300"
                  : rel.strength > 0.5
                  ? "bg-blue-100 border-blue-300"
                  : "bg-yellow-100 border-yellow-300";

              // Add special styling for diagram relationships
              const isDiagramClass = rel.isDiagram
                ? "border-l-4 border-l-blue-500"
                : "";

              return (
                <div
                  key={rel.key}
                  className={`p-4 rounded-lg border ${strengthColor} ${isDiagramClass} cursor-pointer hover:shadow-md transition-shadow`}
                  onClick={() => setSelectedRelationship(rel.key)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-800">
                      {rel.isDiagram && <span className="mr-1">📊</span>}
                      {getCleanSectionName(rel.source)} ↔{" "}
                      {getCleanSectionName(rel.target)}
                    </h4>
                    <span className="text-sm font-medium px-2 py-1 rounded-full bg-gray-200">
                      {Math.round(rel.strength * 100)}%
                    </span>
                  </div>

                  {analysis ? (
                    <>
                      <div className="mb-2">
                        <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-800 mr-2">
                          {analysis.relationship_strength}
                        </span>
                        {analysis.section1_type && analysis.section2_type && (
                          <span className="text-xs text-gray-500">
                            {analysis.section1_type} ↔ {analysis.section2_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {analysis.description}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">
                      {rel.isDiagram
                        ? "Diagram relationship - click to analyze"
                        : "No detailed analysis available"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Selected relationship details */}
          {selectedRelationship &&
            relationshipAnalyses[selectedRelationship] && (
              <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium text-gray-800">
                    Detailed Relationship Analysis
                  </h4>
                  <button
                    onClick={() => setSelectedRelationship(null)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="flex flex-col md:flex-row md:justify-between md:space-x-4">
                    <div>
                      <h5 className="font-medium text-gray-700">
                        Relationship Strength
                      </h5>
                      <p className="text-sm mt-1">
                        <span
                          className={`font-semibold ${
                            relationshipAnalyses[selectedRelationship]
                              .relationship_strength === "Strong"
                              ? "text-green-600"
                              : relationshipAnalyses[selectedRelationship]
                                  .relationship_strength === "Moderate"
                              ? "text-blue-600"
                              : "text-yellow-600"
                          }`}
                        >
                          {
                            relationshipAnalyses[selectedRelationship]
                              .relationship_strength
                          }
                        </span>
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700">
                        Similarity Score
                      </h5>
                      <p className="text-sm mt-1">
                        <span className="font-semibold">
                          {Math.round(
                            relationshipAnalyses[selectedRelationship]
                              .similarity_score * 100
                          )}
                          %
                        </span>
                      </p>
                    </div>
                    <div>
                      <h5 className="font-medium text-gray-700">
                        Section Types
                      </h5>
                      <p className="text-sm mt-1">
                        {
                          relationshipAnalyses[selectedRelationship]
                            .section1_type
                        }{" "}
                        ↔{" "}
                        {
                          relationshipAnalyses[selectedRelationship]
                            .section2_type
                        }
                      </p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">
                      Description
                    </h5>
                    <p className="text-sm bg-white p-3 rounded border border-gray-200">
                      {relationshipAnalyses[selectedRelationship].description}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">
                        <span className="text-green-600 mr-1">✓</span>{" "}
                        Consistent Elements
                      </h5>
                      <ul className="list-disc list-inside text-sm bg-green-50 p-3 rounded border border-green-100">
                        {relationshipAnalyses[
                          selectedRelationship
                        ].consistent_elements.map((item, i) => (
                          <li key={i} className="mb-1 last:mb-0">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="font-medium text-gray-700 mb-2">
                        <span className="text-red-600 mr-1">⚠</span>{" "}
                        Inconsistencies
                      </h5>
                      <ul className="list-disc list-inside text-sm bg-red-50 p-3 rounded border border-red-100">
                        {relationshipAnalyses[selectedRelationship]
                          .inconsistencies.length > 0 ? (
                          relationshipAnalyses[
                            selectedRelationship
                          ].inconsistencies.map((item, i) => (
                            <li key={i} className="mb-1 last:mb-0">
                              {item}
                            </li>
                          ))
                        ) : (
                          <li>No inconsistencies found</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">
                      <span className="text-blue-600 mr-1">💡</span>{" "}
                      Recommendation
                    </h5>
                    <p className="text-sm bg-blue-50 p-3 rounded border border-blue-100">
                      {
                        relationshipAnalyses[selectedRelationship]
                          .recommendation
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
        </div>
      )}

      {/* Add diagram relationships display */}
      {diagramRels.length > 0 && showDiagrams && (
        <div className="mt-6">
          <h4 className="text-lg font-semibold mb-3">Diagram Relationships</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {diagramRels.map((rel, idx) => (
              <div
                key={idx}
                className="p-4 bg-blue-50 rounded-lg border border-blue-100"
              >
                <h5 className="font-medium text-blue-800 mb-2">{rel.source}</h5>
                <p className="text-sm text-gray-600 mb-2">Related to:</p>
                <ul className="list-disc list-inside text-sm">
                  <li className="mb-1">
                    <span className="font-medium">{rel.target}</span>
                    <span className="text-gray-500 ml-1">
                      ({Math.round(rel.strength * 100)}% similarity)
                    </span>
                  </li>
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ParsingResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const { parsingResult } = location.state || {};

  // Debug logs for component mount and initial data
  React.useEffect(() => {
    console.log("=== ParsingResult Component Mounted ===");
    console.log("Location Object:", location);
    console.log("Location State:", location.state);
    console.log("Parsing Result:", parsingResult);
    if (parsingResult) {
      console.log("Keys in Parsing Result:", Object.keys(parsingResult));
    } else {
      console.log("Reason: parsingResult is undefined or null");
    }
  }, [location, location.state, parsingResult]);

  // Debug log for references validation
  React.useEffect(() => {
    if (parsingResult?.references_validation) {
      console.log(
        "References Validation Data:",
        parsingResult.references_validation
      );
    } else {
      console.log("No references_validation data found in parsingResult");
    }
  }, [parsingResult]);

  // Debug log for diagram convention
  React.useEffect(() => {
    if (parsingResult?.diagram_convention) {
      console.log(
        "Diagram Convention Data in ParsingResultPage:",
        parsingResult.diagram_convention
      );
    } else {
      console.log("No diagram_convention data found in parsingResult");
    }
  }, [parsingResult]);

  // Determine which dashboard to go back to
  const handleBackClick = () => {
    const documentType = parsingResult?.document_type || "";
    if (
      documentType.toLowerCase().includes("professor") ||
      documentType.toLowerCase() === "professor_document"
    ) {
      console.log("Navigating back to professor dashboard");
      navigate("/professor");
    } else {
      console.log("Navigating back to student dashboard");
      navigate("/dashboard");
    }
  };

  // Add this near the top of your ParsingResult component
  useEffect(() => {
    if (parsingResult?.content_analysis?.relationship_analyses) {
      console.log(
        "Relationship analyses available:",
        Object.keys(parsingResult.content_analysis.relationship_analyses).length
      );
      console.log(
        "Sample analysis:",
        Object.values(parsingResult.content_analysis.relationship_analyses)[0]
      );
    } else {
      console.log("No relationship analyses available in the parsing result");
    }
  }, [parsingResult]);

  // Add this to your useEffect
  useEffect(() => {
    console.log("Full parsing result:", parsingResult);

    if (parsingResult?.content_analysis) {
      console.log(
        "Content analysis keys:",
        Object.keys(parsingResult.content_analysis)
      );

      // Check if relationship_analyses exists directly in content_analysis
      if (parsingResult.content_analysis.relationship_analyses) {
        console.log("Relationship analyses found at expected location");
      }
      // Check if it might be nested deeper
      else if (
        parsingResult.content_analysis.similarity_analysis
          ?.relationship_analyses
      ) {
        console.log("Relationship analyses found in similarity_analysis");
      }
      // Check if it might be at the root level
      else if (parsingResult.relationship_analyses) {
        console.log("Relationship analyses found at root level");
      } else {
        console.log("Relationship analyses not found in any expected location");
      }
    }
  }, [parsingResult]);

  // Add this useEffect to debug the data
  useEffect(() => {
    if (parsingResult?.content_analysis) {
      console.log("Content analysis:", parsingResult.content_analysis);
      console.log(
        "Relationship analyses:",
        parsingResult.content_analysis.relationship_analyses
      );

      if (parsingResult.content_analysis.relationship_analyses) {
        console.log(
          "Number of relationship analyses:",
          Object.keys(parsingResult.content_analysis.relationship_analyses)
            .length
        );
        console.log(
          "First relationship analysis:",
          Object.entries(
            parsingResult.content_analysis.relationship_analyses
          )[0]
        );
      }
    }
  }, [parsingResult]);

  if (!parsingResult || parsingResult.status === "error") {
    console.log(
      "Rendering error state due to missing or invalid parsingResult"
    );
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <h2 className="text-2xl font-bold text-red-600 mb-4">
          {parsingResult?.message || "No Parsing Result Found"}
        </h2>
        <button
          onClick={handleBackClick}
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
          <div className="flex">
            <PdfDownloadButton />
            <button
              onClick={handleBackClick}
              className="px-4 py-2 bg-[#ff6464] text-white rounded-lg hover:bg-[#ff4444] transition-colors duration-300 ease-in-out"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Document Summary */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
          {" "}
          {/* Reduced padding and margin */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">
                Document Details
              </h2>{" "}
              {/* Changed from text-2xl */}
              <p className="text-sm text-gray-600">
                {" "}
                {/* Changed to text-sm */}
                Document Type:{" "}
                {parsingResult.srs_validation
                  ? "SRS"
                  : parsingResult.sdd_validation
                  ? "SDD"
                  : "Not specified"}
              </p>
              <p className="text-sm text-gray-600">
                {" "}
                {/* Changed to text-sm */}
                Document Name: {parsingResult.document_name || "Untitled"}
              </p>
            </div>
            <div className="bg-blue-50 px-3 py-1 rounded-lg">
              {" "}
              {/* Reduced padding */}
              <p className="text-sm text-blue-800">
                Analysis Date: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* SRS Structure Validation */}
        {console.log(
          "Checking SRS Validation Section - Present:",
          !!parsingResult?.srs_validation
        )}
        {parsingResult.srs_validation && (
          <>
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                SRS Structure Validation
              </h2>
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
                <StatCard
                  title="Order Issues"
                  value={
                    parsingResult.srs_validation.structure_validation
                      .misplaced_sections.length
                  }
                  color="red"
                />
              </div>
              {(parsingResult.srs_validation.structure_validation
                .missing_sections.length > 0 ||
                parsingResult.srs_validation.structure_validation
                  .missing_subsections?.length > 0) && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-600">
                    Missing Sections:
                  </h3>
                  <ul className="list-disc list-inside">
                    {parsingResult.srs_validation.structure_validation.missing_sections.map(
                      (section, index) => (
                        <li key={`section-${index}`} className="text-gray-700">
                          Section: {section}
                        </li>
                      )
                    )}
                    {parsingResult.srs_validation.structure_validation.missing_subsections?.map(
                      (subsection, index) => (
                        <li
                          key={`subsection-${index}`}
                          className="text-gray-700"
                        >
                          Subsection: {subsection}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {(parsingResult.srs_validation.structure_validation
                .misplaced_sections.length > 0 ||
                parsingResult.srs_validation.structure_validation
                  .misplaced_subsections?.length > 0) && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-600">Order Issues:</h3>
                  <ul className="list-disc list-inside">
                    {parsingResult.srs_validation.structure_validation.misplaced_sections.map(
                      (issue, index) => (
                        <li
                          key={`misplaced-section-${index}`}
                          className="text-gray-700"
                        >
                          Section: {issue}
                        </li>
                      )
                    )}
                    {parsingResult.srs_validation.structure_validation.misplaced_subsections?.map(
                      (issue, index) => (
                        <li
                          key={`misplaced-subsection-${index}`}
                          className="text-gray-700"
                        >
                          Subsection: {issue}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* SDD Structure Validation */}
        {console.log(
          "Checking SDD Validation Section - Present:",
          !!parsingResult?.sdd_validation
        )}
        {parsingResult.sdd_validation && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              SDD Structure Validation
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <StatCard
                  title="Matching Sections"
                  value={
                    parsingResult.sdd_validation.structure_validation
                      .matching_sections.length
                  }
                  color="green"
                />
                <StatCard
                  title="Missing Sections"
                  value={
                    parsingResult.sdd_validation.structure_validation
                      .missing_sections.length
                  }
                  color="red"
                />
                <StatCard
                  title="Order Issues"
                  value={
                    parsingResult.sdd_validation.structure_validation
                      .misplaced_sections.length
                  }
                  color="red"
                />
              </div>

              {(parsingResult.sdd_validation.structure_validation
                .missing_sections.length > 0 ||
                parsingResult.sdd_validation.structure_validation
                  .missing_subsections?.length > 0) && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-600">
                    Missing Sections:
                  </h3>
                  <ul className="list-disc list-inside">
                    {parsingResult.sdd_validation.structure_validation.missing_sections.map(
                      (section, index) => (
                        <li key={`section-${index}`} className="text-gray-700">
                          Section: {section}
                        </li>
                      )
                    )}
                    {parsingResult.sdd_validation.structure_validation.missing_subsections?.map(
                      (subsection, index) => (
                        <li
                          key={`subsection-${index}`}
                          className="text-gray-700"
                        >
                          Subsection: {subsection}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
              {(parsingResult.sdd_validation.structure_validation
                .misplaced_sections.length > 0 ||
                parsingResult.sdd_validation.structure_validation
                  .misplaced_subsections?.length > 0) && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-600">Order Issues:</h3>
                  <ul className="list-disc list-inside">
                    {parsingResult.sdd_validation.structure_validation.misplaced_sections.map(
                      (issue, index) => (
                        <li
                          key={`misplaced-section-${index}`}
                          className="text-gray-700"
                        >
                          Section: {issue}
                        </li>
                      )
                    )}
                    {parsingResult.sdd_validation.structure_validation.misplaced_subsections?.map(
                      (issue, index) => (
                        <li
                          key={`misplaced-subsection-${index}`}
                          className="text-gray-700"
                        >
                          Subsection: {issue}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* References Analysis */}
        {console.log(
          "Checking References Validation Section - Present:",
          !!parsingResult?.references_validation
        )}
        {parsingResult.references_validation && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              References Validation
            </h2>
            {process.env.NODE_ENV !== "production" && (
              <div className="p-2 bg-yellow-50 border border-yellow-200 rounded mb-4 text-xs">
                <p>Available data:</p>
                <pre className="overflow-auto max-h-40">
                  {JSON.stringify(parsingResult.references_validation, null, 2)}
                </pre>
              </div>
            )}

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

            <div className="space-y-4">
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
          </>
        )}

        {/* Content Analysis */}
        {console.log(
          "Checking Content Analysis Section - Present:",
          !!parsingResult?.content_analysis
        )}
        {parsingResult.content_analysis && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Content Analysis
            </h2>
            {parsingResult.content_analysis.relationship_analyses && (
              <RelationshipGraph
                matrix={parsingResult.content_analysis.similarity_matrix}
                scopeSources={parsingResult.content_analysis.scope_sources}
                relationshipAnalyses={
                  parsingResult.content_analysis.relationship_analyses
                }
              />
            )}
          </>
        )}

        {/* Image Analysis */}
        {console.log(
          "Checking Image Analysis Section - Present:",
          !!parsingResult?.image_analysis
        )}
        {parsingResult.image_analysis && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
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
          </>
        )}

        {/* Spelling and Grammar Section */}
        {console.log(
          "Checking Spelling and Grammar Section - Present:",
          !!(
            parsingResult.content_analysis?.spelling_grammar?.length > 0 ||
            parsingResult.spelling_check
          )
        )}
        {(parsingResult.content_analysis?.spelling_grammar?.length > 0 ||
          parsingResult.spelling_check) && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Spelling and Grammar Check
            </h2>
            <div className="space-y-6">
              {/* Quick Spell Check Summary */}
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                <h4 className="font-medium text-blue-800 mb-2">
                  Quick Spell Check Summary
                </h4>
                <p className="text-sm text-gray-700">
                  {parsingResult.spelling_check.misspelled_count > 0 ? (
                    <>
                      Found{" "}
                      <span className="font-semibold text-red-600">
                        {parsingResult.spelling_check.misspelled_count}
                      </span>{" "}
                      potential misspelled words in document.
                    </>
                  ) : (
                    <>No spelling issues detected in the document.</>
                  )}
                </p>
              </div>

              {/* Add the SpellingCheckSection component here */}
              {parsingResult.spelling_check.per_section && (
                <SpellingCheckSection
                  spellingData={parsingResult.spelling_check}
                />
              )}

              {/* Keep your existing misspelled words display */}
              {parsingResult.spelling_check.misspelled_count > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-4 bg-gray-50 border-b">
                    <h4 className="font-medium">Potential Misspellings</h4>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {Object.entries(
                        parsingResult.spelling_check.misspelled_words
                      ).map(([word, correction], i) => (
                        <div
                          key={i}
                          className="flex items-center p-2 rounded bg-gray-50"
                        >
                          <span className="text-red-600 font-mono">{word}</span>
                          <span className="mx-2">→</span>
                          <span className="text-green-600 font-mono">
                            {correction}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Business Value Analysis */}
        {console.log(
          "Checking Business Value Analysis Section - Present:",
          !!parsingResult?.business_value_analysis
        )}
        {parsingResult?.business_value_analysis && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Business Value Analysis
            </h2>
            <div className="prose prose-lg text-gray-700 max-w-none">
              <ReactMarkdown>
                {(() => {
                  const evaluation =
                    parsingResult.business_value_analysis[
                      "Business Value Evaluation"
                    ];
                  if (!evaluation)
                    return "No business value evaluation available";
                  try {
                    return evaluation.replace(
                      /^### Business Value Evaluation\s*/,
                      ""
                    );
                  } catch (error) {
                    console.error(
                      "Error processing business value evaluation:",
                      error
                    );
                    return String(evaluation);
                  }
                })()}
              </ReactMarkdown>
            </div>
          </>
        )}

        {console.log(
          "Checking Diagram Convention Section - Present:",
          !!parsingResult?.diagram_convention
        )}
        {parsingResult?.diagram_convention && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Diagram Convention Analysis
            </h2>
            <div className="space-y-4">
              {/* Render Images */}
              {console.log(
                "Diagram Convention - Processing Results Present:",
                !!parsingResult?.diagram_convention?.processing_results
              )}
              {(parsingResult?.diagram_convention?.processing_results
                ?.use_case_diagrams ||
                parsingResult?.diagram_convention?.processing_results
                  ?.class_diagrams ||
                parsingResult?.diagram_convention?.processing_results
                  ?.sequence_diagrams) && (
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-4 text-gray-700">
                    Processed Diagrams
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {/* Use Case Diagrams */}
                    {Object.entries(
                      parsingResult?.diagram_convention?.processing_results
                        ?.use_case_diagrams || {}
                    ).map(([key, data]) => {
                      console.log(
                        `Rendering Use Case Diagram: ${key} -> ${data.path}`
                      );
                      return (
                        <div key={key} className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">
                            Use Case: {key.replace(/_/g, " ")}
                          </h4>
                          <img
                            src={`http://localhost:5000/output_results/${data.path.replace(
                              /\\/g,
                              "/"
                            )}`}
                            alt={key}
                            className="w-1/2 h-auto rounded-lg shadow-md mx-auto block"
                            onError={(e) =>
                              console.error(
                                `Failed to load image: ${data.path}`
                              )
                            }
                          />
                          {parsingResult?.diagram_convention?.validation_results
                            ?.validation_results[
                            `use_case_use_case_${key}`
                          ] && (
                            <div className="mt-2">
                              <h5 className="font-medium text-gray-700">
                                Validation Results:
                              </h5>
                              <pre className="whitespace-pre-wrap text-sm p-3 rounded bg-gray-100 text-gray-800">
                                {
                                  parsingResult?.diagram_convention
                                    ?.validation_results?.validation_results[
                                    `use_case_use_case_${key}`
                                  ]
                                }
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Class Diagrams */}
                    {Object.entries(
                      parsingResult?.diagram_convention?.processing_results
                        ?.class_diagrams || {}
                    ).map(([key, data]) => {
                      console.log(
                        `Rendering Class Diagram: ${key} -> ${data.path}`
                      );
                      return (
                        <div key={key} className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">
                            Class Diagram: {key.replace(/_/g, " ")}
                          </h4>
                          <img
                            src={`http://localhost:5000/output_results/${data.path.replace(
                              /\\/g,
                              "/"
                            )}`}
                            alt={key}
                            className="w-1/2 h-auto rounded-lg shadow-md mx-auto block"
                            onError={(e) =>
                              console.error(
                                `Failed to load image: ${data.path}`
                              )
                            }
                          />
                          {parsingResult?.diagram_convention?.validation_results
                            ?.validation_results[`class_class_${key}`] && (
                            <div className="mt-2">
                              <h5 className="font-medium text-gray-700">
                                Validation Results:
                              </h5>
                              <pre className="whitespace-pre-wrap text-sm p-3 rounded bg-gray-100 text-gray-800">
                                {
                                  parsingResult?.diagram_convention
                                    ?.validation_results?.validation_results[
                                    `class_class_${key}`
                                  ]
                                }
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {/* Sequence Diagrams */}
                    {Object.entries(
                      parsingResult?.diagram_convention?.processing_results
                        ?.sequence_diagrams || {}
                    ).map(([key, data]) => {
                      console.log(
                        `Rendering Sequence Diagram: ${key} -> ${data.path}`
                      );
                      return (
                        <div key={key} className="p-4 bg-gray-50 rounded-lg">
                          <h4 className="font-medium mb-2">
                            Sequence Diagram: {key.replace(/_/g, " ")}
                          </h4>
                          <img
                            src={`http://localhost:5000/output_results/${data.path.replace(
                              /\\/g,
                              "/"
                            )}`}
                            alt={key}
                            className="w-1/2 h-auto rounded-lg shadow-md mx-auto block"
                            onError={(e) =>
                              console.error(
                                `Failed to load image: ${data.path}`
                              )
                            }
                          />
                          {parsingResult?.diagram_convention?.validation_results
                            ?.validation_results[
                            `sequence_sequence_${key}`
                          ] && (
                            <div className="mt-2">
                              <h5 className="font-medium text-gray-700">
                                Validation Results:
                              </h5>
                              <pre className="whitespace-pre-wrap text-sm p-3 rounded bg-gray-100 text-gray-800">
                                {
                                  parsingResult?.diagram_convention
                                    ?.validation_results?.validation_results[
                                    `sequence_sequence_${key}`
                                  ]
                                }
                              </pre>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Issues */}
              {parsingResult?.diagram_convention?.processing_results?.issues
                ?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium text-red-600 mb-2">Issues:</h3>
                  <ul className="list-disc list-inside text-red-600">
                    {parsingResult?.diagram_convention?.processing_results?.issues.map(
                      (issue, idx) => (
                        <li key={idx}>{issue}</li>
                      )
                    )}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}

        {/* Plagiarism Check */}
        {console.log(
          "Checking Plagiarism Section - Present:",
          !!parsingResult?.plagiarism_check
        )}
        {parsingResult.plagiarism_check && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Plagiarism Check
            </h2>
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-lg border border-blue-100 shadow-sm">
                <div className="flex items-center mb-3">
                  <div className="bg-blue-100 p-2 rounded-full mr-3">
                    <svg
                      className="w-5 h-5 text-blue-700"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-blue-800 text-lg">
                    Plagiarism Check Summary
                  </h4>
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                  <div className="mb-3 md:mb-0">
                    <p className="text-gray-700">
                      <span className="font-medium">Analysis completed:</span>{" "}
                      {parsingResult.plagiarism_check.total_phrases_checked}{" "}
                      phrases analyzed
                    </p>
                    <p className="text-gray-700 mt-1">
                      <span className="font-medium">Search method:</span> Web
                      content comparison
                    </p>
                  </div>

                  <div className="bg-white px-4 py-3 rounded-lg shadow-sm border border-blue-100">
                    <p className="font-medium text-center">Result</p>
                    {parsingResult.plagiarism_check.similar_matches_found >
                    0 ? (
                      <p className="text-red-600 font-bold text-center text-lg">
                        {parsingResult.plagiarism_check.similar_matches_found}{" "}
                        matches found
                      </p>
                    ) : (
                      <p className="text-green-600 font-bold text-center text-lg">
                        No matches found
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Phrases Checked */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <div className="p-4 bg-gray-50 border-b flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h4 className="font-medium">Analyzed Content</h4>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 mb-3">
                    The following phrases from your document were analyzed for
                    potential plagiarism:
                  </p>
                  <div className="max-h-60 overflow-y-auto pr-2">
                    <ul className="space-y-2">
                      {parsingResult.plagiarism_check.phrases_checked.map(
                        (phrase, i) => (
                          <li
                            key={i}
                            className="p-3 bg-gray-50 rounded text-sm border-l-4 border-blue-400 hover:bg-gray-100 transition-colors"
                          >
                            "{phrase}"
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Search Results */}
              {parsingResult.plagiarism_check.search_results &&
                parsingResult.plagiarism_check.search_results.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="p-4 bg-gray-50 border-b flex items-center">
                      <svg
                        className="w-5 h-5 mr-2 text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z"
                        />
                      </svg>
                      <h4 className="font-medium">Search Results</h4>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-gray-600 mb-3">
                        All search results from the analysis (including below
                        threshold matches):
                      </p>
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {parsingResult.plagiarism_check.search_results.map(
                          (result, i) => (
                            <div
                              key={i}
                              className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <p className="font-medium text-gray-800">
                                    Query: "{result.query}"
                                  </p>
                                  <p className="text-sm text-gray-600 mt-1">
                                    Similarity:{" "}
                                    <span
                                      className={`font-semibold ${
                                        result.similarity > 0.3
                                          ? "text-red-600"
                                          : "text-gray-700"
                                      }`}
                                    >
                                      {Math.round(result.similarity * 100)}%
                                    </span>
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                  >
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                      />
                                    </svg>
                                    View Source
                                  </a>
                                  <a
                                    href={result.search_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-gray-500 hover:text-gray-700 text-sm flex items-center"
                                  >
                                    <svg
                                      className="w-4 h-4 mr-1"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                      />
                                    </svg>
                                    Search
                                  </a>
                                </div>
                              </div>
                              <div className="mt-2">
                                <p className="text-sm font-medium text-gray-700">
                                  Source: {result.title}
                                </p>
                                <div className="mt-1 p-2 bg-white rounded border border-gray-200">
                                  <p className="text-xs text-gray-600 italic line-clamp-3">
                                    {result.matched_content}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                )}

              {/* Matches Found */}
              {parsingResult.plagiarism_check.similar_matches_found > 0 ? (
                <div className="bg-white border border-red-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="p-4 bg-red-50 border-b flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <h4 className="font-medium text-red-800">
                      Potential Plagiarism Matches
                    </h4>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-red-600 mb-3 font-medium">
                      The following content may be plagiarized (similarity above
                      30%):
                    </p>
                    <div className="space-y-4">
                      {parsingResult.plagiarism_check.results.map(
                        (match, i) => (
                          <div
                            key={i}
                            className="p-4 bg-red-50 rounded-lg border border-red-200"
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-medium text-gray-800">
                                  Original phrase:
                                </p>
                                <p className="text-sm bg-white p-2 rounded border border-red-100 mt-1">
                                  "{match.phrase}"
                                </p>
                              </div>
                              <div className="bg-white px-3 py-2 rounded-full border border-red-200 text-red-700 font-bold">
                                {Math.round(match.similarity * 100)}% Match
                              </div>
                            </div>

                            <div className="mt-3">
                              <div className="flex justify-between items-center mb-2">
                                <p className="font-medium text-gray-800">
                                  Matched source:
                                </p>
                                <a
                                  href={match.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                                >
                                  <svg
                                    className="w-4 h-4 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                    xmlns="http://www.w3.org/2000/svg"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                    />
                                  </svg>
                                  View Full Source
                                </a>
                              </div>
                              <p className="text-sm font-medium mb-1">
                                {match.title}
                              </p>
                              <div className="p-3 bg-white rounded border border-red-100">
                                <p className="text-sm text-gray-700">
                                  {match.matched_content}
                                </p>
                              </div>
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-green-200 rounded-lg overflow-hidden shadow-sm">
                  <div className="p-4 bg-green-50 border-b flex items-center">
                    <svg
                      className="w-5 h-5 mr-2 text-green-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <h4 className="font-medium text-green-800">
                      No Plagiarism Detected
                    </h4>
                  </div>
                  <div className="p-4">
                    <p className="text-green-600">
                      No significant similarities were found between your
                      document and existing online content. Your document
                      appears to be original.
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h4 className="font-medium text-gray-700 mb-2">
                  Recommendations
                </h4>
                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                  <li>
                    Always cite your sources properly when using external
                    content
                  </li>
                  <li>
                    Use quotation marks for direct quotes from other works
                  </li>
                  <li>
                    Paraphrase content in your own words while maintaining the
                    original meaning
                  </li>
                  <li>
                    Check your document with multiple plagiarism tools for
                    comprehensive results
                  </li>
                </ul>
              </div>
            </div>
          </>
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
  const isObject = typeof reference === "object" && reference !== null;
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

              {showCitations &&
                citations.contexts.map((context, i) => (
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
    </div>
  );
}

function EnhancedReferenceCard({ reference, validationDetails }) {
  const ref =
    typeof reference === "object" && reference !== null ? reference : {};
  const refNumber = ref.reference_number || "?";
  const isValid = validationDetails?.is_valid || false;
  const isCited = ref.is_cited || false;
  const citationCount = ref.citations_in_document?.length || 0;
  const isVerified = ref.online_verification?.verified || false;

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

function Badge({ text, color = "gray", onClick, className = "" }) {
  const getColorClasses = () => {
    switch (color) {
      case "green":
        return "bg-green-100 text-green-800";
      case "red":
        return "bg-red-100 text-red-800";
      case "yellow":
        return "bg-yellow-100 text-yellow-800";
      case "blue":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`${getColorClasses()} text-xs px-2 py-1 rounded-full ${className} ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      {text}
    </span>
  );
}

function SpellingCheckSection({ spellingData }) {
  // Check if we have per-section spelling data
  if (!spellingData || !spellingData.per_section || !spellingData.sections) {
    return (
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Spelling Check</h3>
        <p>No section-based spelling data available.</p>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h3 className="text-xl font-semibold mb-3">Spelling Check by Section</h3>

      {Object.entries(spellingData.sections).map(
        ([sectionName, sectionData]) => (
          <div key={sectionName} className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-md font-medium mb-2 flex items-center justify-between">
              <span>{sectionName}</span>
              <Badge
                text={`${sectionData.count} issues`}
                color={
                  sectionData.count > 10
                    ? "red"
                    : sectionData.count > 5
                    ? "yellow"
                    : "green"
                }
              />
            </h4>

            {sectionData.count > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-left">Misspelled Word</th>
                      <th className="px-4 py-2 text-left">Suggestion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(sectionData.misspelled).map(
                      ([word, suggestion], index) => (
                        <tr
                          key={index}
                          className={
                            index % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }
                        >
                          <td className="px-4 py-2 text-red-600">{word}</td>
                          <td className="px-4 py-2 text-green-600">
                            {suggestion || "No suggestion"}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-green-600">
                No spelling issues found in this section.
              </p>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default ParsingResult;
