import React, { useState } from 'react';
import Navbar from '../layout/Navbar/Navbar';
import { useNavigate } from 'react-router-dom'; // Import navigate hook

function SectionExtraction() {
  const [pdfFile, setPdfFile] = useState(null);
  const navigate = useNavigate(); // Use the navigate function

  // Handle file selection
  const handleFileChange = (e) => {
    setPdfFile(e.target.files[0]);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!pdfFile) {
      alert('Please upload a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('pdfFile', pdfFile);

    console.log('Uploading file:', pdfFile);

    try {
      const response = await fetch('http://localhost:5001/upload_pdf', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Validation Results:', data);

        // Pass both parsed data and validation results using navigate
        navigate('/report', { state: { parsedData: data.parsed_srs, validationResults: data.validation_results } });
      } else {
        const errorData = await response.json();
        console.error('Error response from server:', errorData);
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('An error occurred while uploading the file');
    }
  };

  return (
    <div className="relative h-screen p-0 m-0">
      {/* Background Layer */}
      <div className="absolute inset-0 bg-sky-900"></div>
      <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10"></div>
      <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10"></div>

      {/* Page Content */}
      <Navbar />
      <form onSubmit={handleSubmit} className="relative z-10 flex flex-col justify-center items-center gap-6 mt-10 p-6 bg-white bg-opacity-20 rounded-lg shadow-lg w-80 mx-auto">
        <label className="text-sky-100 text-lg font-poppins">PDF File</label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="border border-solid border-sky-300 bg-transparent text-sky-100 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          className="mt-4 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-all duration-300 w-full"
        >
          Extract
        </button>
      </form>
    </div>
  );
}

export default SectionExtraction;
