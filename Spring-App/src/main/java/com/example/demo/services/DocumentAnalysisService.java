package com.example.demo.services;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for analyzing documents
 */
@Service
public class DocumentAnalysisService {
    
    private static final Logger logger = LoggerFactory.getLogger(DocumentAnalysisService.class);
    
    @Autowired
    private PythonScriptService pythonScriptService;
    
    /**
     * Analyzes a document with the given options
     * 
     * @param filePath Path to the document file
     * @param analysisOptions Map of analysis options
     * @return Map containing analysis results
     */
    public Map<String, Object> analyzeDocument(String filePath, Map<String, Object> analysisOptions) {
        logger.info("Analyzing document: {} with options: {}", filePath, analysisOptions);
        
        try {
            // Call the Python script service to perform the analysis
            Map<String, Object> results = pythonScriptService.runAnalysis(filePath, analysisOptions);
            
            logger.info("Analysis completed successfully for: {}", filePath);
            return results;
            
        } catch (Exception e) {
            logger.error("Error analyzing document: {}", filePath, e);
            Map<String, Object> errorResult = new HashMap<>();
            errorResult.put("status", "error");
            errorResult.put("message", "Analysis failed: " + e.getMessage());
            return errorResult;
        }
    }
} 