from flask import Flask, render_template, send_from_directory # Added send_from_directory
import datetime # Ensure datetime is imported
from flask_app.mock_data import mock_logs # Import mock_logs
import os # Added os import
from dotenv import load_dotenv # Added dotenv import

load_dotenv() # Load environment variables from .env file

app = Flask(__name__)

# Load Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
print(f"Gemini API Key Loaded: {'Yes' if GEMINI_API_KEY and GEMINI_API_KEY != 'YOUR_API_KEY_HERE_IN_FLASK_APP_DOT_ENV' else 'No - Please set in flask_app/.env'}")
if GEMINI_API_KEY == "YOUR_API_KEY_HERE_IN_FLASK_APP_DOT_ENV":
    print("WARNING: Using placeholder API Key. Please replace it in flask_app/.env")


@app.route('/robots.txt')
def robots_txt():
    return send_from_directory(app.static_folder, 'robots.txt')

@app.route('/')
def index():
    initial_context = {
        "logs": mock_logs,
        "initial_connected": False,
        "initial_muted": False,
        "initial_supports_video": True,
        "initial_enable_settings": True, # This will enable the settings button and dialog
        "initial_webcam_streaming": False,
        "initial_screen_streaming": False,
        
        # Settings Dialog specific context
        "initial_system_instruction": "You are a helpful AI assistant.",
        "initial_function_declarations": [
            {'name': 'get_weather', 'args': ['city', 'date'], 'description': 'Provides the weather forecast for a given city and date.'},
            {'name': 'send_email', 'args': ['recipient', 'subject', 'body'], 'description': 'Sends an email.'}
        ],
        "initial_response_modalities": ["audio", "text", "audio_and_text"],
        "initial_voices": ["Puck", "BayMax", "GLaDOS", "HAL9000"],
        "initial_selected_modality": "audio",
        "initial_selected_voice": "Puck",

        # Side Panel specific context
        "initial_side_panel_open": True,
        "current_log_filter": "none"
    }
    return render_template('index.html', **initial_context)

if __name__ == '__main__':
    app.run(debug=True)
