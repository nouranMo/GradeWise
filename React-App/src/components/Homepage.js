import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import fileImage from '../images/file-light.png';

function Homepage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [analyzedDocuments, setAnalyzedDocuments] = useState([]);
    const [selectedAnalyses, setSelectedAnalyses] = useState({
        srsValidation: false,
        referencesValidation: false,
        contentAnalysis: false,
        imageAnalysis: false,
        businessValueAnalysis: false
    });
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const navigate = useNavigate();

    // Fetch analyzed documents from localStorage or server
    useEffect(() => {
        const savedDocuments = localStorage.getItem('analyzedDocuments');
        if (savedDocuments) {
            setAnalyzedDocuments(JSON.parse(savedDocuments));
        }
    }, []);

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
    };

    const handleCheckboxChange = (analysis) => {
        setSelectedAnalyses(prev => ({
            ...prev,
            [analysis]: !prev[analysis]
        }));
    };

    const handleDeleteDocument = (docId) => {
        const updatedDocs = analyzedDocuments.filter(doc => doc.id !== docId);
        setAnalyzedDocuments(updatedDocs);
        localStorage.setItem('analyzedDocuments', JSON.stringify(updatedDocs));
    };

    const handleAnalyzeDocument = async () => {
        if (!selectedFile) {
            alert("Please select a file to analyze.");
            return;
        }

        if (!Object.values(selectedAnalyses).some(value => value)) {
            alert("Please select at least one type of analysis.");
            return;
        }

        setIsAnalyzing(true);
        const formData = new FormData();
        formData.append('pdfFile', selectedFile);
        formData.append('analyses', JSON.stringify(selectedAnalyses));

        try {
            const response = await fetch('http://localhost:5000/analyze_document', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (result.status === 'success') {
                const newDocument = {
                    id: Date.now(),
                    name: selectedFile.name,
                    date: new Date().toLocaleDateString(),
                    analyses: selectedAnalyses,
                    results: result
                };

                const updatedDocuments = [newDocument, ...analyzedDocuments];
                setAnalyzedDocuments(updatedDocuments);
                localStorage.setItem('analyzedDocuments', JSON.stringify(updatedDocuments));

                navigate('/parsing-result', { state: { parsingResult: result } });
            } else {
                alert(`Error: ${result.message}`);
            }
        } catch (error) {
            console.error("Error analyzing document:", error);
            alert("An error occurred while analyzing the document.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDocumentClick = (document) => {
        navigate('/parsing-result', { state: { parsingResult: document.results } });
    };

    return (
        <div className="relative h-screen p-0 m-0">
            {/* Background Layer */}
            <div className="absolute inset-0 bg-sky-900 z-0"></div>
            <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10 z-0"></div>
            <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10 z-0"></div>

            {/* Page Content */}
            <Navbar />
            <div className="relative z-10 flex flex-col items-center p-8">
                <div className="bg-white/90 rounded-xl shadow-lg p-8 max-w-md w-full mb-8">
                    <h2 className="text-2xl font-bold text-sky-900 mb-6 text-center">
                        Document Analysis
                    </h2>

                    {/* File Upload */}
                    <div className="mb-6">
                        <label className="block text-sky-900 font-medium mb-2">
                            Upload PDF Document
                        </label>
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="w-full text-sky-900 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-sky-900 file:text-white hover:file:bg-sky-800"
                        />
                    </div>

                    {/* Analysis Options */}
                    <div className="space-y-3 mb-6">
                        <label className="block text-sky-900 font-medium mb-2">
                            Select Analyses to Perform
                        </label>
                        <div className="space-y-2">
                            <CheckboxOption
                                id="srsValidation"
                                label="SRS Structure Validation"
                                checked={selectedAnalyses.srsValidation}
                                onChange={() => handleCheckboxChange('srsValidation')}
                            />
                            <CheckboxOption
                                id="referencesValidation"
                                label="References Validation"
                                checked={selectedAnalyses.referencesValidation}
                                onChange={() => handleCheckboxChange('referencesValidation')}
                            />
                            <CheckboxOption
                                id="contentAnalysis"
                                label="Content Analysis"
                                checked={selectedAnalyses.contentAnalysis}
                                onChange={() => handleCheckboxChange('contentAnalysis')}
                            />
                            <CheckboxOption
                                id="imageAnalysis"
                                label="Image Analysis"
                                checked={selectedAnalyses.imageAnalysis}
                                onChange={() => handleCheckboxChange('imageAnalysis')}
                            />
                             <CheckboxOption
                                id="businessValueAnalysis"
                                label="Business Analysis"
                                checked={selectedAnalyses.businessValueAnalysis}
                                onChange={() => handleCheckboxChange('businessValueAnalysis')}
                            />
                        </div>
                    </div>

                    {/* Analyze Button with Loading State */}
                    <button
                        onClick={handleAnalyzeDocument}
                        disabled={isAnalyzing}
                        className={`w-full px-6 py-3 bg-sky-900 text-white rounded-lg transition duration-300 
                            ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-sky-800'}`}
                    >
                        {isAnalyzing ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Analyzing...
                            </div>
                        ) : (
                            'Analyze Document'
                        )}
                    </button>
                </div>

                {/* Analyzed Documents Grid */}
                {analyzedDocuments.length > 0 && (
                    <div className="w-full max-w-6xl">
                        <h3 className="text-xl font-bold text-white mb-4">Previously Analyzed Documents</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 overflow-y-auto max-h-[50vh]">
                            {analyzedDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="relative flex flex-col items-center p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-all group"
                                >
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDocument(doc.id);
                                        }}
                                        className="absolute top-2 right-2 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                        </svg>
                                    </button>
                                    <div
                                        onClick={() => handleDocumentClick(doc)}
                                        className="w-full h-full cursor-pointer"
                                    >
                                        <img className="w-16 mb-2 mx-auto" src={fileImage} alt="document" />
                                        <p className="text-white text-sm font-medium text-center">{doc.name}</p>
                                        <p className="text-sky-200 text-xs text-center">{doc.date}</p>
                                        <div className="flex flex-wrap gap-1 mt-2 justify-center">
                                            {Object.entries(doc.analyses)
                                                .filter(([_, value]) => value)
                                                .map(([key]) => (
                                                    <span
                                                        key={key}
                                                        className="text-xs bg-sky-900/50 text-sky-100 px-2 py-1 rounded-full"
                                                    >
                                                        {key.replace(/([A-Z])/g, ' $1').trim()}
                                                    </span>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function CheckboxOption({ id, label, checked, onChange }) {
    return (
        <div className="flex items-center">
            <input
                type="checkbox"
                id={id}
                checked={checked}
                onChange={onChange}
                className="w-4 h-4 text-sky-900 border-sky-300 rounded focus:ring-sky-500"
            />
            <label htmlFor={id} className="ml-2 text-sky-900">
                {label}
            </label>
        </div>
    );
}

export default Homepage;
