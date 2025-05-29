from flask import Flask, render_template
import datetime # Ensure datetime is imported
from flask_app.mock_data import mock_logs # Import mock_logs

app = Flask(__name__)

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
        "initial_selected_voice": "Puck"
    }
    return render_template('index.html', **initial_context)

if __name__ == '__main__':
    app.run(debug=True)
