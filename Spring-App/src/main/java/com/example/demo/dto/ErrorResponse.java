// dto/ErrorResponse.java
package com.example.demo.dto;

public class ErrorResponse {
	private String message;
	private String error;

	public ErrorResponse(String message) {
		this.message = message;
	}

	public ErrorResponse(String message, String error) {
		this.message = message;
		this.error = error;
	}

	// Getters and Setters
	public String getMessage() {
		return message;
	}

	public void setMessage(String message) {
		this.message = message;
	}

	public String getError() {
		return error;
	}

	public void setError(String error) {
		this.error = error;
	}
}