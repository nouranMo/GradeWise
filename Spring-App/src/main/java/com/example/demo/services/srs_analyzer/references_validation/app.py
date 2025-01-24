from flask import Flask
from references import references_blueprint
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})  # Enable CORS for React frontend

# Register Blueprints
app.register_blueprint(references_blueprint)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
