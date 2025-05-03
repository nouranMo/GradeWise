import React from "react";
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import { Font } from "@react-pdf/renderer";

// Register font
Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-light-webfont.ttf",
});

// Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Roboto",
  },
  header: {
    fontSize: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "#1a365d",
  },
  dateTime: {
    fontSize: 10,
    color: "#666",
    marginBottom: 20,
    textAlign: "right",
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 10,
    color: "#2d3748",
    borderBottom: "1 solid #e2e8f0",
    paddingBottom: 5,
  },
  subsectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    color: "#4a5568",
    fontWeight: "bold",
  },
  statContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
  },
  stat: {
    padding: 10,
    backgroundColor: "#f3f4f6",
    borderRadius: 5,
    margin: 5,
    minWidth: "45%",
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
    color: "#4a5568",
  },
  reference: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 4,
  },
  infoSection: {
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#f8f9fa",
    borderRadius: 5,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  infoColumn: {
    flex: 1,
  },
  label: {
    fontSize: 10,
    color: "#666",
    marginBottom: 2,
  },
  value: {
    fontSize: 12,
    color: "#000",
  },
  errorText: {
    color: "#e53e3e",
    fontSize: 12,
    marginBottom: 5,
  },
  successText: {
    color: "#38a169",
    fontSize: 12,
    marginBottom: 5,
  },
  warningText: {
    color: "#d97706",
    fontSize: 12,
    marginBottom: 5,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 10,
    color: "#666",
    textAlign: "center",
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 10,
    color: "#666",
  },
  subheader: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#e53e3e",
    marginTop: 15,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 12,
    color: "#4a5568",
    marginLeft: 20,
    marginBottom: 4,
  },
  noIssuesText: {
    fontSize: 12,
    color: "#38a169",
    marginLeft: 20,
    marginBottom: 4,
    fontStyle: "italic",
  },
  detailSection: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#fff5f5",
    borderRadius: 4,
  },
  missingSectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#e53e3e",
    marginBottom: 5,
  },
  missingSectionText: {
    fontSize: 12,
    color: "#4a5568",
    marginLeft: 15,
    marginBottom: 3,
  },
  statSuccess: {
    backgroundColor: "#f0fff4",
  },
  statError: {
    backgroundColor: "#fff5f5",
  },
  valueSuccess: {
    color: "#38a169",
  },
  valueError: {
    color: "#e53e3e",
  },
});

const ReportPDF = ({ parsingResult, metadata }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <Text style={styles.header}>Document Analysis Report</Text>
      <Text style={styles.dateTime}>
        Generated on {new Date().toLocaleString()}
      </Text>

      {/* Document Information */}
      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Document Name</Text>
            <Text style={styles.value}>
              {metadata?.documentName ||
                parsingResult?.document_name ||
                "Not available"}
            </Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>File Size</Text>
            <Text style={styles.value}>
              {metadata?.fileSize ||
                parsingResult?.file_size ||
                "Not available"}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Upload Date</Text>
            <Text style={styles.value}>
              {metadata?.uploadDate ||
                parsingResult?.upload_date ||
                "Not available"}
            </Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.label}>Analysis Duration</Text>
            <Text style={styles.value}>
              {metadata?.analysisDuration ||
                parsingResult?.analysis_duration ||
                "Not available"}
            </Text>
          </View>
        </View>
      </View>

      {/* Structure Analysis */}
      {(parsingResult.srs_validation || parsingResult.sdd_validation) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Structure Analysis</Text>

          {/* SRS Validation */}
          {parsingResult.srs_validation && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>SRS Structure</Text>
              <View style={styles.statContainer}>
                <View style={[styles.stat, { backgroundColor: "#f0fff4" }]}>
                  <Text style={styles.label}>Matching Sections</Text>
                  <Text style={[styles.value, { color: "#38a169" }]}>
                    {
                      parsingResult.srs_validation.structure_validation
                        .matching_sections.length
                    }
                  </Text>
                </View>
                <View style={[styles.stat, { backgroundColor: "#fff5f5" }]}>
                  <Text style={styles.label}>Missing Sections</Text>
                  <Text style={[styles.value, { color: "#e53e3e" }]}>
                    {
                      parsingResult.srs_validation.structure_validation
                        .missing_sections.length
                    }
                  </Text>
                </View>
                <View style={[styles.stat, { backgroundColor: "#fff5f5" }]}>
                  <Text style={styles.label}>Order Issues</Text>
                  <Text style={[styles.value, { color: "#e53e3e" }]}>
                    {
                      parsingResult.srs_validation.structure_validation
                        .misplaced_sections.length
                    }
                  </Text>
                </View>
              </View>

              <Text style={styles.subheader}>Missing Sections:</Text>
              {parsingResult.srs_validation.structure_validation
                .missing_sections.length > 0 ? (
                parsingResult.srs_validation.structure_validation.missing_sections.map(
                  (section, index) => (
                    <Text key={index} style={styles.bulletItem}>
                      • {section}
                    </Text>
                  )
                )
              ) : (
                <Text style={styles.noIssuesText}>
                  No missing sections found
                </Text>
              )}

              <Text style={styles.subheader}>Missing Subsections:</Text>
              {parsingResult.srs_validation.structure_validation
                .missing_subsections?.length > 0 ? (
                parsingResult.srs_validation.structure_validation.missing_subsections.map(
                  (subsection, index) => (
                    <Text key={index} style={styles.bulletItem}>
                      • {subsection}
                    </Text>
                  )
                )
              ) : (
                <Text style={styles.noIssuesText}>
                  No missing subsections found
                </Text>
              )}

              <Text style={styles.subheader}>Order Issues:</Text>
              {parsingResult.srs_validation.structure_validation
                .misplaced_sections.length > 0 ? (
                parsingResult.srs_validation.structure_validation.misplaced_sections.map(
                  (section, index) => (
                    <Text key={index} style={styles.bulletItem}>
                      • {section}
                    </Text>
                  )
                )
              ) : (
                <Text style={styles.noIssuesText}>No order issues found</Text>
              )}
            </View>
          )}

          {/* SDD Validation */}
          {parsingResult.sdd_validation && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>SDD Structure</Text>
              <View style={styles.statContainer}>
                <View style={styles.stat}>
                  <Text style={styles.text}>
                    Matching Sections:{" "}
                    {
                      parsingResult.sdd_validation.structure_validation
                        .matching_sections.length
                    }
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.text}>
                    Missing Sections:{" "}
                    {
                      parsingResult.sdd_validation.structure_validation
                        .missing_sections.length
                    }
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
      )}

      {/* References Analysis */}
      {parsingResult.references_validation && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>References Analysis</Text>
          <View style={styles.statContainer}>
            <View style={styles.stat}>
              <Text style={styles.text}>
                Total References:{" "}
                {parsingResult.references_validation.statistics
                  ?.total_references || 0}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.text}>
                Valid References:{" "}
                {parsingResult.references_validation.statistics
                  ?.valid_references || 0}
              </Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.text}>
                Cited References:{" "}
                {parsingResult.references_validation.statistics
                  ?.cited_references || 0}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Content Analysis */}
      {parsingResult.content_analysis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Content Analysis</Text>
          {parsingResult.content_analysis.similarity_matrix && (
            <View style={styles.section}>
              <Text style={styles.subsectionTitle}>Content Similarity</Text>
              <Text style={styles.text}>
                Number of Sections Analyzed:{" "}
                {parsingResult.content_analysis.scope_sources?.length || 0}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Spelling and Grammar */}
      {parsingResult.spelling_check && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spelling and Grammar Analysis</Text>
          <View style={styles.statContainer}>
            <View style={styles.stat}>
              <Text style={styles.text}>
                Misspelled Words:{" "}
                {parsingResult.spelling_check.misspelled_count || 0}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Business Value Analysis */}
      {parsingResult.business_value_analysis && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Business Value Analysis</Text>
          <Text style={styles.text}>
            {parsingResult.business_value_analysis[
              "Business Value Evaluation"
            ] || "No business value evaluation available"}
          </Text>
        </View>
      )}

      {/* Footer */}
      <Text style={styles.footer}>
        Document Analysis Report • Generated by Analysis System
      </Text>

      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        fixed
      />
    </Page>
  </Document>
);

export default ReportPDF;
