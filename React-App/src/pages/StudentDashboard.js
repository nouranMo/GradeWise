import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";

// API URL constant
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

const StudentDashboard = () => {
  // Add all state variables
  const [studentDocuments, setStudentDocuments] = useState([]);
  const [studentSubmissions, setStudentSubmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const navigate = useNavigate();

  // Fetch student submissions with proper loading state
  const fetchStudentSubmissions = async () => {
    try {
      console.log("Fetching student submissions from API");
      setIsLoading(true);

      // Add a cache-busting parameter to avoid browser caching
      const response = await fetch(
        `${API_URL}/api/submissions/student?t=${new Date().getTime()}`,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      if (response.ok) {
        const submissions = await response.json();
        console.log("Fetched student submissions:", submissions);
        setStudentSubmissions(submissions);

        // If we have analyzing submissions, keep refreshing
        const hasAnalyzing = submissions.some(
          (sub) => sub.status === "Analyzing"
        );
        if (hasAnalyzing) {
          console.log("Found submissions being analyzed, will refresh shortly");
          if (!refreshInterval) {
            const interval = setInterval(fetchStudentSubmissions, 10000); // every 10 seconds
            setRefreshInterval(interval);
          }
        } else if (refreshInterval) {
          // No more analyzing submissions, clear the interval
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      } else {
        console.error(
          "Failed to fetch student submissions:",
          await response.text()
        );
      }
    } catch (error) {
      console.error("Error fetching student submissions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchStudentSubmissions();

    // Clean up interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, []); // Empty dependency array means this runs once on component mount

  const handleViewSubmissionResults = (submission) => {
    if (submission.results) {
      navigate("/parsing-result", {
        state: {
          parsingResult: {
            ...submission.results,
            status: "success",
            document_name: submission.documentName,
            document_type: "student_submission",
            document_id: submission.documentId,
          },
        },
      });
    } else {
      toast.info("No analysis results available yet");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Student Dashboard</h1>

      {/* My Submissions Section */}
      <div className="mt-10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">My Submissions</h2>
          <button
            onClick={fetchStudentSubmissions}
            className="px-3 py-1 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors duration-300 flex items-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </>
            )}
          </button>
        </div>

        {studentSubmissions.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            You haven't submitted any documents yet.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="grid grid-cols-7 gap-4 px-6 py-3 bg-gray-50 text-sm font-medium text-gray-500">
              <div className="col-span-2">DOCUMENT</div>
              <div>COURSE</div>
              <div>SUBMISSION TYPE</div>
              <div>SUBMISSION DATE</div>
              <div>STATUS</div>
              <div>ACTIONS</div>
            </div>

            {studentSubmissions.map((submission) => (
              <div
                key={submission.id}
                className="grid grid-cols-7 gap-4 px-6 py-4 border-b text-sm text-gray-600"
              >
                <div className="col-span-2">
                  <div className="font-medium">{submission.documentName}</div>
                  <div className="text-xs text-gray-400">
                    ID: {submission.documentId}
                  </div>
                </div>
                <div>{submission.course}</div>
                <div>{submission.submissionType}</div>
                <div>
                  {submission.submissionDate
                    ? new Date(submission.submissionDate).toLocaleDateString()
                    : new Date(submission.lastModified).toLocaleDateString()}
                </div>
                <div>
                  {submission.status === "Submitted" ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      Submitted
                    </span>
                  ) : submission.status === "Analyzing" ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 flex items-center">
                      <svg
                        className="animate-spin -ml-1 mr-1 h-3 w-3 text-yellow-800"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Analyzing
                    </span>
                  ) : submission.status === "Analyzed" ||
                    submission.status === "Graded" ? (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      Graded
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                      {submission.status}
                    </span>
                  )}
                </div>
                <div>
                  {(submission.status === "Analyzed" ||
                    submission.status === "Graded") && (
                    <button
                      onClick={() => handleViewSubmissionResults(submission)}
                      className="px-3 py-1 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors duration-300"
                    >
                      View Feedback
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
