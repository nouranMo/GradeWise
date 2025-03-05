import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

function ParsingResult() {
    const location = useLocation();
    const navigate = useNavigate();
    const { parsingResult } = location.state || {};

    if (!parsingResult || parsingResult.status === 'error') {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
                <h2 className="text-2xl font-bold text-red-600 mb-4">
                    {parsingResult?.message || 'No Parsing Result Found'}
                </h2>
                <button
                    onClick={() => navigate('/dashboard')}
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
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="px-4 py-2 bg-[#ff6464] text-white rounded-lg hover:bg-[#ff4444] transition-colors duration-300 ease-in-out"
                    >
                        Back to Dashboard
                    </button>
                </div>

                {/* SRS Structure Validation */}
                {parsingResult.srs_validation && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">SRS Structure Analysis</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <StatCard 
                                    title="Matching Sections" 
                                    value={parsingResult.srs_validation.structure_validation.matching_sections.length}
                                    color="green"
                                />
                                <StatCard 
                                    title="Missing Sections" 
                                    value={parsingResult.srs_validation.structure_validation.missing_sections.length}
                                    color="red"
                                />
                            </div>
                            
                            {/* Missing Sections */}
                            {parsingResult.srs_validation.structure_validation.missing_sections.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="font-semibold text-red-600">Missing Sections:</h3>
                                    <ul className="list-disc list-inside">
                                        {parsingResult.srs_validation.structure_validation.missing_sections.map((section, index) => (
                                            <li key={index} className="text-gray-700">{section}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* References Analysis */}
                {parsingResult.references_validation && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">References Analysis</h2>
                        <div className="space-y-4">
                            {Array.isArray(parsingResult.references_validation.reformatted_references) ? (
                                parsingResult.references_validation.reformatted_references.map((ref, index) => (
                                    <ReferenceCard key={index} reference={ref} index={index + 1} />
                                ))
                            ) : (
                                <p className="text-gray-600">No references found or invalid format</p>
                            )}
                        </div>
                    </div>
                )}

{/* Content Analysis */}
{parsingResult.content_analysis && (
    <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Content Analysis</h2>
        
        {/* Similarity Matrix */}
        {parsingResult.content_analysis.scope_sources && parsingResult.content_analysis.similarity_matrix && (
            <div className="mb-6">
                <h3 className="text-xl font-semibold mb-3">Similarity Matrix</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full border border-gray-200">
                        <thead>
                            <tr>
                                <th className="border p-2 bg-gray-50">Section</th>
                                {parsingResult.content_analysis.scope_sources.map((source, i) => (
                                    <th key={i} className="border p-2 bg-gray-50">{source}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {parsingResult.content_analysis.similarity_matrix.map((row, i) => (
                                <tr key={i}>
                                    <td className="border p-2 font-medium bg-gray-50">
                                        {parsingResult.content_analysis.scope_sources[i]}
                                    </td>
                                    {row.map((value, j) => (
                                        <td key={j} className="border p-2 text-center">
                                            {Math.round(value * 100)}%
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Spelling and Grammar */}
        {parsingResult.content_analysis.spelling_grammar && parsingResult.content_analysis.spelling_grammar.length > 0 && (
            <div>
                <h3 className="text-xl font-semibold mb-3">Spelling and Grammar</h3>
                {parsingResult.content_analysis.spelling_grammar.map((result, index) => (
                    <div key={index} className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium mb-2">
                            {parsingResult.content_analysis.scope_sources[index] || `Section ${index + 1}`}
                        </h4>
                        {result.misspelled && Object.keys(result.misspelled).length > 0 && (
                            <div className="mb-2">
                                <p className="text-sm font-medium text-red-600">Spelling Issues:</p>
                                <ul className="list-disc list-inside">
                                    {Object.entries(result.misspelled).map(([word, suggestion], i) => (
                                        <li key={i} className="text-sm">
                                            {word} → {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {result.grammar_suggestions && result.grammar_suggestions.length > 0 && (
                            <div>
                                <p className="text-sm font-medium text-orange-600">Grammar Issues:</p>
                                <ul className="list-disc list-inside">
                                    {result.grammar_suggestions.map((issue, i) => (
                                        <li key={i} className="text-sm">
                                            {issue.message}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
    </div>
)}


                {/* Image Analysis */}
                {parsingResult.image_analysis && (
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Image Analysis</h2>
                        <div className="space-y-4">
                            {parsingResult.image_analysis.processed_images.map((image, index) => (
                                <div key={index} className="p-4 bg-gray-50 rounded-lg">
                                    <h3 className="font-medium mb-2">Image {image.image_index}</h3>
                                    <p className="text-sm text-gray-700">{image.extracted_text}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ title, value, color }) {
    const colors = {
        green: 'bg-green-50 text-green-700 border-green-200',
        red: 'bg-red-50 text-red-700 border-red-200',
        blue: 'bg-blue-50 text-blue-700 border-blue-200'
    };

    return (
        <div className={`${colors[color]} border rounded-lg p-4`}>
            <h4 className="text-sm font-medium">{title}</h4>
            <p className="text-2xl font-bold mt-2">{value}</p>
        </div>
    );
}

function ReferenceCard({ reference, index }) {
    const formatCheck = reference.format_check || { valid: false, errors: [] };
    const verification = reference.verification || { verified: false };

    const handleVerificationClick = () => {
        if (verification.verified && verification.details?.search_url) {
            window.open(verification.details.search_url, '_blank');
        }
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
                        text={verification.verified ? "Verified Online" : "Unverified"}
                        color={verification.verified ? "green" : "yellow"}
                        onClick={verification.verified ? handleVerificationClick : undefined}
                        className={verification.verified ? "cursor-pointer hover:opacity-80" : ""}
                    />
                </div>
            </div>

            <div className="space-y-2">
                <div className="text-sm">
                    <p className="font-medium">Original:</p>
                    <p className="text-gray-600">{reference.original || 'N/A'}</p>
                </div>
                <div className="text-sm">
                    <p className="font-medium">Reformatted:</p>
                    <p className="text-gray-600">{reference.reformatted || 'N/A'}</p>
                </div>

                {/* Format Issues */}
                {!formatCheck.valid && formatCheck.errors && formatCheck.errors.length > 0 && (
                    <div className="text-sm">
                        <p className="font-medium text-red-600">Format Issues:</p>
                        <ul className="list-disc list-inside text-red-500">
                            {formatCheck.errors.map((error, i) => (
                                <li key={i}>{error}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function Badge({ text, color, onClick, className = "" }) {
    const colors = {
        green: 'bg-green-100 text-green-800',
        red: 'bg-red-100 text-red-800',
        yellow: 'bg-yellow-100 text-yellow-800'
    };

    return (
        <span 
            className={`${colors[color]} text-xs px-2 py-1 rounded-full ${className}`}
            onClick={onClick}
            title={onClick ? "Click to view online" : ""}
        >
            {text}
        </span>
    );
}

export default ParsingResult;
