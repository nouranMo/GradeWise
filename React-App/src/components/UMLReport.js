import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Navbar from './Navbar';

function UMLReport() {
    const location = useLocation();
    const navigate = useNavigate();
    const { result } = location.state || {};
    const [error, setError] = useState(null);

    useEffect(() => {
        console.group('UMLReport - Initial Data');
        console.log('Location State:', location.state);
        console.log('Result Data:', result);

        if (!result) {
            console.error('No result data available');
            setError('No analysis results available');
            return;
        }

        if (result.error) {
            console.error('Error in result:', result.error);
            setError(result.error);
            return;
        }

        console.log('Available Data Keys:', Object.keys(result));
        console.log('Similarity Matrix:', result.similarity_matrix);
        console.log('Scope Sources:', result.scope_sources);
        console.log('Scopes:', result.scopes);
        console.log('Spelling Grammar:', result.spelling_grammar);
        console.log('Validation Results:', result.validation_results);
        console.groupEnd();
    }, [location.state, result]);

    if (error) {
        return (
            <div className="min-h-screen bg-sky-900">
                <Navbar />
                <div className="p-6">
                    <div className="bg-red-500 text-white p-4 rounded-lg">
                        Error: {error}
                    </div>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="min-h-screen bg-sky-900">
                <Navbar />
                <div className="p-6">
                    <div className="text-sky-100">Loading results...</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-sky-900">
            <Navbar />
            <div className="container mx-auto p-6">
                <div className="bg-white bg-opacity-10 rounded-lg p-6">
                    {/* Validation Results */}
                    {result.validation_results && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-sky-100 mb-4">SRS Structure Validation</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(result.validation_results).map(([key, value]) => (
                                    <div key={key} className="bg-sky-800 p-4 rounded-lg">
                                        <h3 className="text-lg font-semibold text-sky-100 mb-2">
                                            {key.replace(/_/g, ' ').toUpperCase()}
                                        </h3>
                                        {Array.isArray(value) ? (
                                            <ul className="list-disc list-inside text-sky-100">
                                                {value.map((item, index) => (
                                                    <li key={index}>{item}</li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-sky-100">{value}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Similarity Matrix */}
                    {result.similarity_matrix && result.scope_sources && (
                        <div className="mb-8 overflow-x-auto">
                            <h2 className="text-2xl font-bold text-sky-100 mb-4">Similarity Matrix</h2>
                            <table className="min-w-full text-sky-100">
                                <thead>
                                    <tr>
                                        <th className="px-4 py-2 border border-sky-300">Source</th>
                                        {result.scope_sources.map((source, index) => (
                                            <th key={index} className="px-4 py-2 border border-sky-300">
                                                {source}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.similarity_matrix.map((row, i) => (
                                        <tr key={i}>
                                            <td className="px-4 py-2 border border-sky-300 font-medium">
                                                {result.scope_sources[i]}
                                            </td>
                                            {row.map((score, j) => (
                                                <td key={j} className="px-4 py-2 border border-sky-300 text-center">
                                                    {score.toFixed(2)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Scopes and Spelling/Grammar */}
                    {result.scopes && result.spelling_grammar && (
                        <div>
                            <h2 className="text-2xl font-bold text-sky-100 mb-4">Section Analysis</h2>
                            {result.scopes.map((scope, index) => (
                                <div key={index} className="mb-6 bg-sky-800 p-4 rounded-lg">
                                    <h3 className="text-xl font-semibold text-sky-100 mb-2">
                                        {result.scope_sources[index]}
                                    </h3>
                                    <div className="text-sky-100 mb-4">{scope}</div>
                                    
                                    {/* Spelling/Grammar Issues */}
                                    {result.spelling_grammar[index] && (
                                        <div>
                                            <h4 className="text-lg font-medium text-sky-100 mb-2">Issues Found:</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Spelling Issues */}
                                                <div>
                                                    <h5 className="text-sky-100 font-medium mb-2">Spelling:</h5>
                                                    <ul className="list-disc list-inside text-sky-100">
                                                        {Object.entries(result.spelling_grammar[index][0]).map(([word, correction], i) => (
                                                            <li key={i}>
                                                                {word} → {correction}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                
                                                {/* Grammar Issues */}
                                                <div>
                                                    <h5 className="text-sky-100 font-medium mb-2">Grammar:</h5>
                                                    <ul className="list-disc list-inside text-sky-100">
                                                        {result.spelling_grammar[index][1].map((issue, i) => (
                                                            <li key={i}>
                                                                {issue.message}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default UMLReport;
