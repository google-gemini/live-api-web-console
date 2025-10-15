import pytest
from flask_app.app import app # Assuming your Flask app instance is named 'app' in app.py

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_home_page(client):
    """Test the home page loads and contains expected content."""
    rv = client.get('/')
    assert rv.status_code == 200
    assert b"Console" in rv.data # From SidePanel header
    assert b"Hello, Python!" in rv.data # From original index.html content block
    assert b'id="control-tray-section"' in rv.data # Check for the ID added to control_tray.html

def test_robots_txt(client):
    """Test the robots.txt page loads."""
    rv = client.get('/robots.txt')
    assert rv.status_code == 200
    assert b"User-agent: *" in rv.data
