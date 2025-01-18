import React, { useState } from 'react';
import Navbar from './Navbar';
import { useNavigate } from 'react-router-dom';

function UMLparsing() {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.group('UMLparsing - handleSubmit');
        
        if (!file) {
            console.warn('No file selected');
            alert('Please provide a PDF file.');
            console.groupEnd();
            return;
        }

        console.log('Selected file:', file);
        console.log('File type:', file.type);
        console.log('File size:', file.size);

        const formData = new FormData();
        formData.append('pdfFile', file);

        setIsLoading(true);
        try {
            console.log('Sending request to server...');
            const response = await fetch('http://localhost:5000/analyze_document', {
                method: 'POST',
                body: formData,
            });

            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Received result:', result);
            
            navigate('/umlreport', { state: { result } });
        } catch (error) {
            console.error('Error during document processing:', error);
            alert('Failed to process the document: ' + error.message);
        } finally {
            setIsLoading(false);
            console.groupEnd();
        }
    };

    const handleFileChange = (e) => {
        console.group('UMLparsing - handleFileChange');
        const selectedFile = e.target.files[0];
        
        if (selectedFile) {
            console.log('File selected:', {
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size
            });
            
            if (selectedFile.type !== 'application/pdf') {
                console.warn('Invalid file type:', selectedFile.type);
                alert('Please select a PDF file.');
                e.target.value = '';
                setFile(null);
            } else {
                setFile(selectedFile);
            }
        } else {
            console.log('No file selected');
            setFile(null);
        }
        console.groupEnd();
    };

    return (
        <div className="relative h-screen p-0 m-0">
            {/* Background Layer */}
            <div className="absolute inset-0 bg-sky-900"></div>
            <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10"></div>
            <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10"></div>

            {/* Page Content */}
            <Navbar />
            <form
                className="relative z-10 flex flex-col justify-center items-center gap-6 mt-10 p-6 bg-white bg-opacity-20 rounded-lg shadow-lg w-80 mx-auto"
                onSubmit={handleSubmit}
            >
                <label className="text-sky-100 text-lg font-poppins">Upload SRS Document (PDF)</label>
                <input
                    type="file"
                    accept=".pdf"
                    className="border border-solid border-sky-300 bg-transparent text-sky-100 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-sky-500"
                    onChange={handleFileChange}
                />
                <button
                    type="submit"
                    disabled={isLoading || !file}
                    className={`mt-4 bg-sky-500 text-white px-4 py-2 rounded-lg transition-all duration-300 w-full
                        ${isLoading || !file ? 'opacity-50 cursor-not-allowed' : 'hover:bg-sky-600'}`}
                >
                    {isLoading ? 'Processing...' : 'Analyze Document'}
                </button>
            </form>
        </div>
    );
}

export default UMLparsing;
