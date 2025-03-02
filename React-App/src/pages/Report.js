import React from 'react';
import { useLocation } from 'react-router-dom'; // Import useLocation to get the passed state
import Navbar from '../components/layout/Navbar/Navbar';

function Report() {
  const location = useLocation(); // Access the location object
  const { parsedData, validationResults } = location.state || {}; // Get parsed data and validation results from state

  console.log(parsedData); // Log parsed data to check if it exists
  console.log(validationResults); // Log validation results to check if they exist

  return (
    <div className="p-0 m-0 bg-sky-900 min-h-screen overflow-hidden">
      <Navbar />
      <div className="flex flex-col justify-center items-center">
        <div className="flex flex-row w-screen">
          <div className="flex flex-col w-[50%]">
            <div className="bg-sky-100">
              <h2 className="text-center text-sky-950">Document Extraction</h2>
            </div>

            <div className="pt-5 px-10 bg-sky-100 mt-1">
              <p className="text-sky-950">Document Text</p>
              {/* Render parsed data with a fallback if empty */}
              {parsedData ? (
                <pre className="text-sky-950 text-wrap text-sm">{JSON.stringify(parsedData, null, 2)}</pre>
              ) : (
                <p className="text-sky-950">No document data available</p>
              )}
            </div>
          </div>

          {/* vertical line between the two divs */}
          <div className="w-[4px] opacity-0"></div>

          <div className="flex flex-col w-[50%]">
            <div className="bg-sky-100">
              <h2 className="text-center text-sky-950">Validation Results</h2>
            </div>

            <div className="pt-5 px-10 bg-sky-100 mt-1">
              <p className="text-sky-950">Validation Issues</p>
              {/* Render validation results */}
              {validationResults ? (
                <pre className="text-sky-950 text-wrap text-sm">{JSON.stringify(validationResults, null, 2)}</pre>
              ) : (
                <p className="text-sky-950">No validation results available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Report;
