import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "components/layout/Navbar/Navbar";

function ProfessorDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedClass, setSelectedClass] = useState("all");

  const navigate = useNavigate();

  useEffect(() => {
    // Get the documents from localStorage that were uploaded in the student dashboard
    const analyzedDocuments = JSON.parse(
      localStorage.getItem("analyzedDocuments") || "[]"
    );

    // Transform the documents into the submission format
    const transformedSubmissions = analyzedDocuments.map((doc) => ({
      id: doc.id,
      studentName: "Student", // This would come from auth in a real app
      documentName: doc.name,
      documentType: doc.name.includes("SRS") ? "SRS" : "SDD",
      submissionDate: doc.date,
      status: doc.analyzed ? "Reviewed" : "Pending Review",
      autoCheckScore: doc.results?.overallScore || 0,
      feedback: "",
      file: doc.file, // Keep the file reference if you need it
      results: doc.results, // Keep the analysis results
    }));

    setSubmissions(transformedSubmissions);
  }, []);

  const handleViewSubmission = (submission) => {
    if (submission.results) {
      navigate("/parsing-result", {
        state: { parsingResult: submission.results },
      });
    } else {
      alert("No analysis results available for this document.");
    }
  };

  const handleProvideFeedback = (submission) => {
    // Implement feedback functionality
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="max-w-6xl mx-auto mt-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-800">
            Professor Dashboard
          </h1>
          <p className="text-gray-500">
            {submissions.length} submissions pending review
          </p>
        </div>

        {/* Filters and Controls */}
        {/* Filters and Controls */}
        <div className="flex gap-4 mb-6">
          <div className="relative">
            <select
              className="appearance-none bg-white border rounded-lg px-6 py-3 pr-12 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6464] focus:border-transparent cursor-pointer"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
            >
              <option value="all">All Groups</option>
              <option value="swe301">SWE 301</option>
			  <option value="swe302">SWE 302</option>
              <option value="swe401">SWE 401</option>
              <option value="swe402">SWE 402</option>
            </select>
          </div>

          <div className="relative">
            <select
              className="appearance-none bg-white border rounded-lg px-6 py-3 pr-12 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#ff6464] focus:border-transparent cursor-pointer"
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
            >
              <option value="all">All Submissions</option>
              <option value="pending">Pending Review</option>
              <option value="reviewed">Reviewed</option>
            </select>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="grid grid-cols-7 gap-4 px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500">
            <div>STUDENT NAME</div>
            <div>DOCUMENT</div>
            <div>TYPE</div>
            <div>SUBMITTED</div>
            <div>AUTO-CHECK SCORE</div>
            <div>STATUS</div>
            <div>ACTIONS</div>
          </div>

          {submissions.map((submission) => (
            <div
              key={submission.id}
              className="grid grid-cols-7 gap-4 px-4 py-3 border-b text-sm text-gray-600 hover:bg-gray-50"
            >
              <div>{submission.studentName}</div>
              <div className="truncate" title={submission.documentName}>
                {submission.documentName}
              </div>
              <div>{submission.documentType}</div>
              <div>{submission.submissionDate}</div>
              <div>{submission.autoCheckScore}%</div>
              <div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    submission.status === "Reviewed"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {submission.status}
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewSubmission(submission)}
                  className="px-2 py-1 text-sm text-white bg-[#ff6464] rounded-md hover:bg-[#ff4444]"
                >
                  View
                </button>
                <button
                  onClick={() => handleProvideFeedback(submission)}
                  className="px-2 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Feedback
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Statistics Section */}
        <div className="grid grid-cols-4 gap-4 mt-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-md font-medium">Pending Review</h3>
            <p className="text-lg font-bold text-[#ff6464]">12</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-md font-medium">Reviewed Today</h3>
            <p className="text-lg font-bold text-[#ff6464]">5</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-md font-medium">Average Score</h3>
            <p className="text-lg font-bold text-[#ff6464]">85%</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-md font-medium">Number of Students</h3>
            <p className="text-lg font-bold text-[#ff6464]">45</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfessorDashboard;
