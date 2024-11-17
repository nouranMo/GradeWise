import React from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import Navbar from './Navbar';

function UMLReport() {
    const location = useLocation();
    const { result } = location.state || {};

    if (!result || !result.markdown) {
        return (
            <div className="relative h-screen p-0 m-0">
                {/* Background Layer */}
                <div className="absolute inset-0 bg-sky-900"></div>
                <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10"></div>
                <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10"></div>

                {/* Content */}
                <Navbar />
                <div className="relative z-10 flex items-center justify-center h-full">
                    <div className="bg-white bg-opacity-20 text-sky-100 rounded-lg shadow-lg p-6 w-[80%] sm:w-[65%] md:w-[50%] lg:w-[40%]">
                        <h2 className="text-center text-xl font-semibold mb-4">No Results</h2>
                        <p className="text-center">There are no results to display at this time.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen p-0 m-0">
            {/* Background Layer */}
            <div className="absolute inset-0 bg-sky-900"></div>
            <div className="absolute bg-sky-500 w-72 h-72 rounded-full opacity-40 blur-3xl top-10 left-10"></div>
            <div className="absolute bg-sky-700 w-64 h-64 rounded-full opacity-40 blur-3xl bottom-10 right-10"></div>

            {/* Content */}
            <Navbar />
            <div className="relative z-10 flex flex-col items-center justify-start h-full pt-10">
                <div className="bg-white bg-opacity-20 text-sky-100 rounded-lg shadow-lg p-6 w-[80%] sm:w-[65%] md:w-[50%] lg:w-[40%]">
                    <h1 className="text-2xl font-bold mb-6 text-center">Parsing Results</h1>
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => (
                                <h1 className="text-2xl font-bold text-sky-100 mb-4" {...props} />
                            ),
                            h2: ({ node, ...props }) => (
                                <h2 className="text-xl font-semibold text-sky-100 mt-6 mb-2" {...props} />
                            ),
                            h3: ({ node, ...props }) => (
                                <h3 className="text-lg font-medium text-sky-100 mt-4 mb-2" {...props} />
                            ),
                            p: ({ node, ...props }) => (
                                <p className="text-sky-100 leading-relaxed mb-4" {...props} />
                            ),
                            ul: ({ node, ...props }) => (
                                <ul className="list-disc list-inside text-sky-100 mb-4" {...props} />
                            ),
                            ol: ({ node, ...props }) => (
                                <ol className="list-decimal list-inside text-sky-100 mb-4" {...props} />
                            ),
                            li: ({ node, ...props }) => (
                                <li className="mb-2" {...props} />
                            ),
                            strong: ({ node, ...props }) => (
                                <strong className="font-semibold text-sky-200" {...props} />
                            ),
                            em: ({ node, ...props }) => (
                                <em className="italic text-sky-200" {...props} />
                            ),
                        }}
                    >
                        {result.markdown}
                    </ReactMarkdown>
                </div>
            </div>
        </div>
    );
}

export default UMLReport;
