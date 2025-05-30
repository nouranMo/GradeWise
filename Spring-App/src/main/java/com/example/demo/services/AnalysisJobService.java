package com.example.demo.services;

import com.example.demo.models.AnalysisJob;
import com.example.demo.models.DocumentModel;
import com.example.demo.models.Submission;
import com.example.demo.repositories.AnalysisJobRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

@Service
public class AnalysisJobService {
    
    private static final Logger logger = LoggerFactory.getLogger(AnalysisJobService.class);
    
    @Autowired
    private AnalysisJobRepository analysisJobRepository;
    
    @Autowired
    private DocumentService documentService;
    
    @Autowired
    private SubmissionService submissionService;
    
    @Autowired
    private DocumentAnalysisService documentAnalysisService;
    
    public AnalysisJob createJob(String documentId, String userId, Map<String, Object> analysisOptions, boolean isSubmission) {
        AnalysisJob job = new AnalysisJob();
        job.setId(UUID.randomUUID().toString().replace("-", ""));
        job.setDocumentId(documentId);
        job.setUserId(userId);
        job.setStatus(AnalysisJob.Status.CREATED);
        job.setCreatedAt(LocalDateTime.now());
        job.setUpdatedAt(LocalDateTime.now());
        job.setAnalysisOptions(analysisOptions != null ? analysisOptions : new HashMap<>());
        job.setIsSubmission(isSubmission);
        
        return analysisJobRepository.save(job);
    }
    
    public AnalysisJob getJob(String jobId) {
        return analysisJobRepository.findById(jobId).orElse(null);
    }
    
    public AnalysisJob updateJobStatus(String jobId, AnalysisJob.Status status) {
        AnalysisJob job = getJob(jobId);
        if (job != null) {
            job.setStatus(status);
            return analysisJobRepository.save(job);
        }
        return null;
    }
    
    public AnalysisJob completeJob(String jobId, Map<String, Object> results) {
        AnalysisJob job = getJob(jobId);
        if (job != null) {
            job.setStatus(AnalysisJob.Status.COMPLETED);
            job.setResults(results);
            
            // Update the document status
            if (job.isSubmission()) {
                documentService.updateSubmissionStatus(job.getDocumentId(), "Completed");
            } else {
                documentService.updateDocumentStatus(job.getDocumentId(), "Completed");
            }
            
            return analysisJobRepository.save(job);
        }
        return null;
    }
    
    public AnalysisJob failJob(String jobId, String errorMessage) {
        AnalysisJob job = getJob(jobId);
        if (job != null) {
            job.setStatus(AnalysisJob.Status.FAILED);
            job.setErrorMessage(errorMessage);
            
            // Update the document status
            if (job.isSubmission()) {
                documentService.updateSubmissionStatus(job.getDocumentId(), "Failed");
            } else {
                documentService.updateDocumentStatus(job.getDocumentId(), "Failed");
            }
            
            return analysisJobRepository.save(job);
        }
        return null;
    }
    
    @Async
    public CompletableFuture<Void> processJob(String jobId) {
        AnalysisJob job = getJob(jobId);
        if (job == null) {
            return CompletableFuture.completedFuture(null);
        }
        
        try {
            // Update status to PROCESSING
            job.setStatus(AnalysisJob.Status.PROCESSING);
            analysisJobRepository.save(job);
            
            // Get document path
            String documentPath;
            String effectiveDocumentId = job.getDocumentId(); // The ID we'll actually use
            
            if (job.isSubmission()) {
                logger.info("Processing job for submission ID: {}", job.getDocumentId());
                
                // Get the submission first
                Submission submission = submissionService.getSubmission(job.getDocumentId());
                if (submission == null) {
                    throw new RuntimeException("Submission not found: " + job.getDocumentId());
                }
                
                // Check if the submission has a document ID
                String submissionDocumentId = submission.getDocumentId();
                if (submissionDocumentId == null || submissionDocumentId.isEmpty()) {
                    throw new RuntimeException("Submission has no associated document ID: " + job.getDocumentId());
                }
                
                logger.info("Found document ID {} in submission {}", submissionDocumentId, job.getDocumentId());
                effectiveDocumentId = submissionDocumentId;
                
                // Now get the document path using the document ID from the submission
                documentPath = documentService.getDocumentFilePath(submissionDocumentId);
                logger.info("Retrieved document path for submission document: {}", documentPath);
            } else {
                // Regular document - get path directly
                logger.info("Processing job for document ID: {}", job.getDocumentId());
                documentPath = documentService.getDocumentFilePath(job.getDocumentId());
                logger.info("Retrieved direct document path: {}", documentPath);
            }
            
            // Start the analysis process
            Map<String, Object> results = documentAnalysisService.analyzeDocument(
                documentPath, 
                job.getAnalysisOptions()
            );
            
            // Update job with results
            completeJob(jobId, results);
            
            // If this was a submission analysis, make sure to update both document and submission
            if (job.isSubmission()) {
                try {
                    // Find the submission
                    Submission submission = submissionService.getSubmission(job.getDocumentId());
                    if (submission != null) {
                        // Update submission status
                        submission.setStatus("Analyzed");
                        submission.setResults(results);
                        submissionService.saveSubmission(submission);
                        logger.info("Updated submission {} with analysis results", job.getDocumentId());
                    }
                    
                    // Also update the document
                    DocumentModel document = documentService.getDocumentById(effectiveDocumentId);
                    if (document != null) {
                        document.setStatus("Analyzed");
                        document.setResults(results);
                        document.setAnalyzed(true);
                        document.setAnalysisInProgress(false);
                        documentService.updateDocument(document);
                        logger.info("Updated document {} with analysis results", effectiveDocumentId);
                    }
                } catch (Exception e) {
                    logger.error("Error updating submission/document after analysis: {}", e.getMessage(), e);
                    // Continue anyway, the main analysis was successful
                }
            }
            
        } catch (Exception e) {
            logger.error("Error processing analysis job: " + jobId, e);
            failJob(jobId, e.getMessage());
        }
        
        return CompletableFuture.completedFuture(null);
    }
    
    public AnalysisJob getJobById(String jobId) {
        Optional<AnalysisJob> jobOptional = analysisJobRepository.findById(jobId);
        return jobOptional.orElse(null);
    }
    
    public List<AnalysisJob> getJobsByDocumentId(String documentId) {
        return analysisJobRepository.findByDocumentId(documentId);
    }
} 