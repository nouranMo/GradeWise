// ReportPDF.js
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

// PDF-specific styles - cannot use Tailwind here
const styles = StyleSheet.create({
  page: {
    padding: 30,
    backgroundColor: "white",
  },
  section: {
    marginBottom: 20,
    padding: 10,
  },
  header: {
    fontSize: 24,
    marginBottom: 10,
    color: "#111827", // gray-900
  },
  subheader: {
    fontSize: 14,
    color: "#6B7280", // gray-500
    marginBottom: 20,
  },
  documentInfoSection: {
    backgroundColor: "#F3F4F6", // gray-100
    padding: 15,
    marginBottom: 20,
    borderRadius: 8,
  },
  infoGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  infoItem: {
    width: "45%",
  },
  label: {
    fontSize: 12,
    color: "#6B7280", // gray-500
    marginBottom: 4,
  },
  value: {
    fontSize: 14,
    color: "#111827", // gray-900
  },
  analysisSection: {
    marginBottom: 15,
    borderBottom: 1,
    borderBottomColor: "#E5E7EB", // gray-200
    paddingBottom: 15,
  },
  analysisSectionHeader: {
    fontSize: 18,
    color: "#111827", // gray-900
    marginBottom: 10,
    fontWeight: "bold",
  },
  statusBadge: {
    padding: "4 8",
    borderRadius: 4,
    fontSize: 12,
    marginLeft: 8,
  },
  statusSuccess: {
    backgroundColor: "#DEF7EC", // green-100
    color: "#03543F", // green-900
  },
  statusError: {
    backgroundColor: "#FDE8E8", // red-100
    color: "#9B1C1C", // red-900
  },
  statusWarning: {
    backgroundColor: "#FDF6B2", // yellow-100
    color: "#723B13", // yellow-900
  },
  contentText: {
    fontSize: 12,
    color: "#374151", // gray-700
    lineHeight: 1.5,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 5,
  },
  bullet: {
    width: 10,
    fontSize: 12,
  },
  matrixTable: {
    width: "100%",
    marginTop: 10,
  },
  matrixCell: {
    padding: 5,
    fontSize: 10,
    borderBottom: 1,
    borderBottomColor: "#E5E7EB", // gray-200
  },
  recommendationsSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#F3F4F6", // gray-100
    borderRadius: 8,
  },
  recommendationsHeader: {
    fontSize: 18,
    color: "#111827", // gray-900
    marginBottom: 10,
  },
  recommendationItem: {
    marginBottom: 8,
    fontSize: 12,
    color: "#374151", // gray-700
  },
});

const ReportPDF = ({ parsingResult, documentInfo, recommendations }) => {
  const formatDuration = (seconds) => {
    if (!seconds || isNaN(seconds)) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return minutes === 0
      ? `${remainingSeconds} seconds`
      : `${minutes} min ${remainingSeconds} sec`;
  };

  const getStatusStyle = (status) => {
    if (!status) return null;
    status = status.toLowerCase();
    if (["success", "pass", "passed"].includes(status))
      return styles.statusSuccess;
    if (["error", "fail", "failed"].includes(status)) return styles.statusError;
    return styles.statusWarning;
  };

  const renderAnalysisContent = (type, data) => {
    switch (type) {
      case "references_validation":
        return data.reformatted_references?.map((ref, index) => (
          <View key={index} style={styles.listItem}>
            <Text style={styles.contentText}>
              Original: {ref.original}
              {"\n"}
              Reformatted: {ref.reformatted}
            </Text>
          </View>
        ));

      case "content_analysis":
        if (data.similarity_matrix && data.scope_sources) {
          return (
            <View style={styles.matrixTable}>
              {data.similarity_matrix.map((row, i) => (
                <View key={i} style={{ flexDirection: "row" }}>
                  {row.map((value, j) => (
                    <Text key={j} style={styles.matrixCell}>
                      {Math.round(value * 100)}%
                    </Text>
                  ))}
                </View>
              ))}
            </View>
          );
        }
        return null;

      case "business_value_analysis":
        if (data["Business Value Evaluation"]) {
          return (
            <Text style={styles.contentText}>
              {data["Business Value Evaluation"]}
            </Text>
          );
        }
        return null;

      default:
        return (
          <Text style={styles.contentText}>
            {JSON.stringify(data, null, 2)}
          </Text>
        );
    }
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.section}>
          <Text style={styles.header}>Analysis Report</Text>
          <Text style={styles.subheader}>
            Generated on {new Date().toLocaleString()}
          </Text>
        </View>

        {/* Document Info */}
        <View style={styles.documentInfoSection}>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Document Name</Text>
              <Text style={styles.value}>{documentInfo?.name || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>File Size</Text>
              <Text style={styles.value}>{documentInfo?.size || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Upload Date</Text>
              <Text style={styles.value}>{documentInfo?.date || "N/A"}</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.label}>Analysis Duration</Text>
              <Text style={styles.value}>
                {formatDuration(documentInfo?.duration)}
              </Text>
            </View>
          </View>
        </View>

        {/* Analysis Sections */}
        {Object.entries(parsingResult || {}).map(([key, value]) => (
          <View key={key} style={styles.analysisSection}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={styles.analysisSectionHeader}>
                {key
                  .replace(/_/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
              {value.status && (
                <Text
                  style={[styles.statusBadge, getStatusStyle(value.status)]}
                >
                  {value.status}
                </Text>
              )}
            </View>
            {renderAnalysisContent(key, value)}
          </View>
        ))}

        {/* Recommendations */}
        {recommendations && (
          <View style={styles.recommendationsSection}>
            <Text style={styles.recommendationsHeader}>Recommendations</Text>
            {recommendations.recommendations.split("\n").map((rec, index) => (
              <Text key={index} style={styles.recommendationItem}>
                • {rec}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ReportPDF;
